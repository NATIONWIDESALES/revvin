CREATE OR REPLACE FUNCTION public.fn_earn_get_link(p_business_slug text, p_name text, p_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ DECLARE b public.businesses%ROWTYPE; r public.referrers%ROWTYPE; e text; n text:=btrim(coalesce(p_name,'')); BEGIN SELECT x.* INTO b FROM public.businesses x WHERE x.slug=lower(btrim(p_business_slug)) AND EXISTS(SELECT 1 FROM public.metros m WHERE m.is_live AND public.fn_earn_eligible(x,m)) LIMIT 1; IF b.id IS NULL THEN RAISE EXCEPTION 'not_on_earn'; END IF; IF NOT public.fn_rate_bucket_hit('earn_ip:'||public.fn_request_bucket(),interval '1 hour',10) OR NOT public.fn_rate_bucket_hit('earn_global',interval '1 hour',100) THEN RAISE EXCEPTION 'rate_limited'; END IF; IF public.fn_email_owned() THEN SELECT lower(email) INTO e FROM auth.users WHERE id=auth.uid(); ELSE e:=lower(btrim(coalesce(p_email,''))); END IF; IF e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' OR length(e)>254 THEN RAISE EXCEPTION 'invalid_email'; END IF; SELECT * INTO r FROM public.referrers WHERE business_id=b.id AND lower(email)=e LIMIT 1; IF r.id IS NULL THEN IF length(n) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'invalid_name'; END IF; r:=public.fn_upsert_referrer(b.id,n,e,NULL); END IF; IF public.fn_email_owned() THEN RETURN r.token; END IF; IF NOT EXISTS(SELECT 1 FROM public.suppressed_emails WHERE email=e) THEN PERFORM public.enqueue_email('transactional_emails',jsonb_build_object('to',e,'from','Revvin <info@revvin.co>','reply_to','info@revvin.co','subject','Your Revvin referral link','text','Your personal referral link: https://revvin.co/r/'||b.slug||'?ref='||r.token,'html','<p>Your personal referral link: <a href="https://revvin.co/r/'||b.slug||'?ref='||r.token||'">Open your link</a></p>','purpose','transactional','label','earn_link','queued_at',to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'idempotency_key','earn_link:'||r.id::text||':'||to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD'),'message_id',gen_random_uuid()::text)); END IF; RETURN NULL; END $function$;

CREATE OR REPLACE FUNCTION public.fn_prospect_claim(p_code text, p_business_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  p public.prospect_pages%ROWTYPE;
  b public.businesses%ROWTYPE;
  caller_email text;
BEGIN
  IF p_code IS NULL OR p_code !~ '^[A-Za-z0-9_-]{10,64}$' THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  SELECT * INTO p FROM public.prospect_pages WHERE code = p_code LIMIT 1;
  IF p.id IS NULL OR p.status IN ('removed', 'expired', 'claimed') OR p.expires_at < now() THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  SELECT * INTO b FROM public.businesses WHERE id = p_business_id LIMIT 1;
  IF b.id IS NULL OR b.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF coalesce(b.acquisition ->> 'prospect_code', '') IS DISTINCT FROM p.code THEN
    RAISE EXCEPTION 'code_mismatch';
  END IF;

  UPDATE public.prospect_pages
     SET status = 'claimed', claimed_business_id = b.id, updated_at = now()
   WHERE id = p.id;

  IF p.created_by IS NOT NULL THEN
    SELECT email INTO caller_email FROM auth.users WHERE id = p.created_by;
  END IF;
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'to', 'info@revvin.co',
    'from', 'Revvin <info@revvin.co>',
    'reply_to', 'info@revvin.co',
    'subject', 'Claimed: ' || p.name,
    'text', p.name || ' claimed their prebuilt referral page.' || coalesce(' Phone: ' || p.phone, ''),
    'html', '<p>' || p.name || ' claimed their prebuilt referral page.</p>' || coalesce('<p>Phone: <a href="tel:' || p.phone || '">' || p.phone || '</a></p>', ''),
    'purpose', 'transactional',
    'label', 'prospect_claimed',
    'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'idempotency_key', 'prospect_claimed:' || p.id::text,
    'message_id', gen_random_uuid()::text));
  IF caller_email IS NOT NULL AND lower(caller_email) <> 'info@revvin.co' THEN
    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'to', caller_email,
      'from', 'Revvin <info@revvin.co>',
      'reply_to', 'info@revvin.co',
      'subject', 'Claimed: ' || p.name,
      'text', p.name || ' claimed the page you built for them.' || coalesce(' Phone: ' || p.phone, ''),
      'html', '<p>' || p.name || ' claimed the page you built for them.</p>' || coalesce('<p>Phone: <a href="tel:' || p.phone || '">' || p.phone || '</a></p>', ''),
      'purpose', 'transactional',
      'label', 'prospect_claimed',
      'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'idempotency_key', 'prospect_claimed:' || p.id::text || ':caller',
      'message_id', gen_random_uuid()::text));
  END IF;
  RETURN true;
END $function$;