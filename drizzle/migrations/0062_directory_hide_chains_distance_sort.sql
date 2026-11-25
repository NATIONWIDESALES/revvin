ALTER TABLE public.directory_listings ADD COLUMN IF NOT EXISTS is_chain boolean NOT NULL DEFAULT false;
ALTER TABLE public.directory_listings ADD COLUMN IF NOT EXISTS chain_reason text NULL;
CREATE INDEX IF NOT EXISTS directory_listings_visible_geo_idx ON public.directory_listings (latitude, longitude, category) WHERE status = 'unclaimed' AND is_chain = false;

CREATE TABLE IF NOT EXISTS public.directory_chain_brands (pattern text PRIMARY KEY CHECK (pattern ~ '^[a-z0-9]+$'), note text, created_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON public.directory_chain_brands FROM anon, authenticated;
GRANT ALL ON public.directory_chain_brands TO service_role;
ALTER TABLE public.directory_chain_brands ENABLE ROW LEVEL SECURITY;

INSERT INTO public.directory_chain_brands(pattern) SELECT unnest(ARRAY[
 '1800gotjunk','minutekey','keyme','firestone','pepboys','napaautopro','aamco','gerbercollision','searsappliance','searsheating','searshome',
 'tiresplus','kaltire','speedyglass','jiffylube','mavis','mrlube','terminix','rotorooter','calibercollision','caliberautocare','orkin','midas','mrtire',
 'walmart','classiccollision','take5','twomenandatruck','maaco','valvoline','fergusonplumbing','weedman','meineke','bigotires','brightview',
 'merrymaids','mollymaid','maidpro','trugreen','ziebart','safelite','autoglassnow','collegehunks','aptive','krown','monroauto','bathfitter',
 'rebath','rivian','tesla','sunoco','ntbnationaltire','servicemaster','stricklandbrothers','carx','fishwindow','tranecommercial','brakesplus',
 'costco','discounttire','tuffy','precisiontune','greatcanadianoilchange','oilchangers','uniglass','carstar','certapro','crashchampions',
 'autovalue','mrrooter','mrelectric','mrhandyman','mrappliance','chemdry','freshcoat','tailoredcloset','floorcoveringsinternational',
 'theservicemaster','servpro','stanleysteemer','mosquitojoe','mosquitosquad','mosquitohero','budgetblinds','glasskote','handymanconnection',
 'aireserv','onehourheating','benjaminfranklinplumbing','mistersparky','lebeau','cleaningauthority','homeinstead',
 'joehudson','tirechoice','wheelworks','tirerama','bigbrandtire','dabella'
]) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_directory_domain(p_url text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path TO 'pg_catalog' AS $$
  WITH h AS (SELECT split_part(split_part(split_part(regexp_replace(lower(btrim(coalesce(p_url,''))), '^[a-z]+://', ''), '/', 1), '?', 1), ':', 1) AS host),
  p AS (SELECT host, string_to_array(host, '.') a FROM h WHERE host ~ '^[a-z0-9.-]+\.[a-z]{2,}$')
  SELECT CASE WHEN cardinality(a) >= 3 AND (a[cardinality(a)-1] || '.' || a[cardinality(a)]) ~ '^(com|net|org|co|gc|qc|on|bc|ab|mb|sk|ns|nb)\.(ca|uk|au|us)$'
              THEN array_to_string(a[cardinality(a)-2:cardinality(a)], '.')
              ELSE array_to_string(a[greatest(cardinality(a)-1,1):cardinality(a)], '.') END
    FROM p
$$;

CREATE OR REPLACE FUNCTION public.fn_directory_flag_chains() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog' AS $$
DECLARE changed int;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' AND session_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  WITH base AS (
    SELECT l.id, regexp_replace(lower(l.name), '[^a-z0-9]', '', 'g') AS k, public.fn_directory_domain(l.website) AS d,
           (l.status = 'unclaimed' AND l.claimed_business_id IS NULL) AS eligible
      FROM public.directory_listings l
  ), nk AS (SELECT k FROM base WHERE k <> '' GROUP BY k HAVING count(*) >= 5),
  dk AS (SELECT d FROM base WHERE d IS NOT NULL
           AND d NOT IN ('facebook.com','instagram.com','google.com','business.site','sites.google.com','wixsite.com','godaddysites.com',
                         'square.site','squarespace.com','weebly.com','wordpress.com','yelp.com','linktr.ee','homeadvisor.com','angi.com',
                         'houzz.com','nextdoor.com','yellowpages.com','yellowpages.ca','bbb.org','mapquest.com')
         GROUP BY d HAVING count(*) >= 5),
  calc AS (
    SELECT b.id, CASE WHEN NOT b.eligible THEN NULL
      WHEN EXISTS (SELECT 1 FROM public.directory_chain_brands c WHERE b.k LIKE c.pattern || '%') THEN 'brand'
      WHEN b.k IN (SELECT k FROM nk) THEN 'name_repeat'
      WHEN b.d IN (SELECT d FROM dk) THEN 'domain_repeat' END AS reason
      FROM base b
  )
  UPDATE public.directory_listings l SET is_chain = (c.reason IS NOT NULL), chain_reason = c.reason
    FROM calc c WHERE c.id = l.id AND (l.is_chain IS DISTINCT FROM (c.reason IS NOT NULL) OR l.chain_reason IS DISTINCT FROM c.reason);
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN jsonb_build_object('changed', changed);
END $$;
REVOKE ALL ON FUNCTION public.fn_directory_flag_chains() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_directory_flag_chains() TO service_role;

CREATE OR REPLACE FUNCTION public.fn_directory_import(p_rows jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE r jsonb; base text; s text; n int; ins int := 0; upd int := 0; existing uuid;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' AND session_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) > 1000 THEN RAISE EXCEPTION 'invalid_batch'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    SELECT id INTO existing FROM public.directory_listings WHERE source = r->>'source' AND source_id = r->>'source_id';
    IF existing IS NOT NULL THEN
      UPDATE public.directory_listings SET name = r->>'name', category = coalesce(r->>'category','Other'), city = r->>'city',
             region = r->>'region', country = r->>'country', postal_code = r->>'postal_code',
             latitude = (r->>'latitude')::double precision, longitude = (r->>'longitude')::double precision,
             phone = r->>'phone', website = r->>'website', source_license = r->>'source_license'
       WHERE id = existing;
      upd := upd + 1;
    ELSE
      base := public.fn_directory_slug_base(r->>'name', r->>'city'); s := base; n := 1;
      WHILE EXISTS (SELECT 1 FROM public.directory_listings WHERE slug = s) OR EXISTS (SELECT 1 FROM public.businesses WHERE slug = s) LOOP
        n := n + 1; s := base || '-' || n;
      END LOOP;
      INSERT INTO public.directory_listings(slug, name, category, city, region, country, postal_code, latitude, longitude, phone, website, source, source_id, source_license)
      VALUES (s, r->>'name', coalesce(r->>'category','Other'), r->>'city', r->>'region', r->>'country', r->>'postal_code',
              (r->>'latitude')::double precision, (r->>'longitude')::double precision, r->>'phone', r->>'website',
              r->>'source', r->>'source_id', r->>'source_license');
      ins := ins + 1;
    END IF;
  END LOOP;
  PERFORM public.fn_directory_flag_chains();
  RETURN jsonb_build_object('inserted', ins, 'updated', upd);
END $function$;

CREATE OR REPLACE FUNCTION public.fn_directory_public_count()
 RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT (SELECT count(*) FROM public.directory_listings WHERE status = 'unclaimed' AND NOT is_chain)
       + (SELECT count(*) FROM public.businesses b
           WHERE public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
             AND NOT coalesce(b.is_demo, false) AND NOT coalesce(b.is_internal, false) AND b.slug IS NOT NULL)
$function$;

CREATE OR REPLACE FUNCTION public.fn_directory_find(p_name text, p_city text DEFAULT NULL::text, p_limit integer DEFAULT 6)
 RETURNS TABLE(id uuid, slug text, name text, category text, city text, region text, claimed boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
#variable_conflict use_column
DECLARE q text := left(btrim(coalesce(p_name, '')), 80);
        c text := nullif(left(btrim(coalesce(p_city, '')), 60), '');
        n int := least(greatest(coalesce(p_limit, 6), 1), 10);
        pat text; cpat text;
BEGIN
  IF length(q) < 3 THEN RETURN; END IF;
  pat := '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  cpat := CASE WHEN c IS NULL THEN NULL ELSE '%' || replace(replace(replace(c, '\', '\\'), '%', '\%'), '_', '\_') || '%' END;
  RETURN QUERY
  SELECT x.id, x.slug, x.name, x.category, x.city, x.region, x.claimed FROM (
    SELECT b.id, b.slug, b.name, coalesce(nullif(b.category,''),'Other') AS category,
           coalesce(nullif(btrim(b.city),''), nullif(btrim(split_part(b.service_area, ',', 1)),'')) AS city,
           nullif(btrim(b.state),'') AS region, true AS claimed, similarity(b.name, q) AS sim
      FROM public.businesses b
     WHERE b.name ILIKE pat
       AND public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
       AND NOT coalesce(b.is_demo, false) AND NOT coalesce(b.is_internal, false) AND b.slug IS NOT NULL
       AND (cpat IS NULL OR b.city ILIKE cpat OR b.service_area ILIKE cpat)
    UNION ALL
    SELECT l.id, l.slug, l.name, l.category, l.city, l.region, false, similarity(l.name, q)
      FROM public.directory_listings l
     WHERE l.status = 'unclaimed' AND NOT l.is_chain AND l.name ILIKE pat
       AND (cpat IS NULL OR l.city ILIKE cpat)
  ) x ORDER BY x.claimed DESC, x.sim DESC, x.name LIMIT n;
END $function$;

CREATE OR REPLACE FUNCTION public.fn_directory_nearby(p_lat double precision, p_lng double precision, p_category text, p_exclude text)
 RETURNS TABLE(kind text, slug text, name text, category text, city text, region text, country text, lat double precision, lng double precision, is_pro boolean, is_verified boolean, has_reward boolean, reward_text text, logo_url text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
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
     WHERE l.status = 'unclaimed' AND NOT l.is_chain AND l.latitude BETWEEN p_lat - box.dlat AND p_lat + box.dlat
       AND l.longitude BETWEEN p_lng - box.dlng AND p_lng + box.dlng AND l.category = p_category AND l.slug IS DISTINCT FROM p_exclude
     LIMIT 60) x
  )
  SELECT u.kind, u.slug, u.name, u.category, u.city, u.region, u.country, u.lat, u.lng, u.is_pro, u.is_verified, u.has_reward, u.reward_text, u.logo_url
    FROM u WHERE p_lat IS NOT NULL AND p_lng IS NOT NULL
   ORDER BY u.rank, (u.lat - p_lat)^2 + ((u.lng - p_lng) * cos(radians(p_lat)))^2
   LIMIT 6
$function$;

CREATE OR REPLACE FUNCTION public.fn_directory_clusters(p_min_lat double precision, p_min_lng double precision, p_max_lat double precision, p_max_lng double precision, p_zoom integer DEFAULT 3, p_category text DEFAULT NULL::text)
 RETURNS TABLE(lat double precision, lng double precision, count bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
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
     WHERE l.status = 'unclaimed' AND NOT l.is_chain AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
       AND l.latitude BETWEEN p_min_lat AND p_max_lat
       AND CASE WHEN NOT wrap THEN l.longitude BETWEEN p_min_lng AND p_max_lng ELSE (l.longitude >= p_min_lng OR l.longitude <= p_max_lng) END
       AND (cat IS NULL OR l.category = cat)
  )
  SELECT avg(p.lat), avg(p.lng), count(*) FROM pts p
   GROUP BY floor(p.lat / cell), floor(p.lng / cell)
   ORDER BY count(*) DESC
   LIMIT 400;
END $function$;

CREATE OR REPLACE FUNCTION public.fn_directory_map_search(p_min_lat double precision DEFAULT NULL::double precision, p_min_lng double precision DEFAULT NULL::double precision, p_max_lat double precision DEFAULT NULL::double precision, p_max_lng double precision DEFAULT NULL::double precision, p_category text DEFAULT NULL::text, p_q text DEFAULT NULL::text, p_rewards_only boolean DEFAULT false, p_sort text DEFAULT 'featured'::text, p_limit integer DEFAULT 40, p_offset integer DEFAULT 0)
 RETURNS TABLE(kind text, slug text, name text, category text, city text, region text, country text, lat double precision, lng double precision, is_pro boolean, is_verified boolean, has_reward boolean, reward_text text, logo_url text, total_count bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE bbox boolean := p_min_lat IS NOT NULL AND p_min_lng IS NOT NULL AND p_max_lat IS NOT NULL AND p_max_lng IS NOT NULL;
        q text := nullif(btrim(left(coalesce(p_q,''), 80)), '');
        pat text; lim int := least(greatest(coalesce(p_limit, 40), 1), 100);
        off int := least(greatest(coalesce(p_offset, 0), 0), 5000);
        wrap boolean; cat text := nullif(p_category,''); ro boolean := coalesce(p_rewards_only, false);
        by_name boolean := coalesce(p_sort,'featured') = 'name'; total bigint := 0;
        by_dist boolean; clat double precision; clng double precision; kx double precision;
BEGIN
  IF bbox AND (p_min_lat NOT BETWEEN -90 AND 90 OR p_max_lat NOT BETWEEN -90 AND 90 OR p_min_lng NOT BETWEEN -180 AND 180 OR p_max_lng NOT BETWEEN -180 AND 180 OR p_min_lat > p_max_lat) THEN
    RAISE EXCEPTION 'invalid_bbox';
  END IF;
  IF length(coalesce(p_category,'')) > 60 OR coalesce(p_sort,'featured') NOT IN ('featured','name') THEN RAISE EXCEPTION 'invalid_filter'; END IF;
  IF q IS NOT NULL THEN pat := '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%'; END IF;
  wrap := bbox AND p_min_lng > p_max_lng;
  by_dist := bbox AND NOT by_name;
  IF bbox THEN
    clat := (p_min_lat + p_max_lat) / 2;
    clng := CASE WHEN wrap THEN ((p_min_lng + p_max_lng + 360) / 2) ELSE (p_min_lng + p_max_lng) / 2 END;
    IF clng > 180 THEN clng := clng - 360; END IF;
    kx := cos(radians(clat));
  END IF;

  SELECT count(*) INTO total FROM public.fn_directory_business_rows() r
   WHERE (NOT bbox OR (r.lat BETWEEN p_min_lat AND p_max_lat AND
          CASE WHEN NOT wrap THEN r.lng BETWEEN p_min_lng AND p_max_lng ELSE (r.lng >= p_min_lng OR r.lng <= p_max_lng) END))
     AND (cat IS NULL OR lower(r.category) = lower(cat))
     AND (pat IS NULL OR r.name ILIKE pat OR r.city ILIKE pat)
     AND (NOT ro OR r.has_reward);
  IF NOT ro THEN
    total := total + (SELECT count(*) FROM public.directory_listings l
     WHERE l.status = 'unclaimed' AND NOT l.is_chain
       AND (NOT bbox OR (l.latitude BETWEEN p_min_lat AND p_max_lat AND
            CASE WHEN NOT wrap THEN l.longitude BETWEEN p_min_lng AND p_max_lng ELSE (l.longitude >= p_min_lng OR l.longitude <= p_max_lng) END))
       AND (cat IS NULL OR l.category = cat)
       AND (pat IS NULL OR l.name ILIKE pat OR l.city ILIKE pat));
  END IF;

  RETURN QUERY
  WITH biz AS (
    SELECT r.kind, r.slug, r.name, r.category, r.city, r.region, r.country, r.lat, r.lng,
           r.is_pro, r.is_verified, r.has_reward, r.reward_text, r.logo_url, r.rank, 0::bigint AS ord
      FROM public.fn_directory_business_rows() r
     WHERE (NOT bbox OR (r.lat BETWEEN p_min_lat AND p_max_lat AND
            CASE WHEN NOT wrap THEN r.lng BETWEEN p_min_lng AND p_max_lng ELSE (r.lng >= p_min_lng OR r.lng <= p_max_lng) END))
       AND (cat IS NULL OR lower(r.category) = lower(cat))
       AND (pat IS NULL OR r.name ILIKE pat OR r.city ILIKE pat)
       AND (NOT ro OR r.has_reward)
  ), cand AS (
    SELECT l.slug, l.name, l.category, l.city, l.region, l.country, l.latitude, l.longitude,
           CASE WHEN by_dist THEN (l.latitude - clat)^2 + (((l.longitude - clng + 540)::numeric % 360 - 180)::double precision * kx)^2 ELSE 0 END AS dist
      FROM public.directory_listings l
     WHERE NOT ro AND l.status = 'unclaimed' AND NOT l.is_chain
       AND (NOT bbox OR (l.latitude BETWEEN p_min_lat AND p_max_lat AND
            CASE WHEN NOT wrap THEN l.longitude BETWEEN p_min_lng AND p_max_lng ELSE (l.longitude >= p_min_lng OR l.longitude <= p_max_lng) END))
       AND (cat IS NULL OR l.category = cat)
       AND (pat IS NULL OR l.name ILIKE pat OR l.city ILIKE pat)
     ORDER BY CASE WHEN by_dist THEN (l.latitude - clat)^2 + (((l.longitude - clng + 540)::numeric % 360 - 180)::double precision * kx)^2 ELSE 0 END, l.name, l.slug
     LIMIT greatest(lim + off, 40)
  ), pos AS (
    SELECT c.*, row_number() OVER (ORDER BY c.dist, c.name, c.slug) AS p FROM cand c
  ), lst AS (
    SELECT 'listing'::text AS kind, x.slug, x.name, x.category, x.city, x.region, x.country, x.latitude AS lat, x.longitude AS lng,
           false AS is_pro, false AS is_verified, false AS has_reward, NULL::text AS reward_text, NULL::text AS logo_url, 2 AS rank,
           CASE WHEN by_dist AND x.p <= 40 THEN x.rr * 100 + x.p ELSE 100000 + x.p END AS ord
      FROM (SELECT pos.*, row_number() OVER (PARTITION BY pos.p <= 40, pos.category ORDER BY pos.p) AS rr FROM pos) x
  )
  SELECT u.kind, u.slug, u.name, u.category, u.city, u.region, u.country, u.lat, u.lng,
         u.is_pro, u.is_verified, u.has_reward, u.reward_text, u.logo_url, total
    FROM (SELECT * FROM biz UNION ALL SELECT * FROM lst) u
   ORDER BY CASE WHEN by_name THEN 0 ELSE u.rank END,
            CASE WHEN by_name THEN 0 ELSE u.ord END, u.name, u.slug
   LIMIT lim OFFSET off;
END $function$;

CREATE OR REPLACE FUNCTION public.fn_directory_rows()
 RETURNS TABLE(kind text, slug text, name text, category text, city text, region text, country text, lat double precision, lng double precision, is_pro boolean, is_verified boolean, has_reward boolean, reward_text text, logo_url text, rank integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT 'business', b.slug, b.name, coalesce(nullif(b.category,''),'Other'),
         coalesce(nullif(btrim(b.city),''), nullif(btrim(split_part(b.service_area, ',', 1)),'')),
         coalesce(nullif(btrim(b.state),''), CASE WHEN btrim(split_part(b.service_area, ',', 2)) ~ '^[A-Za-z]{2}$' THEN upper(btrim(split_part(b.service_area, ',', 2))) END),
         public.fn_directory_country(b.country),
         b.latitude, b.longitude,
         public.fn_plan_is_pro(b.plan, b.pro_trial_ends_at),
         coalesce(b.is_verified, false),
         (NOT public.fn_directory_regulated(b.category) AND nullif(btrim(coalesce(b.offer_amount,'')),'') IS NOT NULL),
         CASE WHEN public.fn_directory_regulated(b.category) THEN NULL ELSE left(nullif(btrim(coalesce(b.offer_amount,'')),''), 80) END,
         b.logo_url,
         CASE WHEN public.fn_plan_is_pro(b.plan, b.pro_trial_ends_at) THEN 0 ELSE 1 END
    FROM public.businesses b
   WHERE public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
     AND coalesce(b.marketplace_listed, false)
     AND NOT coalesce(b.is_demo, false)
     AND NOT coalesce(b.is_internal, false)
     AND b.slug IS NOT NULL
  UNION ALL
  SELECT 'listing', l.slug, l.name, l.category, l.city, l.region, l.country, l.latitude, l.longitude,
         false, false, false, NULL::text, NULL::text, 2
    FROM public.directory_listings l
   WHERE l.status = 'unclaimed' AND NOT l.is_chain
$function$;

SELECT public.fn_directory_flag_chains();