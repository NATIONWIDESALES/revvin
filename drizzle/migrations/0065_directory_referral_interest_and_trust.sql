CREATE TABLE public.directory_referral_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.directory_listings(id) ON DELETE CASCADE,
  email text,
  visitor_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX directory_referral_interest_listing_visitor ON public.directory_referral_interest(listing_id, visitor_hash);
CREATE INDEX directory_referral_interest_visitor_time ON public.directory_referral_interest(visitor_hash, created_at);
GRANT ALL ON public.directory_referral_interest TO service_role;
ALTER TABLE public.directory_referral_interest ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_directory_interest_count(p_slug text) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT count(*)::int FROM public.directory_referral_interest i
    JOIN public.directory_listings l ON l.id = i.listing_id
   WHERE l.slug = p_slug AND l.status = 'unclaimed'
$$;

CREATE OR REPLACE FUNCTION public.fn_directory_referral_interest(p_slug text, p_email text DEFAULT NULL) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE l record; v text := public.fn_request_bucket(); em text := nullif(lower(btrim(coalesce(p_email, ''))), ''); existing uuid; total int;
BEGIN
  IF p_slug IS NULL OR length(p_slug) > 100 THEN RAISE EXCEPTION 'not_found'; END IF;
  IF em IS NOT NULL AND (length(em) > 254 OR em !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') THEN RAISE EXCEPTION 'invalid_email'; END IF;
  SELECT id, slug, name, city INTO l FROM public.directory_listings WHERE slug = p_slug AND status = 'unclaimed' LIMIT 1;
  IF l.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  SELECT id INTO existing FROM public.directory_referral_interest WHERE listing_id = l.id AND visitor_hash = v LIMIT 1;
  IF existing IS NOT NULL THEN
    IF em IS NOT NULL THEN UPDATE public.directory_referral_interest SET email = em WHERE id = existing AND email IS NULL; END IF;
  ELSE
    IF (SELECT count(*) FROM public.directory_referral_interest WHERE visitor_hash = v AND created_at > now() - interval '1 day') >= 10
       OR NOT public.fn_rate_bucket_hit('directory_interest:global', interval '1 hour', 500) THEN
      RAISE EXCEPTION 'rate_limited';
    END IF;
    INSERT INTO public.directory_referral_interest(listing_id, email, visitor_hash) VALUES (l.id, em, v);
  END IF;
  SELECT count(*)::int INTO total FROM public.directory_referral_interest WHERE listing_id = l.id;
  IF existing IS NULL AND total = 1 THEN
    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'to', 'info@revvin.co', 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
      'subject', 'First referral interest: ' || left(l.name, 120),
      'text', 'Someone said they would refer customers to ' || l.name || coalesce(' in ' || l.city, '') || ' (/b/' || l.slug || '). The business has not claimed its profile.',
      'html', '<p>Someone said they would refer customers to ' || public.fn_directory_html(l.name) || coalesce(' in ' || public.fn_directory_html(l.city), '') || ' (/b/' || public.fn_directory_html(l.slug) || ').</p><p>The business has not claimed its profile.</p>',
      'purpose', 'transactional', 'label', 'directory_referral_interest_first',
      'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'idempotency_key', 'directory_interest_first:' || l.id::text, 'message_id', gen_random_uuid()::text));
  END IF;
  RETURN total;
END $$;

CREATE OR REPLACE FUNCTION public.fn_directory_card_trust(p_slugs text[])
RETURNS TABLE(slug text, review_count bigint, rating_avg numeric, has_license boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT b.slug,
         (SELECT count(*) FROM public.business_reviews r WHERE r.business_id = b.id AND r.status = 'published'),
         (SELECT round(avg(r.rating)::numeric, 2) FROM public.business_reviews r WHERE r.business_id = b.id AND r.status = 'published'),
         public.fn_plan_is_pro(b.plan, b.pro_trial_ends_at) AND nullif(btrim(coalesce(b.license_number, '')), '') IS NOT NULL
    FROM public.businesses b
   WHERE b.slug = ANY (p_slugs[1:100])
     AND public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
     AND coalesce(b.marketplace_listed, false) AND NOT coalesce(b.is_demo, false) AND NOT coalesce(b.is_internal, false)
$$;

REVOKE ALL ON FUNCTION public.fn_directory_interest_count(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_directory_referral_interest(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_directory_card_trust(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_directory_interest_count(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_directory_referral_interest(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_directory_card_trust(text[]) TO anon, authenticated, service_role;