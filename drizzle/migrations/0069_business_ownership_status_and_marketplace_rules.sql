ALTER TABLE public.businesses
  ADD COLUMN ownership_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN ownership_method text,
  ADD COLUMN ownership_verified_at timestamptz;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_ownership_status_check CHECK (ownership_status IN ('pending','verified','rejected','disputed')),
  ADD CONSTRAINT businesses_ownership_method_check CHECK (ownership_method IS NULL OR ownership_method IN ('domain_email','document','admin','grandfathered'));

-- The owner has personally contacted every business present at this migration.
UPDATE public.businesses
SET ownership_status = 'verified',
    ownership_method = 'grandfathered',
    ownership_verified_at = now(),
    is_verified = true,
    verified = true;

COMMENT ON COLUMN public.businesses.is_verified IS 'Legacy public trust flag. Mirrors ownership_status = verified; owners cannot set it directly.';
COMMENT ON COLUMN public.businesses.verified IS 'Legacy admin trust flag. Mirrors ownership_status = verified; use ownership_status for new logic.';

CREATE OR REPLACE FUNCTION public.fn_guard_is_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
BEGIN
  IF coalesce(auth.role(),'') = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF current_setting('revvin.ownership_internal', true) = 'on' THEN
    NEW.is_verified := NEW.ownership_status = 'verified';
    NEW.verified := NEW.ownership_status = 'verified';
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_verified := false;
    NEW.verified := false;
    NEW.index_approved := false;
    NEW.ownership_status := 'pending';
    NEW.ownership_method := NULL;
    NEW.ownership_verified_at := NULL;
    RETURN NEW;
  END IF;
  IF NEW.ownership_status IS DISTINCT FROM OLD.ownership_status
     OR NEW.ownership_method IS DISTINCT FROM OLD.ownership_method
     OR NEW.ownership_verified_at IS DISTINCT FROM OLD.ownership_verified_at THEN
    RAISE EXCEPTION 'Ownership confirmation must use the ownership review flow';
  END IF;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified OR NEW.verified IS DISTINCT FROM OLD.verified OR NEW.index_approved IS DISTINCT FROM OLD.index_approved THEN
    IF NOT public.has_role(auth.uid(),'admin') OR OLD.user_id = auth.uid() THEN
      RAISE EXCEPTION 'Only a super admin can change verification or indexing';
    END IF;
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified OR NEW.verified IS DISTINCT FROM OLD.verified THEN
      NEW.ownership_status := CASE WHEN NEW.is_verified AND coalesce(NEW.verified, false) THEN 'verified' ELSE 'pending' END;
      NEW.ownership_method := CASE WHEN NEW.ownership_status = 'verified' THEN 'admin' ELSE NULL END;
      NEW.ownership_verified_at := CASE WHEN NEW.ownership_status = 'verified' THEN now() ELSE NULL END;
      NEW.is_verified := NEW.ownership_status = 'verified';
      NEW.verified := NEW.ownership_status = 'verified';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.fn_directory_business_rows()
