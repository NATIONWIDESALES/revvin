-- Marketplace run 2: source category and release for imported listings, and
-- search functions that filter the tables directly so indexes are used at 100k+ rows.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

ALTER TABLE public.directory_listings ADD COLUMN IF NOT EXISTS source_category text;
ALTER TABLE public.directory_listings ADD COLUMN IF NOT EXISTS source_release text;
COMMENT ON COLUMN public.directory_listings.source_category IS 'Category exactly as the source gives it (for Overture: taxonomy.primary).';
COMMENT ON COLUMN public.directory_listings.source_release IS 'Source data release the row was loaded from, for example Overture 2026-11-18.0.';

CREATE INDEX IF NOT EXISTS directory_listings_unclaimed_name_idx ON public.directory_listings (name, slug) WHERE status = 'unclaimed';
CREATE INDEX IF NOT EXISTS directory_listings_unclaimed_geo_idx ON public.directory_listings (latitude, longitude, category) WHERE status = 'unclaimed' AND latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS directory_listings_name_trgm_idx ON public.directory_listings USING gin (name extensions.gin_trgm_ops) WHERE status = 'unclaimed';
CREATE INDEX IF NOT EXISTS directory_listings_city_trgm_idx ON public.directory_listings USING gin (city extensions.gin_trgm_ops) WHERE status = 'unclaimed';

