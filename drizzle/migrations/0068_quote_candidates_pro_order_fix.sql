CREATE OR REPLACE FUNCTION public.fn_quote_candidates(p_trade text, p_lat double precision, p_lng double precision, p_limit integer DEFAULT 3)
RETURNS TABLE(id uuid, slug text, name text, city text, region text, is_pro boolean, review_count bigint, rating_avg numeric, km double precision, business_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT x.id, x.slug, x.name, x.city, x.region, x.is_pro, x.rc, x.ra, x.km, x.business_email FROM (
    SELECT b.id, b.slug, b.name,
           coalesce(nullif(btrim(b.city), ''), nullif(btrim(split_part(b.service_area, ',', 1)), '')) AS city, nullif(btrim(b.state), '') AS region,
           coalesce(public.fn_plan_is_pro(b.plan, b.pro_trial_ends_at), false) AS is_pro,
           (SELECT count(*) FROM public.business_reviews r WHERE r.business_id = b.id AND r.status = 'published') AS rc,
           (SELECT round(avg(r.rating)::numeric, 2) FROM public.business_reviews r WHERE r.business_id = b.id AND r.status = 'published') AS ra,
           public.fn_quote_km(p_lat, p_lng, b.latitude, b.longitude) AS km, b.business_email
      FROM public.businesses b
     WHERE p_trade IS NOT NULL AND NOT public.fn_directory_regulated(p_trade)
       AND lower(coalesce(b.category, '')) = lower(p_trade)
       AND public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
       AND coalesce(b.marketplace_listed, false) AND NOT coalesce(b.is_demo, false) AND NOT coalesce(b.is_internal, false)
       AND b.slug IS NOT NULL AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL
       AND b.latitude BETWEEN p_lat - 0.6 AND p_lat + 0.6
  ) x
  WHERE x.km <= 60
  ORDER BY x.is_pro DESC, (x.rc > 0) DESC, x.km, x.name
  LIMIT least(greatest(coalesce(p_limit, 3), 1), 3)
$$;