RETURNS TABLE(kind text, slug text, name text, category text, city text, region text, country text, lat double precision, lng double precision, is_pro boolean, is_verified boolean, has_reward boolean, reward_text text, logo_url text, rank integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
  SELECT 'business', b.slug, b.name, coalesce(nullif(b.category,''),'Other'),
         coalesce(nullif(btrim(b.city),''), nullif(btrim(split_part(b.service_area, ',', 1)),'')),
         coalesce(nullif(btrim(b.state),''), CASE WHEN btrim(split_part(b.service_area, ',', 2)) ~ '^[A-Za-z]{2}$' THEN upper(btrim(split_part(b.service_area, ',', 2))) END),
         public.fn_directory_country(b.country),
         b.latitude, b.longitude,
         public.fn_plan_is_pro(b.plan, b.pro_trial_ends_at),
         b.ownership_status = 'verified',
         (b.ownership_status = 'verified' AND NOT public.fn_directory_regulated(b.category) AND nullif(btrim(coalesce(b.offer_amount,'')),'') IS NOT NULL),
         CASE WHEN b.ownership_status = 'verified' AND NOT public.fn_directory_regulated(b.category) THEN left(nullif(btrim(coalesce(b.offer_amount,'')),''), 80) END,
         b.logo_url,
         CASE WHEN b.ownership_status <> 'verified' THEN 2 WHEN public.fn_plan_is_pro(b.plan, b.pro_trial_ends_at) THEN 0 ELSE 1 END
    FROM public.businesses b
   WHERE public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
     AND coalesce(b.marketplace_listed, false)
     AND NOT coalesce(b.is_demo, false)
     AND NOT coalesce(b.is_internal, false)
     AND b.slug IS NOT NULL;
$function$;

CREATE OR REPLACE FUNCTION public.fn_directory_rows()
RETURNS TABLE(kind text, slug text, name text, category text, city text, region text, country text, lat double precision, lng double precision, is_pro boolean, is_verified boolean, has_reward boolean, reward_text text, logo_url text, rank integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
  SELECT kind, slug, name, category, city, region, country, lat, lng, is_pro, is_verified, has_reward, reward_text, logo_url, rank
    FROM public.fn_directory_business_rows()
  UNION ALL
  SELECT 'listing', l.slug, l.name, l.category, l.city, l.region, l.country, l.latitude, l.longitude,
         false, false, false, NULL::text, NULL::text, 3
    FROM public.directory_listings l
   WHERE l.status = 'unclaimed' AND NOT l.is_chain
$function$;

CREATE OR REPLACE FUNCTION public.fn_directory_map_search(
  p_min_lat double precision DEFAULT NULL, p_min_lng double precision DEFAULT NULL,
  p_max_lat double precision DEFAULT NULL, p_max_lng double precision DEFAULT NULL,
  p_category text DEFAULT NULL, p_q text DEFAULT NULL, p_rewards_only boolean DEFAULT false,
  p_sort text DEFAULT 'featured', p_limit integer DEFAULT 40, p_offset integer DEFAULT 0)
RETURNS TABLE(kind text, slug text, name text, category text, city text, region text, country text, lat double precision, lng double precision, is_pro boolean, is_verified boolean, has_reward boolean, reward_text text, logo_url text, total_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'extensions', 'pg_catalog'
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
           false AS is_pro, false AS is_verified, false AS has_reward, NULL::text AS reward_text, NULL::text AS logo_url, 3 AS rank,
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

CREATE OR REPLACE FUNCTION public.fn_quote_candidates(p_trade text, p_lat double precision, p_lng double precision, p_limit integer DEFAULT 3)
RETURNS TABLE(id uuid, slug text, name text, city text, region text, is_pro boolean, review_count bigint, rating_avg numeric, km double precision, business_email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
  SELECT x.id, x.slug, x.name, x.city, x.region, x.is_pro, x.rc, x.ra, x.km, x.business_email FROM (
    SELECT b.id, b.slug, b.name,
           coalesce(nullif(btrim(b.city), ''), nullif(btrim(split_part(b.service_area, ',', 1)), '')) AS city, nullif(btrim(b.state), '') AS region,
           coalesce(public.fn_plan_is_pro(b.plan, b.pro_trial_ends_at), false) AS is_pro,
           (SELECT count(*) FROM public.business_reviews r WHERE r.business_id = b.id AND r.status = 'published') AS rc,
           (SELECT round(avg(r.rating)::numeric, 2) FROM public.business_reviews r WHERE r.business_id = b.id AND r.status = 'published') AS ra,
           public.fn_quote_km(p_lat, p_lng, b.latitude, b.longitude) AS km, b.business_email
      FROM public.businesses b
     WHERE p_trade IS NOT NULL AND NOT public.fn_directory_regulated(p_trade)
       AND b.ownership_status = 'verified'
       AND lower(coalesce(b.category, '')) = lower(p_trade)
       AND public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
       AND coalesce(b.marketplace_listed, false) AND NOT coalesce(b.is_demo, false) AND NOT coalesce(b.is_internal, false)
       AND b.slug IS NOT NULL AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL
       AND b.latitude BETWEEN p_lat - 0.6 AND p_lat + 0.6
  ) x
  WHERE x.km <= 60
  ORDER BY x.is_pro DESC, (x.rc > 0) DESC, x.km, x.name
  LIMIT least(greatest(coalesce(p_limit, 3), 1), 3)
$function$;

CREATE OR REPLACE FUNCTION public.fn_quote_deliver_saved(p_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
DECLARE b public.businesses%ROWTYPE; q record; n int := 0;
BEGIN
  SELECT * INTO b FROM public.businesses WHERE id = p_business_id;
  IF b.id IS NULL OR b.latitude IS NULL OR b.longitude IS NULL OR b.slug IS NULL
     OR b.ownership_status <> 'verified'
     OR NOT public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
     OR NOT coalesce(b.marketplace_listed, false) OR coalesce(b.is_demo, false) OR coalesce(b.is_internal, false)
     OR public.fn_directory_regulated(b.category) THEN RETURN 0; END IF;
  FOR q IN SELECT m.* FROM public.marketplace_quote_broadcasts m
     WHERE m.share_later_consent AND m.created_at > now() - interval '14 days'
       AND lower(m.trade) = lower(coalesce(b.category, ''))
       AND public.fn_quote_km(m.lat, m.lng, b.latitude, b.longitude) <= 60
       AND (SELECT count(*) FROM public.quote_requests r WHERE r.broadcast_id = m.id) < 3
       AND NOT EXISTS (SELECT 1 FROM public.quote_requests r WHERE r.broadcast_id = m.id AND r.business_id = b.id)
      ORDER BY m.created_at LOOP
    IF public.fn_quote_deliver_one(q.id, b.id) THEN
      n := n + 1;
      UPDATE public.marketplace_quote_broadcasts SET matched_count = matched_count + 1 WHERE id = q.id;
      PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
        'to', q.email, 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
        'subject', 'A ' || q.trade || ' business received your request',
        'text', 'Hi ' || q.name || E',\n\nYou asked us to share your ' || q.trade || ' request with local businesses that join Revvin. ' || b.name || ' just received it: https://revvin.co/b/' || b.slug || E'\n\nThey will reply to you directly.',
        'html', '<p>Hi ' || public.fn_directory_html(q.name) || ',</p><p>You asked us to share your ' || public.fn_directory_html(q.trade) || ' request with local businesses that join Revvin. <a href="https://revvin.co/b/' || public.fn_directory_html(b.slug) || '">' || public.fn_directory_html(b.name) || '</a> just received it.</p><p>They will reply to you directly.</p>',
        'purpose', 'transactional', 'label', 'quote_broadcast_later_delivery',
        'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'idempotency_key', 'quote_later:' || q.id::text || ':' || b.id::text, 'message_id', gen_random_uuid()::text));
    END IF;
  END LOOP;
  RETURN n;
END $function$;

CREATE OR REPLACE FUNCTION public.fn_directory_card_trust(p_slugs text[])
RETURNS TABLE(slug text, review_count bigint, rating_avg numeric, has_license boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $function$
  SELECT b.slug,
         (SELECT count(*) FROM public.business_reviews r WHERE r.business_id = b.id AND r.status = 'published'),
         (SELECT round(avg(r.rating)::numeric, 2) FROM public.business_reviews r WHERE r.business_id = b.id AND r.status = 'published'),
         public.fn_plan_is_pro(b.plan, b.pro_trial_ends_at) AND nullif(btrim(coalesce(b.license_number, '')), '') IS NOT NULL
    FROM public.businesses b
   WHERE b.slug = ANY (p_slugs[1:100]) AND b.ownership_status = 'verified'
     AND public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
     AND coalesce(b.marketplace_listed, false) AND NOT coalesce(b.is_demo, false) AND NOT coalesce(b.is_internal, false)
$function$;

CREATE OR REPLACE FUNCTION public.fn_business_profile(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
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
    'is_pro', pro, 'is_verified', b.ownership_status = 'verified', 'ownership_status', b.ownership_status,
    'index_approved', coalesce(b.index_approved,false),
    'has_reward', (NOT public.fn_directory_regulated(b.category) AND nullif(btrim(coalesce(b.offer_amount,'')),'') IS NOT NULL),
    'reward_text', CASE WHEN public.fn_directory_regulated(b.category) THEN NULL ELSE left(nullif(btrim(coalesce(b.offer_amount,'')),''), 80) END,
    'photos', photos, 'reviews', stats, 'is_owner_preview', owner AND (NOT public.fn_page_live(b.account_status, b.is_published, b.is_disabled) OR coalesce(b.is_internal,false) OR coalesce(b.is_demo,false)));
END $function$;