CREATE OR REPLACE FUNCTION public.fn_review_submit(p_token text, p_rating int, p_body text, p_display_name text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE r public.business_reviews%ROWTYPE; v_body text := btrim(coalesce(p_body,'')); v_dn text := public.fn_review_display_name(p_display_name);
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{48,64}$' THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF NOT public.fn_rate_bucket_hit('review_submit:' || public.fn_request_bucket(), interval '1 hour', 20) THEN RAISE EXCEPTION 'rate_limited'; END IF;
  SELECT * INTO r FROM public.business_reviews WHERE token = p_token FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF r.status <> 'requested' THEN RAISE EXCEPTION 'already_used'; END IF;
  IF r.created_at < now() - interval '180 days' THEN RAISE EXCEPTION 'expired'; END IF;
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'invalid_rating'; END IF;
  IF length(v_body) NOT BETWEEN 20 AND 1500 THEN RAISE EXCEPTION 'invalid_body'; END IF;
  IF NOT public.fn_review_text_allowed(v_body) OR NOT public.fn_review_text_allowed(p_display_name) THEN RAISE EXCEPTION 'body_not_allowed'; END IF;
  IF v_dn IS NULL THEN RAISE EXCEPTION 'invalid_name'; END IF;
  UPDATE public.business_reviews SET rating = p_rating, body = v_body, reviewer_display_name = v_dn,
         status = 'published', submitted_at = now() WHERE id = r.id;
  RETURN true;
END $$;