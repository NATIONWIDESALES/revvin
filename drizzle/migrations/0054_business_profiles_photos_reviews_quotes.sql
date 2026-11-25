ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS services text[];
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS founded_year int;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS license_number text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS hours jsonb;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS social_links jsonb;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_founded_year_range CHECK (founded_year IS NULL OR founded_year BETWEEN 1800 AND 2100) NOT VALID;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_license_len CHECK (license_number IS NULL OR length(license_number) <= 80) NOT VALID;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_services_len CHECK (services IS NULL OR cardinality(services) <= 30) NOT VALID;

-- Same rule as fn_effective_plan (Pro or an active trial), for server-side limits.
CREATE OR REPLACE FUNCTION public.fn_business_is_pro(p_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT coalesce((SELECT b.plan = 'pro' OR b.pro_trial_ends_at > now() FROM public.businesses b WHERE b.id = p_business_id), false)
$$;
REVOKE ALL ON FUNCTION public.fn_business_is_pro(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_business_is_pro(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_owns_business(p_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.fn_owns_business(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_owns_business(uuid) TO authenticated, service_role;

-- Photos
CREATE TABLE public.business_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text CHECK (caption IS NULL OR length(caption) <= 120),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX business_photos_business_idx ON public.business_photos (business_id, sort_order, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_photos TO authenticated;
GRANT ALL ON public.business_photos TO service_role;
ALTER TABLE public.business_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own photos" ON public.business_photos FOR SELECT TO authenticated USING (public.fn_owns_business(business_id));
CREATE POLICY "Owners add own photos" ON public.business_photos FOR INSERT TO authenticated WITH CHECK (public.fn_owns_business(business_id) AND split_part(storage_path, '/', 1) = business_id::text);
CREATE POLICY "Owners update own photos" ON public.business_photos FOR UPDATE TO authenticated USING (public.fn_owns_business(business_id)) WITH CHECK (public.fn_owns_business(business_id) AND split_part(storage_path, '/', 1) = business_id::text);
CREATE POLICY "Owners delete own photos" ON public.business_photos FOR DELETE TO authenticated USING (public.fn_owns_business(business_id));

CREATE OR REPLACE FUNCTION public.fn_business_photo_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE n int; lim int;
BEGIN
  PERFORM 1 FROM public.businesses WHERE id = NEW.business_id FOR UPDATE;
  SELECT count(*) INTO n FROM public.business_photos WHERE business_id = NEW.business_id;
  lim := CASE WHEN public.fn_business_is_pro(NEW.business_id) THEN 30 ELSE 3 END;
  IF n >= lim THEN RAISE EXCEPTION 'photo_limit:%', lim USING ERRCODE = 'P0001'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER business_photos_limit BEFORE INSERT ON public.business_photos FOR EACH ROW EXECUTE FUNCTION public.fn_business_photo_limit();

CREATE POLICY "Owners upload business photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-photos' AND public.fn_owns_business(((storage.foldername(objects.name))[1])::uuid));
CREATE POLICY "Owners update business photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'business-photos' AND public.fn_owns_business(((storage.foldername(objects.name))[1])::uuid));
CREATE POLICY "Owners delete business photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'business-photos' AND public.fn_owns_business(((storage.foldername(objects.name))[1])::uuid));

-- Reviews
CREATE TABLE public.business_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid,
  rating int CHECK (rating BETWEEN 1 AND 5),
  body text CHECK (body IS NULL OR length(body) BETWEEN 20 AND 1500),
  reviewer_display_name text CHECK (reviewer_display_name IS NULL OR length(reviewer_display_name) <= 60),
  reviewer_email text,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','published','removed_by_admin')),
  owner_reply text CHECK (owner_reply IS NULL OR length(owner_reply) <= 1000),
  owner_replied_at timestamptz,
  flagged_at timestamptz,
  flag_reason text CHECK (flag_reason IS NULL OR length(flag_reason) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);
CREATE INDEX business_reviews_public_idx ON public.business_reviews (business_id, submitted_at DESC) WHERE status = 'published';
CREATE INDEX business_reviews_contact_idx ON public.business_reviews (business_id, contact_id, created_at DESC);
GRANT SELECT ON public.business_reviews TO authenticated;
GRANT ALL ON public.business_reviews TO service_role;
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own reviews" ON public.business_reviews FOR SELECT TO authenticated USING (public.fn_owns_business(business_id));

CREATE OR REPLACE FUNCTION public.fn_review_display_name(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  WITH w AS (SELECT regexp_split_to_array(btrim(regexp_replace(coalesce(p,''), '[^[:alpha:]'' -]', '', 'g')), '\s+') a)
  SELECT CASE WHEN coalesce(a[1],'') = '' THEN NULL
              WHEN cardinality(a) = 1 THEN left(initcap(a[1]), 40)
              ELSE left(initcap(a[1]), 40) || ' ' || upper(left(a[cardinality(a)], 1)) || '.' END FROM w
$$;

CREATE OR REPLACE FUNCTION public.fn_review_text_allowed(p text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT NOT (coalesce(p,'') ~* '(https?:|www\.|[a-z0-9-]+\.(com|net|org|co|io|ca|us|info|biz|xyz|app|site|online)(\M|/))'
           OR coalesce(p,'') ~* '\m(fuck\w*|shit\w*|cunt\w*|bitch\w*|asshole\w*|n[i1]gg\w*|f[a@]gg?ot\w*|retard\w*)')
$$;

CREATE OR REPLACE FUNCTION public.fn_review_token_info(p_token text)
RETURNS TABLE(state text, business_name text, logo_url text, display_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE r public.business_reviews%ROWTYPE; b public.businesses%ROWTYPE; cname text;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{48,64}$' THEN RETURN QUERY SELECT 'invalid'::text, NULL::text, NULL::text, NULL::text; RETURN; END IF;
  SELECT * INTO r FROM public.business_reviews WHERE token = p_token;
  IF r.id IS NULL THEN RETURN QUERY SELECT 'invalid'::text, NULL::text, NULL::text, NULL::text; RETURN; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = r.business_id;
  IF r.status <> 'requested' THEN RETURN QUERY SELECT 'used'::text, b.name, b.logo_url, NULL::text; RETURN; END IF;
  IF r.created_at < now() - interval '180 days' THEN RETURN QUERY SELECT 'expired'::text, b.name, b.logo_url, NULL::text; RETURN; END IF;
  SELECT c.name INTO cname FROM public.referral_contacts c WHERE c.id = r.contact_id;
  RETURN QUERY SELECT 'open'::text, b.name, b.logo_url, public.fn_review_display_name(cname);
END $$;

CREATE OR REPLACE FUNCTION public.fn_review_submit(p_token text, p_rating int, p_body text, p_display_name text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE r public.business_reviews%ROWTYPE; body text := btrim(coalesce(p_body,'')); dn text := public.fn_review_display_name(p_display_name);
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{48,64}$' THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF NOT public.fn_rate_bucket_hit('review_submit:' || public.fn_request_bucket(), interval '1 hour', 20) THEN RAISE EXCEPTION 'rate_limited'; END IF;
  SELECT * INTO r FROM public.business_reviews WHERE token = p_token FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF r.status <> 'requested' THEN RAISE EXCEPTION 'already_used'; END IF;
  IF r.created_at < now() - interval '180 days' THEN RAISE EXCEPTION 'expired'; END IF;
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'invalid_rating'; END IF;
  IF length(body) NOT BETWEEN 20 AND 1500 THEN RAISE EXCEPTION 'invalid_body'; END IF;
  IF NOT public.fn_review_text_allowed(body) OR NOT public.fn_review_text_allowed(p_display_name) THEN RAISE EXCEPTION 'body_not_allowed'; END IF;
  IF dn IS NULL THEN RAISE EXCEPTION 'invalid_name'; END IF;
  UPDATE public.business_reviews SET rating = p_rating, body = body, reviewer_display_name = dn,
         status = 'published', submitted_at = now() WHERE id = r.id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.fn_review_reply(p_review_id uuid, p_reply text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE r public.business_reviews%ROWTYPE; t text := nullif(btrim(coalesce(p_reply,'')), '');
BEGIN
  SELECT * INTO r FROM public.business_reviews WHERE id = p_review_id;
  IF r.id IS NULL OR NOT public.fn_owns_business(r.business_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF r.status <> 'published' THEN RAISE EXCEPTION 'not_published'; END IF;
  IF length(coalesce(t,'')) > 1000 THEN RAISE EXCEPTION 'too_long'; END IF;
  UPDATE public.business_reviews SET owner_reply = t, owner_replied_at = CASE WHEN t IS NULL THEN NULL ELSE now() END WHERE id = r.id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.fn_review_flag(p_review_id uuid, p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE r public.business_reviews%ROWTYPE; b public.businesses%ROWTYPE; t text := btrim(coalesce(p_reason,''));
BEGIN
  SELECT * INTO r FROM public.business_reviews WHERE id = p_review_id;
  IF r.id IS NULL OR NOT public.fn_owns_business(r.business_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF r.status <> 'published' THEN RAISE EXCEPTION 'not_published'; END IF;
  IF length(t) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'invalid_reason'; END IF;
  IF r.flagged_at IS NOT NULL THEN RAISE EXCEPTION 'already_flagged'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = r.business_id;
  UPDATE public.business_reviews SET flagged_at = now(), flag_reason = t WHERE id = r.id;
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'to', 'info@revvin.co', 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
    'subject', 'Review flagged: ' || left(b.name, 120),
    'text', b.name || ' (/b/' || coalesce(b.slug,'') || ') flagged review ' || r.id::text || '. Reason: ' || t,
    'html', '<p>' || public.fn_directory_html(b.name) || ' (/b/' || coalesce(b.slug,'') || ') flagged review ' || r.id::text || '.</p><p>Reason: ' || public.fn_directory_html(t) || '</p>',
    'purpose', 'transactional', 'label', 'review_flagged',
    'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'idempotency_key', 'review_flagged:' || r.id::text, 'message_id', gen_random_uuid()::text));
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.fn_admin_remove_review(p_review_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') OR coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  UPDATE public.business_reviews SET status = 'removed_by_admin' WHERE id = p_review_id;
  RETURN FOUND;
END $$;

-- Quote requests (inserted only by the submit-quote-request function)
CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  phone text CHECK (phone IS NULL OR length(phone) <= 40),
  message text CHECK (message IS NULL OR length(message) <= 1500),
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed'))
);
CREATE INDEX quote_requests_business_idx ON public.quote_requests (business_id, created_at DESC);
GRANT SELECT ON public.quote_requests TO authenticated;
GRANT UPDATE (status) ON public.quote_requests TO authenticated;
GRANT ALL ON public.quote_requests TO service_role;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own quote requests" ON public.quote_requests FOR SELECT TO authenticated USING (public.fn_owns_business(business_id));
CREATE POLICY "Owners update own quote status" ON public.quote_requests FOR UPDATE TO authenticated USING (public.fn_owns_business(business_id)) WITH CHECK (public.fn_owns_business(business_id));

-- Public profile read: safe columns only. Owners can preview their own page before it is listed.
CREATE OR REPLACE FUNCTION public.fn_business_profile(p_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE b public.businesses%ROWTYPE; pro boolean; owner boolean; photos jsonb; stats jsonb; base text;
BEGIN
  IF p_slug IS NULL OR length(p_slug) > 100 THEN RETURN NULL; END IF;
  SELECT * INTO b FROM public.businesses WHERE slug = lower(p_slug) LIMIT 1;
  IF b.id IS NULL THEN RETURN NULL; END IF;
  owner := b.user_id = auth.uid();
  IF NOT owner AND (NOT public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
     OR coalesce(b.is_internal,false) OR coalesce(b.is_demo,false)) THEN RETURN NULL; END IF;
  pro := b.plan = 'pro' OR b.pro_trial_ends_at > now();
  base := current_setting('app.settings.supabase_url', true);
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'path', p.storage_path, 'caption', p.caption) ORDER BY p.sort_order, p.created_at), '[]'::jsonb)
    INTO photos FROM (SELECT * FROM public.business_photos WHERE business_id = b.id ORDER BY sort_order, created_at LIMIT CASE WHEN pro THEN 30 ELSE 3 END) p;
  SELECT jsonb_build_object('count', count(*), 'avg', round(avg(rating)::numeric, 2),
           'r1', count(*) FILTER (WHERE rating=1), 'r2', count(*) FILTER (WHERE rating=2), 'r3', count(*) FILTER (WHERE rating=3),
           'r4', count(*) FILTER (WHERE rating=4), 'r5', count(*) FILTER (WHERE rating=5))
    INTO stats FROM public.business_reviews WHERE business_id = b.id AND status = 'published';
  RETURN jsonb_build_object(
    'slug', b.slug, 'name', b.name, 'category', coalesce(nullif(b.category,''),'Other'), 'description', b.description,
    'logo_url', b.logo_url, 'cover_image_url', CASE WHEN pro THEN b.cover_image_url END,
    'service_area', b.service_area, 'website', b.website, 'phone', b.phone, 'city', b.city, 'state', b.state,
    'country', public.fn_directory_country(b.country), 'lat', b.latitude, 'lng', b.longitude,
    'google_review_url', b.google_review_url, 'hours', b.hours,
    'services', CASE WHEN pro THEN b.services END, 'founded_year', CASE WHEN pro THEN b.founded_year END,
    'license_number', CASE WHEN pro THEN b.license_number END, 'social_links', CASE WHEN pro THEN b.social_links END,
    'is_pro', pro, 'is_verified', coalesce(b.is_verified,false), 'index_approved', coalesce(b.index_approved,false),
    'has_reward', (NOT public.fn_directory_regulated(b.category) AND nullif(btrim(coalesce(b.offer_amount,'')),'') IS NOT NULL),
    'reward_text', CASE WHEN public.fn_directory_regulated(b.category) THEN NULL ELSE left(nullif(btrim(coalesce(b.offer_amount,'')),''), 80) END,
    'photos', photos, 'reviews', stats, 'is_owner_preview', owner AND (NOT public.fn_page_live(b.account_status, b.is_published, b.is_disabled) OR coalesce(b.is_internal,false) OR coalesce(b.is_demo,false)));
END $$;

CREATE OR REPLACE FUNCTION public.fn_business_reviews(p_slug text, p_offset int DEFAULT 0, p_limit int DEFAULT 10)
RETURNS TABLE(id uuid, rating int, body text, reviewer_display_name text, owner_reply text, owner_replied_at timestamptz, submitted_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE b public.businesses%ROWTYPE; pro boolean; lim int; off int;
BEGIN
  SELECT * INTO b FROM public.businesses WHERE slug = lower(coalesce(p_slug,'')) LIMIT 1;
  IF b.id IS NULL THEN RETURN; END IF;
  IF b.user_id IS DISTINCT FROM auth.uid() AND (NOT public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
     OR coalesce(b.is_internal,false) OR coalesce(b.is_demo,false)) THEN RETURN; END IF;
  pro := b.plan = 'pro' OR b.pro_trial_ends_at > now();
  -- Free profiles show the three most recent reviews only.
  lim := CASE WHEN pro THEN least(greatest(coalesce(p_limit,10),1),10) ELSE 3 END;
  off := CASE WHEN pro THEN least(greatest(coalesce(p_offset,0),0),5000) ELSE 0 END;
  RETURN QUERY SELECT r.id, r.rating, r.body, r.reviewer_display_name, r.owner_reply, r.owner_replied_at, r.submitted_at
    FROM public.business_reviews r WHERE r.business_id = b.id AND r.status = 'published'
    ORDER BY r.submitted_at DESC, r.id LIMIT lim OFFSET off;
END $$;

CREATE OR REPLACE FUNCTION public.fn_directory_nearby(p_lat double precision, p_lng double precision, p_category text, p_exclude text)
RETURNS TABLE(kind text, slug text, name text, category text, city text, region text, country text,
              lat double precision, lng double precision, is_pro boolean, is_verified boolean,
              has_reward boolean, reward_text text, logo_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  WITH box AS (SELECT 0.36 AS dlat, 0.36 / greatest(cos(radians(p_lat)), 0.2) AS dlng),
  u AS (
    SELECT r.kind, r.slug, r.name, r.category, r.city, r.region, r.country, r.lat, r.lng, r.is_pro, r.is_verified, r.has_reward, r.reward_text, r.logo_url, r.rank
      FROM public.fn_directory_business_rows() r, box
     WHERE r.lat BETWEEN p_lat - box.dlat AND p_lat + box.dlat AND r.lng BETWEEN p_lng - box.dlng AND p_lng + box.dlng
       AND lower(r.category) = lower(coalesce(p_category,'')) AND r.slug IS DISTINCT FROM p_exclude
    UNION ALL
    SELECT * FROM (SELECT 'listing'::text, l.slug, l.name, l.category, l.city, l.region, l.country, l.latitude, l.longitude,
           false, false, false, NULL::text, NULL::text, 2
      FROM public.directory_listings l, box
     WHERE l.status = 'unclaimed' AND l.latitude BETWEEN p_lat - box.dlat AND p_lat + box.dlat
       AND l.longitude BETWEEN p_lng - box.dlng AND p_lng + box.dlng AND l.category = p_category AND l.slug IS DISTINCT FROM p_exclude
     LIMIT 60) x
  )
  SELECT u.kind, u.slug, u.name, u.category, u.city, u.region, u.country, u.lat, u.lng, u.is_pro, u.is_verified, u.has_reward, u.reward_text, u.logo_url
    FROM u WHERE p_lat IS NOT NULL AND p_lng IS NOT NULL
   ORDER BY u.rank, (u.lat - p_lat)^2 + ((u.lng - p_lng) * cos(radians(p_lat)))^2
   LIMIT 6
$$;

-- Card extras for a page of results in one call (no per-card queries).
CREATE OR REPLACE FUNCTION public.fn_directory_card_extras(p_slugs text[])
RETURNS TABLE(slug text, cover_url text, photo_path text, rating_avg numeric, review_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT b.slug,
         CASE WHEN (b.plan = 'pro' OR b.pro_trial_ends_at > now()) THEN b.cover_image_url END,
         (SELECT p.storage_path FROM public.business_photos p WHERE p.business_id = b.id ORDER BY p.sort_order, p.created_at LIMIT 1),
         CASE WHEN (b.plan = 'pro' OR b.pro_trial_ends_at > now()) THEN (SELECT round(avg(r.rating)::numeric, 2) FROM public.business_reviews r WHERE r.business_id = b.id AND r.status = 'published') END,
         CASE WHEN (b.plan = 'pro' OR b.pro_trial_ends_at > now()) THEN (SELECT count(*) FROM public.business_reviews r WHERE r.business_id = b.id AND r.status = 'published') ELSE 0 END
    FROM public.businesses b
   WHERE b.slug = ANY (p_slugs[1:100])
     AND public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
     AND coalesce(b.marketplace_listed, false) AND NOT coalesce(b.is_demo, false) AND NOT coalesce(b.is_internal, false)
$$;

REVOKE ALL ON FUNCTION public.fn_review_token_info(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_review_submit(text,int,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_review_reply(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_review_flag(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_admin_remove_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_business_profile(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_business_reviews(text,int,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_directory_nearby(double precision,double precision,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_directory_card_extras(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_business_photo_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_review_token_info(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_review_submit(text,int,text,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_review_reply(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_review_flag(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_admin_remove_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_business_profile(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_business_reviews(text,int,int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_directory_nearby(double precision,double precision,text,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_directory_card_extras(text[]) TO anon, authenticated, service_role;