-- Claimed businesses only (a few hundred rows), so listings are filtered by their own indexes.
CREATE OR REPLACE FUNCTION public.fn_directory_business_rows()
RETURNS TABLE(kind text, slug text, name text, category text, city text, region text, country text,
              lat double precision, lng double precision, is_pro boolean, is_verified boolean,
              has_reward boolean, reward_text text, logo_url text, rank int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT 'business', b.slug, b.name, coalesce(nullif(b.category,''),'Other'),
         coalesce(nullif(btrim(b.city),''), nullif(btrim(split_part(b.service_area, ',', 1)),'')),
         coalesce(nullif(btrim(b.state),''), CASE WHEN btrim(split_part(b.service_area, ',', 2)) ~ '^[A-Za-z]{2}$' THEN upper(btrim(split_part(b.service_area, ',', 2))) END),
         public.fn_directory_country(b.country),
         b.latitude, b.longitude,
         -- Same rule as fn_effective_plan, inlined because that function only answers the owner.
         (b.plan = 'pro' OR b.pro_trial_ends_at > now()),
         coalesce(b.is_verified, false),
         (NOT public.fn_directory_regulated(b.category) AND nullif(btrim(coalesce(b.offer_amount,'')),'') IS NOT NULL),
         CASE WHEN public.fn_directory_regulated(b.category) THEN NULL ELSE left(nullif(btrim(coalesce(b.offer_amount,'')),''), 80) END,
         b.logo_url,
         CASE WHEN (b.plan = 'pro' OR b.pro_trial_ends_at > now()) THEN 0 ELSE 1 END
    FROM public.businesses b
   WHERE public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
     AND coalesce(b.marketplace_listed, false)
     AND NOT coalesce(b.is_demo, false)
     AND NOT coalesce(b.is_internal, false)
     AND b.slug IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.fn_directory_business_rows() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_directory_search(
  p_min_lat double precision DEFAULT NULL, p_min_lng double precision DEFAULT NULL,
  p_max_lat double precision DEFAULT NULL, p_max_lng double precision DEFAULT NULL,
  p_category text DEFAULT NULL, p_q text DEFAULT NULL, p_region text DEFAULT NULL,
  p_country text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS TABLE(kind text, slug text, name text, category text, city text, region text, country text,
              lat double precision, lng double precision, is_pro boolean, is_verified boolean,
              has_reward boolean, reward_text text, logo_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_catalog AS $$
DECLARE bbox boolean := p_min_lat IS NOT NULL AND p_min_lng IS NOT NULL AND p_max_lat IS NOT NULL AND p_max_lng IS NOT NULL;
        q text := nullif(btrim(left(coalesce(p_q,''), 80)), '');
        pat text; lim int := least(greatest(coalesce(p_limit, 50), 1), 200);
        off int := least(greatest(coalesce(p_offset, 0), 0), 10000);
        wrap boolean; cat text := nullif(p_category,''); reg text := upper(nullif(p_region,''));
BEGIN
  IF bbox AND (p_min_lat NOT BETWEEN -90 AND 90 OR p_max_lat NOT BETWEEN -90 AND 90 OR p_min_lng NOT BETWEEN -180 AND 180 OR p_max_lng NOT BETWEEN -180 AND 180 OR p_min_lat > p_max_lat) THEN
    RAISE EXCEPTION 'invalid_bbox';
  END IF;
  IF p_country IS NOT NULL AND p_country NOT IN ('US','CA') THEN RAISE EXCEPTION 'invalid_country'; END IF;
  IF length(coalesce(p_category,'')) > 60 OR length(coalesce(p_region,'')) > 40 THEN RAISE EXCEPTION 'invalid_filter'; END IF;
  IF q IS NOT NULL THEN pat := '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%'; END IF;
  wrap := bbox AND p_min_lng > p_max_lng;
  RETURN QUERY
  WITH biz AS (
    SELECT r.* FROM public.fn_directory_business_rows() r
     WHERE (NOT bbox OR (r.lat BETWEEN p_min_lat AND p_max_lat AND
            CASE WHEN NOT wrap THEN r.lng BETWEEN p_min_lng AND p_max_lng ELSE (r.lng >= p_min_lng OR r.lng <= p_max_lng) END))
       AND (cat IS NULL OR lower(r.category) = lower(cat))
       AND (reg IS NULL OR upper(r.region) = reg)
       AND (p_country IS NULL OR r.country = p_country)
       AND (pat IS NULL OR r.name ILIKE pat OR r.city ILIKE pat)
  ), lst AS (
    SELECT 'listing'::text AS kind, l.slug, l.name, l.category, l.city, l.region, l.country, l.latitude AS lat, l.longitude AS lng,
           false AS is_pro, false AS is_verified, false AS has_reward, NULL::text AS reward_text, NULL::text AS logo_url, 2 AS rank
      FROM public.directory_listings l
     WHERE l.status = 'unclaimed'
       AND (NOT bbox OR (l.latitude BETWEEN p_min_lat AND p_max_lat AND
            CASE WHEN NOT wrap THEN l.longitude BETWEEN p_min_lng AND p_max_lng ELSE (l.longitude >= p_min_lng OR l.longitude <= p_max_lng) END))
       AND (cat IS NULL OR l.category = cat)
       AND (reg IS NULL OR upper(l.region) = reg)
       AND (p_country IS NULL OR l.country = p_country)
       AND (pat IS NULL OR l.name ILIKE pat OR l.city ILIKE pat)
     ORDER BY l.name, l.slug
     LIMIT lim + off
  )
  SELECT u.kind, u.slug, u.name, u.category, u.city, u.region, u.country, u.lat, u.lng,
         u.is_pro, u.is_verified, u.has_reward, u.reward_text, u.logo_url
    FROM (SELECT * FROM biz UNION ALL SELECT * FROM lst) u
   ORDER BY u.rank, u.name, u.slug
   LIMIT lim OFFSET off;
END $$;

CREATE OR REPLACE FUNCTION public.fn_directory_clusters(
  p_min_lat double precision, p_min_lng double precision, p_max_lat double precision, p_max_lng double precision,
  p_zoom int DEFAULT 3, p_category text DEFAULT NULL)
RETURNS TABLE(lat double precision, lng double precision, count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE cell double precision; wrap boolean; cat text := nullif(p_category,'');
BEGIN
  IF p_min_lat IS NULL OR p_max_lat IS NULL OR p_min_lng IS NULL OR p_max_lng IS NULL
     OR p_min_lat NOT BETWEEN -90 AND 90 OR p_max_lat NOT BETWEEN -90 AND 90
     OR p_min_lng NOT BETWEEN -180 AND 180 OR p_max_lng NOT BETWEEN -180 AND 180 OR p_min_lat > p_max_lat THEN
    RAISE EXCEPTION 'invalid_bbox';
  END IF;
  IF length(coalesce(p_category,'')) > 60 THEN RAISE EXCEPTION 'invalid_filter'; END IF;
  cell := 90.0 / power(2, least(greatest(coalesce(p_zoom, 3), 0), 20));
  wrap := p_min_lng > p_max_lng;
  RETURN QUERY
  WITH pts AS (
    SELECT r.lat, r.lng FROM public.fn_directory_business_rows() r
     WHERE r.lat IS NOT NULL AND r.lng IS NOT NULL
       AND r.lat BETWEEN p_min_lat AND p_max_lat
       AND CASE WHEN NOT wrap THEN r.lng BETWEEN p_min_lng AND p_max_lng ELSE (r.lng >= p_min_lng OR r.lng <= p_max_lng) END
       AND (cat IS NULL OR lower(r.category) = lower(cat))
    UNION ALL
    SELECT l.latitude, l.longitude FROM public.directory_listings l
     WHERE l.status = 'unclaimed' AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
       AND l.latitude BETWEEN p_min_lat AND p_max_lat
       AND CASE WHEN NOT wrap THEN l.longitude BETWEEN p_min_lng AND p_max_lng ELSE (l.longitude >= p_min_lng OR l.longitude <= p_max_lng) END
       AND (cat IS NULL OR l.category = cat)
  )
  SELECT avg(p.lat), avg(p.lng), count(*) FROM pts p
   GROUP BY floor(p.lat / cell), floor(p.lng / cell)
   ORDER BY count(*) DESC
   LIMIT 400;
END $$;

REVOKE ALL ON FUNCTION public.fn_directory_search(double precision,double precision,double precision,double precision,text,text,text,text,int,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_directory_clusters(double precision,double precision,double precision,double precision,int,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_directory_search(double precision,double precision,double precision,double precision,text,text,text,text,int,int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_directory_clusters(double precision,double precision,double precision,double precision,int,text) TO anon, authenticated, service_role;