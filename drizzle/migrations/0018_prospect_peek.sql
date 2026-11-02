-- Read-only variant of fn_prospect_view for obvious bots: returns the same
-- safe preview fields without counting a view or firing alert emails.
CREATE OR REPLACE FUNCTION public.fn_prospect_peek(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  p public.prospect_pages%ROWTYPE;
BEGIN
  IF p_code IS NULL OR p_code !~ '^[A-Za-z0-9_-]{10,64}$' THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  SELECT * INTO p FROM public.prospect_pages WHERE code = p_code LIMIT 1;
  IF p.id IS NULL OR p.status IN ('removed', 'expired') OR p.expires_at < now() THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  RETURN jsonb_build_object(
    'name', p.name,
    'trade', p.trade,
    'city', p.city,
    'region', p.region,
    'country', p.country,
    'suggested_reward', p.suggested_reward,
    'headline_override', p.headline_override,
    'status', p.status);
END $$;
REVOKE ALL ON FUNCTION public.fn_prospect_peek(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_prospect_peek(text) TO service_role;