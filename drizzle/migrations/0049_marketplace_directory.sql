-- Marketplace directory: unclaimed listings, internal-account flag, removal requests,
-- a server-only geocode cache and safe public read functions.

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;
UPDATE public.businesses SET is_internal = true
 WHERE name IN ('Karm Personal Test', 'QA Test Plumbing', 'Revvin Internal Test Roofing');

CREATE TABLE IF NOT EXISTS public.directory_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND length(slug) <= 100),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  category text NOT NULL DEFAULT 'Other',
  city text,
  region text,
  country text NOT NULL CHECK (country IN ('US','CA')),
  postal_code text,
  latitude double precision CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision CHECK (longitude BETWEEN -180 AND 180),
  phone text,
  website text,
  source text NOT NULL,
  source_id text NOT NULL,
  source_license text,
  status text NOT NULL DEFAULT 'unclaimed' CHECK (status IN ('unclaimed','claimed','removed')),
  claimed_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);
CREATE INDEX IF NOT EXISTS directory_listings_place_idx ON public.directory_listings (country, region, city);
CREATE INDEX IF NOT EXISTS directory_listings_category_idx ON public.directory_listings (category);
CREATE INDEX IF NOT EXISTS directory_listings_latlng_idx ON public.directory_listings (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
GRANT ALL ON public.directory_listings TO service_role;
ALTER TABLE public.directory_listings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.directory_removal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.directory_listings(id) ON DELETE CASCADE,
  requester_name text NOT NULL,
  email text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.directory_removal_requests TO service_role;
ALTER TABLE public.directory_removal_requests ENABLE ROW LEVEL SECURITY;

-- City-level geocode results, so the same place is only looked up once.
CREATE TABLE IF NOT EXISTS public.geocode_cache (
  query_key text PRIMARY KEY,
  latitude double precision,
  longitude double precision,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.geocode_cache TO service_role;
ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_directory_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_catalog AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_directory_listings_touch ON public.directory_listings;
CREATE TRIGGER trg_directory_listings_touch BEFORE UPDATE ON public.directory_listings FOR EACH ROW EXECUTE FUNCTION public.fn_directory_touch();

-- Regulated categories: profile shown, reward hidden. Mirrors directoryRegulated in src/lib/directory.ts.
CREATE OR REPLACE FUNCTION public.fn_directory_regulated(p_category text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT regexp_replace(lower(coalesce(p_category,'')), '[^a-z]', '', 'g') IN ('realestate','mortgage','insurance')
$$;

CREATE OR REPLACE FUNCTION public.fn_directory_country(p_raw text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT CASE WHEN upper(btrim(coalesce(p_raw,''))) IN ('US','USA','UNITED STATES','UNITED STATES OF AMERICA') THEN 'US'
              WHEN upper(btrim(coalesce(p_raw,''))) IN ('CA','CAN','CANADA') THEN 'CA' ELSE NULL END
$$;

-- One row per directory entry with only public, safe columns.
CREATE OR REPLACE FUNCTION public.fn_directory_rows()
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
     AND b.slug IS NOT NULL
  UNION ALL
  SELECT 'listing', l.slug, l.name, l.category, l.city, l.region, l.country, l.latitude, l.longitude,
         false, false, false, NULL::text, NULL::text, 2
    FROM public.directory_listings l
   WHERE l.status = 'unclaimed'
$$;
REVOKE ALL ON FUNCTION public.fn_directory_rows() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_directory_search(
  p_min_lat double precision DEFAULT NULL, p_min_lng double precision DEFAULT NULL,
  p_max_lat double precision DEFAULT NULL, p_max_lng double precision DEFAULT NULL,
  p_category text DEFAULT NULL, p_q text DEFAULT NULL, p_region text DEFAULT NULL,
  p_country text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS TABLE(kind text, slug text, name text, category text, city text, region text, country text,
              lat double precision, lng double precision, is_pro boolean, is_verified boolean,
              has_reward boolean, reward_text text, logo_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE bbox boolean := p_min_lat IS NOT NULL AND p_min_lng IS NOT NULL AND p_max_lat IS NOT NULL AND p_max_lng IS NOT NULL;
        q text := nullif(btrim(left(coalesce(p_q,''), 80)), '');
        pat text;
BEGIN
  IF bbox AND (p_min_lat NOT BETWEEN -90 AND 90 OR p_max_lat NOT BETWEEN -90 AND 90 OR p_min_lng NOT BETWEEN -180 AND 180 OR p_max_lng NOT BETWEEN -180 AND 180 OR p_min_lat > p_max_lat) THEN
    RAISE EXCEPTION 'invalid_bbox';
  END IF;
  IF p_country IS NOT NULL AND p_country NOT IN ('US','CA') THEN RAISE EXCEPTION 'invalid_country'; END IF;
  IF length(coalesce(p_category,'')) > 60 OR length(coalesce(p_region,'')) > 40 THEN RAISE EXCEPTION 'invalid_filter'; END IF;
  IF q IS NOT NULL THEN pat := '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%'; END IF;
  RETURN QUERY
  SELECT r.kind, r.slug, r.name, r.category, r.city, r.region, r.country, r.lat, r.lng,
         r.is_pro, r.is_verified, r.has_reward, r.reward_text, r.logo_url
    FROM public.fn_directory_rows() r
   WHERE (NOT bbox OR (r.lat BETWEEN p_min_lat AND p_max_lat AND
          CASE WHEN p_min_lng <= p_max_lng THEN r.lng BETWEEN p_min_lng AND p_max_lng ELSE (r.lng >= p_min_lng OR r.lng <= p_max_lng) END))
     AND (nullif(p_category,'') IS NULL OR lower(r.category) = lower(p_category))
     AND (nullif(p_region,'') IS NULL OR upper(r.region) = upper(p_region))
     AND (p_country IS NULL OR r.country = p_country)
     AND (pat IS NULL OR r.name ILIKE pat OR r.city ILIKE pat)
   ORDER BY r.rank, r.name, r.slug
   LIMIT least(greatest(coalesce(p_limit, 50), 1), 200)
  OFFSET least(greatest(coalesce(p_offset, 0), 0), 10000);
END $$;

CREATE OR REPLACE FUNCTION public.fn_directory_clusters(
  p_min_lat double precision, p_min_lng double precision, p_max_lat double precision, p_max_lng double precision,
  p_zoom int DEFAULT 3, p_category text DEFAULT NULL)
RETURNS TABLE(lat double precision, lng double precision, count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE cell double precision;
BEGIN
  IF p_min_lat IS NULL OR p_max_lat IS NULL OR p_min_lng IS NULL OR p_max_lng IS NULL
     OR p_min_lat NOT BETWEEN -90 AND 90 OR p_max_lat NOT BETWEEN -90 AND 90
     OR p_min_lng NOT BETWEEN -180 AND 180 OR p_max_lng NOT BETWEEN -180 AND 180 OR p_min_lat > p_max_lat THEN
    RAISE EXCEPTION 'invalid_bbox';
  END IF;
  IF length(coalesce(p_category,'')) > 60 THEN RAISE EXCEPTION 'invalid_filter'; END IF;
  -- About four cells across each map tile at this zoom.
  cell := 90.0 / power(2, least(greatest(coalesce(p_zoom, 3), 0), 20));
  RETURN QUERY
  SELECT avg(r.lat), avg(r.lng), count(*)
    FROM public.fn_directory_rows() r
   WHERE r.lat IS NOT NULL AND r.lng IS NOT NULL
     AND r.lat BETWEEN p_min_lat AND p_max_lat
     AND CASE WHEN p_min_lng <= p_max_lng THEN r.lng BETWEEN p_min_lng AND p_max_lng ELSE (r.lng >= p_min_lng OR r.lng <= p_max_lng) END
     AND (nullif(p_category,'') IS NULL OR lower(r.category) = lower(p_category))
   GROUP BY floor(r.lat / cell), floor(r.lng / cell)
   ORDER BY count(*) DESC
   LIMIT 400;
END $$;

CREATE OR REPLACE FUNCTION public.fn_directory_listing(p_slug text)
RETURNS TABLE(slug text, name text, category text, city text, region text, country text, postal_code text,
              lat double precision, lng double precision, phone text, website text, source text,
              source_license text, status text, claimed_slug text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' OR length(p_slug) > 100 THEN RETURN; END IF;
  RETURN QUERY
  SELECT l.slug, l.name, l.category, l.city, l.region, l.country, l.postal_code, l.latitude, l.longitude,
         CASE WHEN l.status = 'unclaimed' THEN l.phone END,
         CASE WHEN l.status = 'unclaimed' THEN l.website END,
         l.source, l.source_license, l.status,
         (SELECT b.slug FROM public.businesses b WHERE b.id = l.claimed_business_id
             AND public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
             AND NOT coalesce(b.is_demo,false) AND NOT coalesce(b.is_internal,false))
    FROM public.directory_listings l
   WHERE l.slug = p_slug AND l.status <> 'removed'
   LIMIT 1;
END $$;

-- The signed-in owner of a business that signed up from this listing's page claims it.
CREATE OR REPLACE FUNCTION public.fn_directory_claim(p_slug text, p_business_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE l public.directory_listings%ROWTYPE; b public.businesses%ROWTYPE;
BEGIN
  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' OR length(p_slug) > 100 THEN RAISE EXCEPTION 'not_found'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = p_business_id;
  IF b.id IS NULL OR b.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF coalesce(b.acquisition ->> 'landing_path', '') IS DISTINCT FROM '/b/' || p_slug THEN RAISE EXCEPTION 'code_mismatch'; END IF;
  SELECT * INTO l FROM public.directory_listings WHERE slug = p_slug FOR UPDATE;
  IF l.id IS NULL OR l.status <> 'unclaimed' THEN RAISE EXCEPTION 'not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.directory_listings WHERE claimed_business_id = b.id) THEN RAISE EXCEPTION 'already_claimed'; END IF;
  UPDATE public.directory_listings SET status = 'claimed', claimed_business_id = b.id WHERE id = l.id;
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'to', 'info@revvin.co', 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
    'subject', 'Directory listing claimed',
    'text', 'A directory listing was claimed by a new business. Listing: /b/' || l.slug,
    'html', '<p>A directory listing was claimed by a new business. Listing: /b/' || l.slug || '</p>',
    'purpose', 'transactional', 'label', 'directory_claimed',
    'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'idempotency_key', 'directory_claimed:' || l.id::text, 'message_id', gen_random_uuid()::text));
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.fn_directory_html(p text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT replace(replace(replace(replace(coalesce(p,''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

CREATE OR REPLACE FUNCTION public.fn_directory_request_removal(p_slug text, p_name text, p_email text, p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE l public.directory_listings%ROWTYPE; nm text := btrim(coalesce(p_name,'')); em text := lower(btrim(coalesce(p_email,''))); rs text := nullif(btrim(coalesce(p_reason,'')),'');
BEGIN
  IF length(nm) NOT BETWEEN 1 AND 120 OR length(em) NOT BETWEEN 3 AND 254 OR em !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR length(coalesce(rs,'')) > 1000 THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;
  IF NOT public.fn_rate_bucket_hit('directory_removal:' || public.fn_request_bucket(), interval '1 hour', 3)
     OR NOT public.fn_rate_bucket_hit('directory_removal:global', interval '1 hour', 100) THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  SELECT * INTO l FROM public.directory_listings WHERE slug = p_slug AND status = 'unclaimed' LIMIT 1;
  IF l.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  INSERT INTO public.directory_removal_requests(listing_id, requester_name, email, reason) VALUES (l.id, nm, em, rs);
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'to', 'info@revvin.co', 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
    'subject', 'Removal request: ' || left(l.name, 120),
    'text', 'Removal requested for ' || l.name || ' (/b/' || l.slug || ') by ' || nm || ' <' || em || '>. Reason: ' || coalesce(rs, 'none given'),
    'html', '<p>Removal requested for ' || public.fn_directory_html(l.name) || ' (/b/' || l.slug || ')</p><p>From: ' || public.fn_directory_html(nm) || ' &lt;' || public.fn_directory_html(em) || '&gt;</p><p>Reason: ' || public.fn_directory_html(coalesce(rs, 'none given')) || '</p>',
    'purpose', 'transactional', 'label', 'directory_removal_requested',
    'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'idempotency_key', 'directory_removal:' || gen_random_uuid()::text, 'message_id', gen_random_uuid()::text));
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.fn_directory_slug_base(p_name text, p_city text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT coalesce(nullif(left(btrim(regexp_replace(lower(coalesce(p_name,'') || ' ' || coalesce(p_city,'')), '[^a-z0-9]+', '-', 'g'), '-'), 80), ''), 'business')
$$;

-- Service-only batch upsert. Rows are validated by the directory-import function first.
CREATE OR REPLACE FUNCTION public.fn_directory_import(p_rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
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
  RETURN jsonb_build_object('inserted', ins, 'updated', upd);
END $$;

REVOKE ALL ON FUNCTION public.fn_directory_search(double precision,double precision,double precision,double precision,text,text,text,text,int,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_directory_clusters(double precision,double precision,double precision,double precision,int,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_directory_listing(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_directory_claim(text,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_directory_request_removal(text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_directory_import(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_directory_search(double precision,double precision,double precision,double precision,text,text,text,text,int,int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_directory_clusters(double precision,double precision,double precision,double precision,int,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_directory_listing(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_directory_claim(text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_directory_request_removal(text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_directory_import(jsonb) TO service_role;