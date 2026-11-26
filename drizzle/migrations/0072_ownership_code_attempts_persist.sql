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
    RETURN false;
  END IF;
  UPDATE public.ownership_email_codes SET consumed_at = now() WHERE id = c.id;
  RETURN public.fn_ownership_set_status(b.id, 'verified', 'domain_email');
END
$function$;