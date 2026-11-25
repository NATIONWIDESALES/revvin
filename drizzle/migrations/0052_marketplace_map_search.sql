CREATE OR REPLACE FUNCTION public.fn_directory_clean_name(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT nullif(btrim(regexp_replace(
           regexp_replace(coalesce(p,''), '[\uFE0F\u200B\u200C\u200D\u2060\uFEFF]', '', 'g'),
           '^[^[:alnum:]"''(\[{“‘]+', '')), '')
$$;

UPDATE public.directory_listings
   SET name = public.fn_directory_clean_name(name)
 WHERE public.fn_directory_clean_name(name) IS NOT NULL
   AND public.fn_directory_clean_name(name) IS DISTINCT FROM name;

CREATE OR REPLACE FUNCTION public.fn_directory_map_search(
  p_min_lat double precision DEFAULT NULL, p_min_lng double precision DEFAULT NULL,
  p_max_lat double precision DEFAULT NULL, p_max_lng double precision DEFAULT NULL,
  p_category text DEFAULT NULL, p_q text DEFAULT NULL, p_rewards_only boolean DEFAULT false,
  p_sort text DEFAULT 'featured', p_limit int DEFAULT 40, p_offset int DEFAULT 0)
RETURNS TABLE(kind text, slug text, name text, category text, city text, region text, country text,
              lat double precision, lng double precision, is_pro boolean, is_verified boolean,
              has_reward boolean, reward_text text, logo_url text, total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_catalog AS $$
DECLARE bbox boolean := p_min_lat IS NOT NULL AND p_min_lng IS NOT NULL AND p_max_lat IS NOT NULL AND p_max_lng IS NOT NULL;
        q text := nullif(btrim(left(coalesce(p_q,''), 80)), '');
        pat text; lim int := least(greatest(coalesce(p_limit, 40), 1), 100);
        off int := least(greatest(coalesce(p_offset, 0), 0), 5000);
        wrap boolean; cat text := nullif(p_category,''); ro boolean := coalesce(p_rewards_only, false);
        by_name boolean := coalesce(p_sort,'featured') = 'name'; total bigint;
BEGIN
  IF bbox AND (p_min_lat NOT BETWEEN -90 AND 90 OR p_max_lat NOT BETWEEN -90 AND 90 OR p_min_lng NOT BETWEEN -180 AND 180 OR p_max_lng NOT BETWEEN -180 AND 180 OR p_min_lat > p_max_lat) THEN
    RAISE EXCEPTION 'invalid_bbox';
  END IF;
  IF length(coalesce(p_category,'')) > 60 OR coalesce(p_sort,'featured') NOT IN ('featured','name') THEN RAISE EXCEPTION 'invalid_filter'; END IF;
  IF q IS NOT NULL THEN pat := '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%'; END IF;
  wrap := bbox AND p_min_lng > p_max_lng;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.dir_biz ON COMMIT DROP AS SELECT * FROM public.fn_directory_business_rows() WITH NO DATA;
  TRUNCATE pg_temp.dir_biz;
  INSERT INTO pg_temp.dir_biz
    SELECT r.* FROM public.fn_directory_business_rows() r
     WHERE (NOT bbox OR (r.lat BETWEEN p_min_lat AND p_max_lat AND
            CASE WHEN NOT wrap THEN r.lng BETWEEN p_min_lng AND p_max_lng ELSE (r.lng >= p_min_lng OR r.lng <= p_max_lng) END))
       AND (cat IS NULL OR lower(r.category) = lower(cat))
       AND (pat IS NULL OR r.name ILIKE pat OR r.city ILIKE pat)
       AND (NOT ro OR r.has_reward);

  SELECT count(*) INTO total FROM pg_temp.dir_biz;
  IF NOT ro THEN
    total := total + (SELECT count(*) FROM public.directory_listings l
     WHERE l.status = 'unclaimed'
       AND (NOT bbox OR (l.latitude BETWEEN p_min_lat AND p_max_lat AND
            CASE WHEN NOT wrap THEN l.longitude BETWEEN p_min_lng AND p_max_lng ELSE (l.longitude >= p_min_lng OR l.longitude <= p_max_lng) END))
       AND (cat IS NULL OR l.category = cat)
       AND (pat IS NULL OR l.name ILIKE pat OR l.city ILIKE pat));
  END IF;

  RETURN QUERY
  WITH lst AS (
    SELECT 'listing'::text AS kind, l.slug, l.name, l.category, l.city, l.region, l.country, l.latitude AS lat, l.longitude AS lng,
           false AS is_pro, false AS is_verified, false AS has_reward, NULL::text AS reward_text, NULL::text AS logo_url, 2 AS rank
      FROM public.directory_listings l
     WHERE NOT ro AND l.status = 'unclaimed'
       AND (NOT bbox OR (l.latitude BETWEEN p_min_lat AND p_max_lat AND
            CASE WHEN NOT wrap THEN l.longitude BETWEEN p_min_lng AND p_max_lng ELSE (l.longitude >= p_min_lng OR l.longitude <= p_max_lng) END))
       AND (cat IS NULL OR l.category = cat)
       AND (pat IS NULL OR l.name ILIKE pat OR l.city ILIKE pat)
     ORDER BY l.name, l.slug
     LIMIT lim + off
  )
  SELECT u.kind, u.slug, u.name, u.category, u.city, u.region, u.country, u.lat, u.lng,
         u.is_pro, u.is_verified, u.has_reward, u.reward_text, u.logo_url, total
    FROM (SELECT * FROM pg_temp.dir_biz UNION ALL SELECT * FROM lst) u
   ORDER BY CASE WHEN by_name THEN 0 ELSE u.rank END, u.name, u.slug
   LIMIT lim OFFSET off;
END $$;

CREATE OR REPLACE FUNCTION public.fn_directory_reward_bounds()
RETURNS TABLE(min_lat double precision, min_lng double precision, max_lat double precision, max_lng double precision, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT min(r.lat), min(r.lng), max(r.lat), max(r.lng), count(*)
    FROM public.fn_directory_business_rows() r
   WHERE r.has_reward AND r.lat IS NOT NULL AND r.lng IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.fn_directory_city(p_q text)
RETURNS TABLE(lat double precision, lng double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_catalog AS $$
DECLARE k text := lower(regexp_replace(btrim(left(coalesce(p_q,''), 80)), '\s+', ' ', 'g'));
BEGIN
  IF length(k) < 3 THEN RETURN; END IF;
  RETURN QUERY SELECT g.latitude, g.longitude FROM public.geocode_cache g
    WHERE g.status = 'ok' AND g.latitude IS NOT NULL AND (g.query_key = k OR g.query_key LIKE replace(replace(k,'%',''),'_','') || ',%')
    ORDER BY (g.query_key = k) DESC, g.query_key LIMIT 1;
  IF FOUND THEN RETURN; END IF;
  RETURN QUERY SELECT avg(l.latitude), avg(l.longitude) FROM (
      SELECT l2.latitude, l2.longitude FROM public.directory_listings l2
       WHERE l2.status = 'unclaimed' AND l2.city ILIKE replace(replace(k,'%',''),'_','') AND l2.latitude IS NOT NULL
       LIMIT 500) l
    HAVING count(*) > 0;
END $$;

REVOKE ALL ON FUNCTION public.fn_directory_clean_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_directory_clean_name(text) TO service_role;
REVOKE ALL ON FUNCTION public.fn_directory_map_search(double precision,double precision,double precision,double precision,text,text,boolean,text,int,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_directory_reward_bounds() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_directory_city(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_directory_map_search(double precision,double precision,double precision,double precision,text,text,boolean,text,int,int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_directory_reward_bounds() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_directory_city(text) TO anon, authenticated, service_role;