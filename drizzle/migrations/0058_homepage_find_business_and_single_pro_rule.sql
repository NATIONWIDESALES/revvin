CREATE OR REPLACE FUNCTION public.fn_plan_is_pro(p_plan text, p_trial_ends_at timestamptz)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_catalog AS $$
  SELECT coalesce(p_plan = 'pro', false) OR coalesce(p_trial_ends_at > now(), false)
$$;
REVOKE ALL ON FUNCTION public.fn_plan_is_pro(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_plan_is_pro(text, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_business_is_pro(p_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT coalesce((SELECT public.fn_plan_is_pro(b.plan, b.pro_trial_ends_at) FROM public.businesses b WHERE b.id = p_business_id), false)
$$;

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
   WHERE l.status = 'unclaimed'
$function$;

CREATE OR REPLACE FUNCTION public.fn_business_profile(p_slug text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE b public.businesses%ROWTYPE; pro boolean; owner boolean; photos jsonb; stats jsonb;
BEGIN
  IF p_slug IS NULL OR length(p_slug) > 100 THEN RETURN NULL; END IF;
  SELECT * INTO b FROM public.businesses WHERE slug = lower(p_slug) LIMIT 1;
  IF b.id IS NULL THEN RETURN NULL; END IF;
  owner := b.user_id = auth.uid();
  IF NOT owner AND (NOT public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
     OR coalesce(b.is_internal,false) OR coalesce(b.is_demo,false)) THEN RETURN NULL; END IF;
  pro := public.fn_plan_is_pro(b.plan, b.pro_trial_ends_at);
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'path', p.storage_path, 'caption', p.caption) ORDER BY p.sort_order, p.created_at), '[]'::jsonb)
    INTO photos FROM (SELECT * FROM public.business_photos WHERE business_id = b.id ORDER BY sort_order, created_at LIMIT CASE WHEN pro THEN 30 ELSE 3 END) p;
  SELECT jsonb_build_object('count', count(*), 'avg', round(avg(rating)::numeric, 2),
           'r1', count(*) FILTER (WHERE rating=1), 'r2', count(*) FILTER (WHERE rating=2), 'r3', count(*) FILTER (WHERE rating=3),
           'r4', count(*) FILTER (WHERE rating=4), 'r5', count(*) FILTER (WHERE rating=5))
    INTO stats FROM public.business_reviews WHERE business_id = b.id AND status = 'published';
  RETURN jsonb_build_object(
    'slug', b.slug, 'name', b.name, 'category', coalesce(nullif(b.category,''),'Other'), 'description', b.description,
    'logo_url', b.logo_url, 'cover_image_url', CASE WHEN pro THEN b.cover_image_url END,
    'service_area', b.service_area, 'website', b.website, 'phone', b.phone, 'city', b.city, 'state', b.state,
    'country', public.fn_directory_country(b.country), 'lat', b.latitude, 'lng', b.longitude,
    'google_review_url', b.google_review_url, 'hours', b.hours,
    'services', CASE WHEN pro THEN b.services END, 'founded_year', CASE WHEN pro THEN b.founded_year END,
    'license_number', CASE WHEN pro THEN b.license_number END, 'social_links', CASE WHEN pro THEN b.social_links END,
    'is_pro', pro, 'is_verified', coalesce(b.is_verified,false), 'index_approved', coalesce(b.index_approved,false),
    'has_reward', (NOT public.fn_directory_regulated(b.category) AND nullif(btrim(coalesce(b.offer_amount,'')),'') IS NOT NULL),
    'reward_text', CASE WHEN public.fn_directory_regulated(b.category) THEN NULL ELSE left(nullif(btrim(coalesce(b.offer_amount,'')),''), 80) END,
    'photos', photos, 'reviews', stats, 'is_owner_preview', owner AND (NOT public.fn_page_live(b.account_status, b.is_published, b.is_disabled) OR coalesce(b.is_internal,false) OR coalesce(b.is_demo,false)));
END $function$;

CREATE OR REPLACE FUNCTION public.fn_directory_find(p_name text, p_city text DEFAULT NULL, p_limit int DEFAULT 6)
RETURNS TABLE(id uuid, slug text, name text, category text, city text, region text, claimed boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_catalog AS $$
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
     WHERE l.status = 'unclaimed' AND l.name ILIKE pat
       AND (cpat IS NULL OR l.city ILIKE cpat)
  ) x ORDER BY x.claimed DESC, x.sim DESC, x.name LIMIT n;
END $$;
REVOKE ALL ON FUNCTION public.fn_directory_find(text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_directory_find(text, text, int) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_directory_public_count()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT (SELECT count(*) FROM public.directory_listings WHERE status = 'unclaimed')
       + (SELECT count(*) FROM public.businesses b
           WHERE public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
             AND NOT coalesce(b.is_demo, false) AND NOT coalesce(b.is_internal, false) AND b.slug IS NOT NULL)
$$;
REVOKE ALL ON FUNCTION public.fn_directory_public_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_directory_public_count() TO anon, authenticated, service_role;