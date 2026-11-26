CREATE TABLE public.ownership_disputes (
  id uuid PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  email text NOT NULL,
  phone text,
  details text NOT NULL,
  file_path text,
  visitor_hash text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  prior_status text,
  prior_method text,
  prior_verified_at timestamptz,
  resolution text CHECK (resolution IS NULL OR resolution IN ('keep_owner','release_listing')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ownership_disputes TO service_role;
ALTER TABLE public.ownership_disputes ENABLE ROW LEVEL SECURITY;
CREATE INDEX ownership_disputes_visitor_day ON public.ownership_disputes(visitor_hash, created_at);
CREATE INDEX ownership_disputes_open ON public.ownership_disputes(status, created_at) WHERE status = 'open';

CREATE OR REPLACE FUNCTION public.fn_ownership_file_dispute(
  p_slug text, p_name text, p_role text, p_email text, p_phone text,
  p_details text, p_file_path text, p_visitor_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
DECLARE b public.businesses%ROWTYPE; id uuid := gen_random_uuid(); nm text := btrim(coalesce(p_name,''));
  rl text := btrim(coalesce(p_role,'')); em text := lower(btrim(coalesce(p_email,'')));
  ph text := nullif(btrim(coalesce(p_phone,'')),''); de text := btrim(coalesce(p_details,''));
  fp text := nullif(btrim(coalesce(p_file_path,'')),''); vh text := btrim(coalesce(p_visitor_hash,''));
BEGIN
  SELECT * INTO b FROM public.businesses WHERE slug = lower(btrim(coalesce(p_slug,'')))
    AND public.fn_page_live(account_status, is_published, is_disabled)
    AND NOT coalesce(is_internal,false) AND NOT coalesce(is_demo,false) LIMIT 1;
  IF b.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF length(nm) NOT BETWEEN 1 AND 120 OR length(rl) NOT BETWEEN 1 AND 80
     OR length(em) NOT BETWEEN 3 AND 254 OR em !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     OR length(coalesce(ph,'')) > 40 OR length(de) NOT BETWEEN 5 AND 3000
     OR vh !~ '^[a-f0-9]{24,64}$' THEN RAISE EXCEPTION 'invalid_request'; END IF;
  IF fp IS NOT NULL AND fp <> 'disputes/' || id::text || '.' || split_part(fp, '.', 2) THEN RAISE EXCEPTION 'invalid_document'; END IF;
  IF fp IS NOT NULL AND fp !~ '^disputes/[a-f0-9-]{36}\.(pdf|jpg|png)$' THEN RAISE EXCEPTION 'invalid_document'; END IF;
  IF (SELECT count(*) FROM public.ownership_disputes d WHERE d.visitor_hash = vh AND d.created_at > now() - interval '24 hours') >= 3 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  INSERT INTO public.ownership_disputes(id,business_id,name,role,email,phone,details,file_path,visitor_hash,prior_status,prior_method,prior_verified_at)
  VALUES(id,b.id,nm,rl,em,ph,de,fp,vh,b.ownership_status,b.ownership_method,b.ownership_verified_at);
  IF b.ownership_status = 'pending' OR (b.ownership_status = 'verified' AND b.ownership_method = 'grandfathered') THEN
    PERFORM public.fn_ownership_set_status(b.id, 'disputed', CASE WHEN b.ownership_status = 'verified' THEN 'grandfathered' ELSE NULL END);
  END IF;
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'to', 'info@revvin.co', 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
    'subject', 'Ownership dispute filed: ' || left(b.name, 120),
    'text', 'An ownership dispute was filed for ' || b.name || '. Review it in Ownership reviews.',
    'html', '<p>An ownership dispute was filed for ' || public.fn_directory_html(b.name) || '.</p><p>Review it in Ownership reviews.</p>',
    'purpose', 'transactional', 'label', 'ownership_dispute_filed',
    'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'idempotency_key', 'ownership_dispute:' || id::text, 'message_id', gen_random_uuid()::text));
  RETURN id;
END
$function$;

CREATE OR REPLACE FUNCTION public.fn_admin_ownership_queue()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') OR coalesce(auth.jwt()->>'aal','') <> 'aal2' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  RETURN jsonb_build_object(
    'requests', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', r.id, 'business_id', b.id, 'business_name', b.name, 'business_slug', b.slug,
      'claimant_email', u.email, 'signup_date', b.created_at, 'file_path', r.file_path,
      'note', r.note, 'status', r.status, 'created_at', r.created_at,
      'listing_name', l.name, 'listing_phone', l.phone, 'listing_website', l.website
    ) ORDER BY r.created_at) FROM public.ownership_verification_requests r
      JOIN public.businesses b ON b.id = r.business_id
      LEFT JOIN auth.users u ON u.id = b.user_id
      LEFT JOIN public.directory_listings l ON l.claimed_business_id = b.id
      WHERE r.status = 'open'), '[]'::jsonb),
    'disputes', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', d.id, 'business_id', b.id, 'business_name', b.name, 'business_slug', b.slug,
      'claimant_email', u.email, 'signup_date', b.created_at, 'ownership_status', b.ownership_status,
      'name', d.name, 'role', d.role, 'email', d.email, 'phone', d.phone, 'details', d.details,
      'file_path', d.file_path, 'prior_status', d.prior_status, 'created_at', d.created_at,
      'listing_name', l.name, 'listing_phone', l.phone, 'listing_website', l.website
    ) ORDER BY d.created_at) FROM public.ownership_disputes d
      JOIN public.businesses b ON b.id = d.business_id
      LEFT JOIN auth.users u ON u.id = b.user_id
      LEFT JOIN public.directory_listings l ON l.claimed_business_id = b.id
      WHERE d.status = 'open'), '[]'::jsonb)
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.fn_admin_ownership_review(p_request_id uuid, p_decision text, p_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
DECLARE r public.ownership_verification_requests%ROWTYPE; b public.businesses%ROWTYPE; em text; reason text := nullif(btrim(coalesce(p_reason,'')),'');
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') OR coalesce(auth.jwt()->>'aal','') <> 'aal2' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'invalid_decision'; END IF;
  IF p_decision = 'rejected' AND length(coalesce(reason,'')) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'reason_required'; END IF;
  SELECT * INTO r FROM public.ownership_verification_requests WHERE id = p_request_id AND status = 'open' FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = r.business_id;
  UPDATE public.ownership_verification_requests SET status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(), reject_reason = CASE WHEN p_decision = 'rejected' THEN reason END WHERE id = r.id;
  PERFORM public.fn_ownership_set_status(r.business_id, CASE WHEN p_decision = 'approved' THEN 'verified' ELSE 'rejected' END, CASE WHEN p_decision = 'approved' THEN 'document' ELSE NULL END);
  IF p_decision = 'rejected' THEN
    SELECT email INTO em FROM auth.users WHERE id = b.user_id;
    IF em IS NOT NULL THEN
      PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
        'to', em, 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
        'subject', 'Ownership review update for ' || left(b.name, 120),
        'text', 'We could not confirm your ownership of ' || b.name || ' from the document submitted. Reason: ' || reason,
        'html', '<p>We could not confirm your ownership of ' || public.fn_directory_html(b.name) || ' from the document submitted.</p><p>Reason: ' || public.fn_directory_html(reason) || '</p>',
        'purpose', 'transactional', 'label', 'ownership_document_rejected',
        'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'idempotency_key', 'ownership_rejected:' || r.id::text, 'message_id', gen_random_uuid()::text));
    END IF;
  END IF;
  RETURN true;
END
$function$;

CREATE OR REPLACE FUNCTION public.fn_admin_set_ownership(p_business_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') OR coalesce(auth.jwt()->>'aal','') <> 'aal2' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF p_status NOT IN ('verified','pending') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  RETURN public.fn_ownership_set_status(p_business_id, p_status, CASE WHEN p_status = 'verified' THEN 'admin' ELSE NULL END);
END
$function$;

CREATE OR REPLACE FUNCTION public.fn_admin_resolve_dispute(p_dispute_id uuid, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
DECLARE d public.ownership_disputes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') OR coalesce(auth.jwt()->>'aal','') <> 'aal2' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF p_action NOT IN ('keep_owner','release_listing') THEN RAISE EXCEPTION 'invalid_decision'; END IF;
  SELECT * INTO d FROM public.ownership_disputes WHERE id = p_dispute_id AND status = 'open' FOR UPDATE;
  IF d.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF p_action = 'release_listing' THEN
    PERFORM public.fn_ownership_set_status(d.business_id, 'rejected', NULL);
  ELSIF d.prior_status = 'pending' THEN
    PERFORM public.fn_ownership_set_status(d.business_id, 'pending', NULL);
  ELSIF d.prior_status = 'verified' THEN
    PERFORM set_config('revvin.ownership_internal', 'on', true);
    UPDATE public.businesses SET ownership_status = 'verified', ownership_method = d.prior_method, ownership_verified_at = d.prior_verified_at WHERE id = d.business_id;
    PERFORM set_config('revvin.ownership_internal', 'off', true);
  END IF;
  UPDATE public.ownership_disputes SET status = 'resolved', resolution = p_action, reviewed_by = auth.uid(), reviewed_at = now() WHERE id = d.id;
  RETURN true;
END
$function$;

GRANT EXECUTE ON FUNCTION public.fn_ownership_file_dispute(text,text,text,text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_admin_ownership_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_admin_ownership_review(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_admin_set_ownership(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_admin_resolve_dispute(uuid,text) TO authenticated;