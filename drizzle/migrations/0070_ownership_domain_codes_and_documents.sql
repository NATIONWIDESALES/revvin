CREATE OR REPLACE FUNCTION public.fn_ownership_host(p_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public', 'pg_catalog'
AS $function$
DECLARE v text := lower(btrim(coalesce(p_value, ''))); h text;
BEGIN
  IF v = '' OR length(v) > 500 THEN RETURN NULL; END IF;
  IF v ~ '^[^@[:space:]]+@[^@[:space:]]+$' THEN
    h := split_part(v, '@', 2);
  ELSE
    v := regexp_replace(v, '^https?://', '');
    h := split_part(split_part(v, '/', 1), '?', 1);
    h := regexp_replace(h, '^.*@', '');
    h := regexp_replace(h, ':[0-9]+$', '');
  END IF;
  h := btrim(h, '.');
  IF h !~ '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$' OR h !~ '\.' OR h ~ '\.\.' THEN RETURN NULL; END IF;
  RETURN h;
END
$function$;

CREATE OR REPLACE FUNCTION public.fn_ownership_registrable_domain(p_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public', 'pg_catalog'
AS $function$
DECLARE h text := public.fn_ownership_host(p_value); parts text[]; n int; suffix text; blocked text;
  blocked_hosts constant text[] := ARRAY[
    'gmail.com','googlemail.com','icloud.com','me.com','aol.com','proton.me','protonmail.com','mail.com',
    'shaw.ca','telus.net','rogers.com','bell.net','comcast.net','verizon.net','att.net','sbcglobal.net','cox.net',
    'facebook.com','instagram.com','linkedin.com','twitter.com','x.com','youtube.com','tiktok.com',
    'wixsite.com','wix.com','square.site','squarespace.com','weebly.com','wordpress.com','blogspot.com',
    'godaddysites.com','site123.me','webflow.io','linktr.ee','carrd.co','business.site','google.com',
    'yelp.com','angi.com','homeadvisor.com','nextdoor.com','thumbtack.com','houzz.com','yellowpages.com'
  ];
BEGIN
  IF h IS NULL OR h ~ '^[0-9.]+$' THEN RETURN NULL; END IF;
  IF h ~ '(^|\.)(yahoo|hotmail|outlook|live|gmx)\.' THEN RETURN NULL; END IF;
  FOREACH blocked IN ARRAY blocked_hosts LOOP
    IF h = blocked OR h LIKE '%.' || blocked THEN RETURN NULL; END IF;
  END LOOP;
  parts := string_to_array(h, '.'); n := array_length(parts, 1);
  IF n < 2 THEN RETURN NULL; END IF;
  suffix := parts[n-1] || '.' || parts[n];
  IF n >= 3 AND length(parts[n]) = 2 AND parts[n-1] IN ('co','com','net','org','gov','ac') THEN
    RETURN parts[n-2] || '.' || suffix;
  END IF;
  RETURN suffix;
END
$function$;

CREATE OR REPLACE FUNCTION public.fn_ownership_website_domain(p_business_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
  SELECT public.fn_ownership_registrable_domain(coalesce(
    (SELECT l.website FROM public.directory_listings l WHERE l.claimed_business_id = p_business_id AND l.status = 'claimed' LIMIT 1),
    (SELECT b.website FROM public.businesses b WHERE b.id = p_business_id)
  ));
$function$;

CREATE OR REPLACE FUNCTION public.fn_ownership_release_listing(p_business_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
  UPDATE public.directory_listings
     SET status = 'unclaimed', claimed_business_id = NULL
   WHERE claimed_business_id = p_business_id;
$function$;

CREATE OR REPLACE FUNCTION public.fn_ownership_set_status(p_business_id uuid, p_status text, p_method text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
DECLARE b public.businesses%ROWTYPE; em text;
BEGIN
  IF p_status NOT IN ('pending','verified','rejected','disputed') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  IF p_status = 'verified' AND coalesce(p_method,'') NOT IN ('domain_email','document','admin','grandfathered') THEN RAISE EXCEPTION 'invalid_method'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = p_business_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  PERFORM set_config('revvin.ownership_internal', 'on', true);
  UPDATE public.businesses SET
    ownership_status = p_status,
    ownership_method = CASE WHEN p_status = 'verified' THEN p_method WHEN p_status = 'disputed' THEN p_method ELSE NULL END,
    ownership_verified_at = CASE WHEN p_status = 'verified' THEN coalesce(b.ownership_verified_at, now()) ELSE NULL END
    WHERE id = p_business_id;
  PERFORM set_config('revvin.ownership_internal', 'off', true);
  IF p_status = 'rejected' THEN PERFORM public.fn_ownership_release_listing(p_business_id); END IF;
  IF p_status = 'verified' AND b.ownership_status IS DISTINCT FROM 'verified' THEN
    SELECT email INTO em FROM auth.users WHERE id = b.user_id;
    IF em IS NOT NULL THEN
      BEGIN
        PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
          'to', em, 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
          'subject', 'Ownership confirmed for ' || left(b.name, 120),
          'text', 'Your ownership of ' || b.name || ' is confirmed. Your profile can now show the owner-claimed badge and receive quote requests.',
          'html', '<p>Your ownership of ' || public.fn_directory_html(b.name) || ' is confirmed.</p><p>Your profile can now show the owner-claimed badge and receive quote requests.</p>',
          'purpose', 'transactional', 'label', 'ownership_verified',
          'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'idempotency_key', 'ownership_verified:' || b.id::text || ':' || to_char(now(), 'YYYYMMDDHH24MISSMS'),
          'message_id', gen_random_uuid()::text));
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
    BEGIN PERFORM public.fn_quote_deliver_saved(p_business_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  RETURN true;
END
$function$;

CREATE OR REPLACE FUNCTION public.fn_ownership_auto_verify(p_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
DECLARE b public.businesses%ROWTYPE; em text; dom text;
BEGIN
  SELECT * INTO b FROM public.businesses WHERE id = p_business_id AND user_id = auth.uid();
  IF b.id IS NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF b.ownership_status = 'verified' THEN RETURN true; END IF;
  IF b.ownership_status <> 'pending' THEN RETURN false; END IF;
  SELECT email INTO em FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  dom := public.fn_ownership_website_domain(p_business_id);
  IF em IS NULL OR dom IS NULL OR public.fn_ownership_registrable_domain(em) IS DISTINCT FROM dom THEN RETURN false; END IF;
  RETURN public.fn_ownership_set_status(p_business_id, 'verified', 'domain_email');
END
$function$;

CREATE OR REPLACE FUNCTION public.fn_ownership_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
DECLARE b public.businesses%ROWTYPE; req record;
BEGIN
  SELECT * INTO b FROM public.businesses WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1;
  IF b.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF b.ownership_status = 'pending' THEN PERFORM public.fn_ownership_auto_verify(b.id); END IF;
  SELECT * INTO b FROM public.businesses WHERE id = b.id;
  SELECT status, reject_reason, created_at INTO req FROM public.ownership_verification_requests
   WHERE business_id = b.id ORDER BY created_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'business_id', b.id, 'business_name', b.name, 'status', b.ownership_status,
    'method', b.ownership_method, 'verified_at', b.ownership_verified_at,
    'website', b.website, 'domain', public.fn_ownership_website_domain(b.id),
    'has_listing', EXISTS(SELECT 1 FROM public.directory_listings l WHERE l.claimed_business_id = b.id AND l.status = 'claimed'),
    'request_status', req.status, 'reject_reason', req.reject_reason, 'request_created_at', req.created_at);
END
$function$;

CREATE TABLE public.ownership_email_codes (
  id uuid PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ownership_email_codes TO service_role;
ALTER TABLE public.ownership_email_codes ENABLE ROW LEVEL SECURITY;
CREATE INDEX ownership_email_codes_business_created ON public.ownership_email_codes(business_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.fn_ownership_send_code(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE b public.businesses%ROWTYPE; em text := lower(btrim(coalesce(p_email,''))); dom text; id uuid := gen_random_uuid(); code text;
BEGIN
  SELECT * INTO b FROM public.businesses WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1;
  IF b.id IS NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF b.ownership_status NOT IN ('pending','rejected') THEN RAISE EXCEPTION 'not_available'; END IF;
  dom := public.fn_ownership_website_domain(b.id);
  IF dom IS NULL THEN RAISE EXCEPTION 'no_eligible_domain'; END IF;
  IF length(em) NOT BETWEEN 3 AND 254 OR em !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     OR public.fn_ownership_registrable_domain(em) IS DISTINCT FROM dom THEN RAISE EXCEPTION 'domain_mismatch'; END IF;
  IF (SELECT count(*) FROM public.ownership_email_codes c WHERE c.business_id = b.id AND c.created_at > now() - interval '24 hours') >= 3 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  UPDATE public.ownership_email_codes SET consumed_at = now() WHERE business_id = b.id AND consumed_at IS NULL;
  code := lpad(floor(random() * 1000000)::text, 6, '0');
  INSERT INTO public.ownership_email_codes(id, business_id, email, code_hash, expires_at)
  VALUES(id, b.id, em, encode(extensions.digest(id::text || ':' || code, 'sha256'), 'hex'), now() + interval '30 minutes');
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'to', em, 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
    'subject', 'Your Revvin ownership confirmation code',
    'text', 'Your code for ' || b.name || ' is ' || code || '. It expires in 30 minutes. If you did not request it, you can ignore this email.',
    'html', '<p>Your code for ' || public.fn_directory_html(b.name) || ' is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">' || code || '</p><p>It expires in 30 minutes.</p><p>If you did not request it, you can ignore this email.</p>',
    'purpose', 'transactional', 'label', 'ownership_email_code',
    'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'idempotency_key', 'ownership_code:' || id::text, 'message_id', gen_random_uuid()::text));
  RETURN true;
END
$function$;

CREATE OR REPLACE FUNCTION public.fn_ownership_verify_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE b public.businesses%ROWTYPE; c public.ownership_email_codes%ROWTYPE; supplied text := btrim(coalesce(p_code,''));
BEGIN
  SELECT * INTO b FROM public.businesses WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1;
  IF b.id IS NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF b.ownership_status NOT IN ('pending','rejected') OR supplied !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'invalid_code'; END IF;
  SELECT * INTO c FROM public.ownership_email_codes WHERE business_id = b.id AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF c.id IS NULL OR c.attempts >= 5 THEN RAISE EXCEPTION 'too_many_attempts'; END IF;
  IF c.expires_at <= now() THEN UPDATE public.ownership_email_codes SET consumed_at = now() WHERE id = c.id; RAISE EXCEPTION 'code_expired'; END IF;
  IF c.code_hash <> encode(extensions.digest(c.id::text || ':' || supplied, 'sha256'), 'hex') THEN
    UPDATE public.ownership_email_codes SET attempts = attempts + 1, consumed_at = CASE WHEN attempts + 1 >= 5 THEN now() ELSE NULL END WHERE id = c.id;
    RAISE EXCEPTION 'invalid_code';
  END IF;
  UPDATE public.ownership_email_codes SET consumed_at = now() WHERE id = c.id;
  RETURN public.fn_ownership_set_status(b.id, 'verified', 'domain_email');
END
$function$;

CREATE TABLE public.ownership_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'document' CHECK (method = 'document'),
  file_path text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ownership_verification_requests TO authenticated;
GRANT ALL ON public.ownership_verification_requests TO service_role;
ALTER TABLE public.ownership_verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their ownership document status"
ON public.ownership_verification_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));
CREATE INDEX ownership_verification_requests_open ON public.ownership_verification_requests(status, created_at) WHERE status = 'open';

CREATE OR REPLACE FUNCTION public.fn_ownership_submit_document(p_file_path text, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
DECLARE b public.businesses%ROWTYPE; path text := btrim(coalesce(p_file_path,'')); note text := nullif(btrim(coalesce(p_note,'')),''); id uuid;
BEGIN
  SELECT * INTO b FROM public.businesses WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1;
  IF b.id IS NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF b.ownership_status = 'verified' THEN RAISE EXCEPTION 'not_available'; END IF;
  IF length(path) > 500 OR path !~ ('^' || b.id::text || '/[a-f0-9-]{36}\.(pdf|jpg|png)$')
     OR length(coalesce(note,'')) > 1000 OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'ownership-verification' AND o.name = path) THEN
    RAISE EXCEPTION 'invalid_document';
  END IF;
  IF EXISTS(SELECT 1 FROM public.ownership_verification_requests r WHERE r.business_id = b.id AND r.status = 'open') THEN RAISE EXCEPTION 'already_submitted'; END IF;
  INSERT INTO public.ownership_verification_requests(business_id, file_path, note) VALUES(b.id, path, note) RETURNING ownership_verification_requests.id INTO id;
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'to', 'info@revvin.co', 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
    'subject', 'Ownership document submitted: ' || left(b.name, 120),
    'text', 'An ownership document was submitted for ' || b.name || '. Review it in Ownership reviews.',
    'html', '<p>An ownership document was submitted for ' || public.fn_directory_html(b.name) || '.</p><p>Review it in Ownership reviews.</p>',
    'purpose', 'transactional', 'label', 'ownership_document_submitted',
    'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'idempotency_key', 'ownership_document:' || id::text, 'message_id', gen_random_uuid()::text));
  RETURN id;
END
$function$;

CREATE OR REPLACE FUNCTION public.fn_directory_claim(p_slug text, p_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
DECLARE l public.directory_listings%ROWTYPE; b public.businesses%ROWTYPE;
BEGIN
  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' OR length(p_slug) > 100 THEN RAISE EXCEPTION 'not_found'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = p_business_id;
  IF b.id IS NULL OR b.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF coalesce(b.acquisition ->> 'landing_path', '') IS DISTINCT FROM '/b/' || p_slug THEN RAISE EXCEPTION 'code_mismatch'; END IF;
  SELECT * INTO l FROM public.directory_listings WHERE slug = p_slug FOR UPDATE;
  IF l.id IS NULL OR l.status <> 'unclaimed' THEN RAISE EXCEPTION 'not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.directory_listings WHERE claimed_business_id = b.id) THEN RAISE EXCEPTION 'already_claimed'; END IF;
  UPDATE public.directory_listings SET status = 'claimed', claimed_business_id = b.id WHERE id = l.id;
  PERFORM set_config('revvin.ownership_internal', 'on', true);
  UPDATE public.businesses SET
    ownership_status = 'pending', ownership_method = NULL, ownership_verified_at = NULL,
    phone     = coalesce(nullif(btrim(phone), ''), l.phone),
    website   = coalesce(nullif(btrim(website), ''), l.website),
    city      = coalesce(nullif(btrim(city), ''), l.city),
    state     = coalesce(nullif(btrim(state), ''), nullif(regexp_replace(coalesce(l.region, ''), '^(US|CA)-', '', 'i'), '')),
    country   = coalesce(nullif(btrim(country), ''), l.country),
    category  = CASE WHEN nullif(btrim(coalesce(category, '')), '') IS NULL OR lower(category) = 'other' THEN coalesce(l.category, category) ELSE category END,
    latitude  = coalesce(latitude, l.latitude),
    longitude = coalesce(longitude, l.longitude)
  WHERE id = b.id;
  PERFORM set_config('revvin.ownership_internal', 'off', true);
  PERFORM public.fn_ownership_auto_verify(b.id);
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'to', 'info@revvin.co', 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
    'subject', 'Directory listing claimed',
    'text', 'A directory listing was claimed by a new business. Listing: /b/' || l.slug,
    'html', '<p>A directory listing was claimed by a new business. Listing: /b/' || l.slug || '</p>',
    'purpose', 'transactional', 'label', 'directory_claimed',
    'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'idempotency_key', 'directory_claimed:' || l.id::text, 'message_id', gen_random_uuid()::text));
  RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.fn_guard_is_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
BEGIN
  IF coalesce(auth.role(),'') = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF current_setting('revvin.ownership_internal', true) = 'on' THEN
    NEW.is_verified := NEW.ownership_status = 'verified';
    NEW.verified := NEW.ownership_status = 'verified';
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_verified := false; NEW.verified := false; NEW.index_approved := false;
    NEW.ownership_status := 'pending'; NEW.ownership_method := NULL; NEW.ownership_verified_at := NULL;
    RETURN NEW;
  END IF;
  IF NEW.website IS DISTINCT FROM OLD.website AND OLD.ownership_status <> 'verified'
     AND EXISTS(SELECT 1 FROM public.directory_listings l WHERE l.claimed_business_id = OLD.id AND l.status = 'claimed') THEN
    RAISE EXCEPTION 'website_locked_until_verified';
  END IF;
  IF NEW.ownership_status IS DISTINCT FROM OLD.ownership_status
     OR NEW.ownership_method IS DISTINCT FROM OLD.ownership_method
     OR NEW.ownership_verified_at IS DISTINCT FROM OLD.ownership_verified_at THEN
    RAISE EXCEPTION 'Ownership confirmation must use the ownership review flow';
  END IF;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified OR NEW.verified IS DISTINCT FROM OLD.verified OR NEW.index_approved IS DISTINCT FROM OLD.index_approved THEN
    IF NOT public.has_role(auth.uid(),'admin') OR OLD.user_id = auth.uid() THEN RAISE EXCEPTION 'Only a super admin can change verification or indexing'; END IF;
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified OR NEW.verified IS DISTINCT FROM OLD.verified THEN
      NEW.ownership_status := CASE WHEN NEW.is_verified AND coalesce(NEW.verified, false) THEN 'verified' ELSE 'pending' END;
      NEW.ownership_method := CASE WHEN NEW.ownership_status = 'verified' THEN 'admin' ELSE NULL END;
      NEW.ownership_verified_at := CASE WHEN NEW.ownership_status = 'verified' THEN now() ELSE NULL END;
      NEW.is_verified := NEW.ownership_status = 'verified'; NEW.verified := NEW.ownership_status = 'verified';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

CREATE POLICY "Owners upload their ownership documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ownership-verification' AND (storage.foldername(name))[1] IN (SELECT b.id::text FROM public.businesses b WHERE b.user_id = auth.uid()));
CREATE POLICY "Owners replace their ownership documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ownership-verification' AND (storage.foldername(name))[1] IN (SELECT b.id::text FROM public.businesses b WHERE b.user_id = auth.uid()))
WITH CHECK (bucket_id = 'ownership-verification' AND (storage.foldername(name))[1] IN (SELECT b.id::text FROM public.businesses b WHERE b.user_id = auth.uid()));
CREATE POLICY "Owners remove their unreviewed ownership documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ownership-verification' AND (storage.foldername(name))[1] IN (SELECT b.id::text FROM public.businesses b WHERE b.user_id = auth.uid()));
CREATE POLICY "Admins read ownership documents with verified MFA"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ownership-verification' AND public.has_role(auth.uid(), 'admin') AND coalesce(auth.jwt() ->> 'aal', '') = 'aal2');

REVOKE ALL ON FUNCTION public.fn_ownership_set_status(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_ownership_release_listing(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_ownership_website_domain(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ownership_auto_verify(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ownership_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ownership_send_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ownership_verify_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ownership_submit_document(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ownership_set_status(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_ownership_release_listing(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_ownership_website_domain(uuid) TO service_role;