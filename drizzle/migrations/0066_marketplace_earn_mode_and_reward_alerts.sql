CREATE OR REPLACE FUNCTION public.fn_reward_dollars(p_text text) RETURNS numeric
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT CASE WHEN p_text ~* '^\s*(us)?\$?\s*[0-9][0-9,]*(\.[0-9]+)?\s*(usd|dollars)?\s*$'
    THEN replace(substring(p_text from '[0-9][0-9,]*(?:\.[0-9]+)?'), ',', '')::numeric END
$$;

CREATE OR REPLACE FUNCTION public.fn_directory_earn_search(
  p_min_lat double precision DEFAULT NULL, p_min_lng double precision DEFAULT NULL,
  p_max_lat double precision DEFAULT NULL, p_max_lng double precision DEFAULT NULL,
  p_category text DEFAULT NULL, p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL,
  p_order text DEFAULT 'reward', p_limit integer DEFAULT 40, p_offset integer DEFAULT 0)
RETURNS TABLE(kind text, slug text, name text, category text, city text, region text, country text, lat double precision, lng double precision,
              is_pro boolean, is_verified boolean, has_reward boolean, reward_text text, logo_url text, distance_km double precision, total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE bbox boolean := p_min_lat IS NOT NULL AND p_min_lng IS NOT NULL AND p_max_lat IS NOT NULL AND p_max_lng IS NOT NULL;
        wrap boolean; cat text := nullif(p_category, '');
        lim int := least(greatest(coalesce(p_limit, 40), 1), 100);
        off int := least(greatest(coalesce(p_offset, 0), 0), 5000);
        clat double precision := p_lat; clng double precision := p_lng;
BEGIN
  IF bbox AND (p_min_lat NOT BETWEEN -90 AND 90 OR p_max_lat NOT BETWEEN -90 AND 90 OR p_min_lng NOT BETWEEN -180 AND 180 OR p_max_lng NOT BETWEEN -180 AND 180 OR p_min_lat > p_max_lat) THEN
    RAISE EXCEPTION 'invalid_bbox';
  END IF;
  IF length(coalesce(p_category, '')) > 60 OR coalesce(p_order, 'reward') NOT IN ('reward', 'distance')
     OR (clat IS NOT NULL AND clat NOT BETWEEN -90 AND 90) OR (clng IS NOT NULL AND clng NOT BETWEEN -180 AND 180) THEN
    RAISE EXCEPTION 'invalid_filter';
  END IF;
  wrap := bbox AND p_min_lng > p_max_lng;
  IF clat IS NULL AND bbox THEN
    clat := (p_min_lat + p_max_lat) / 2;
    clng := CASE WHEN wrap THEN ((p_min_lng + p_max_lng + 360) / 2) ELSE (p_min_lng + p_max_lng) / 2 END;
    IF clng > 180 THEN clng := clng - 360; END IF;
  END IF;
  RETURN QUERY
  WITH r AS (
    SELECT b.*, public.fn_reward_dollars(b.reward_text) AS dollars,
           CASE WHEN clat IS NULL OR clng IS NULL OR b.lat IS NULL OR b.lng IS NULL THEN NULL
                ELSE 6371 * 2 * asin(least(1, sqrt(power(sin(radians(b.lat - clat) / 2), 2)
                     + cos(radians(clat)) * cos(radians(b.lat)) * power(sin(radians(b.lng - clng) / 2), 2)))) END AS km
      FROM public.fn_directory_business_rows() b
     WHERE b.has_reward AND NOT public.fn_directory_regulated(b.category)
       AND (NOT bbox OR (b.lat BETWEEN p_min_lat AND p_max_lat AND
            CASE WHEN NOT wrap THEN b.lng BETWEEN p_min_lng AND p_max_lng ELSE (b.lng >= p_min_lng OR b.lng <= p_max_lng) END))
       AND (cat IS NULL OR lower(b.category) = lower(cat))
  )
  SELECT r.kind, r.slug, r.name, r.category, r.city, r.region, r.country, r.lat, r.lng, r.is_pro, r.is_verified,
         r.has_reward, r.reward_text, r.logo_url, r.km, count(*) OVER ()
    FROM r
   ORDER BY CASE WHEN coalesce(p_order, 'reward') = 'reward' THEN r.dollars END DESC NULLS LAST,
            r.km NULLS LAST, r.name, r.slug
   LIMIT lim OFFSET off;
END $$;

CREATE OR REPLACE FUNCTION public.fn_directory_nearest_city(p_lat double precision, p_lng double precision) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT x.city FROM (
    SELECT split_part(l.city, ',', 1) AS city FROM public.directory_listings l
     WHERE p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180
       AND l.latitude BETWEEN p_lat - 0.15 AND p_lat + 0.15 AND l.longitude BETWEEN p_lng - 0.2 AND p_lng + 0.2
       AND nullif(btrim(l.city), '') IS NOT NULL
     ORDER BY (l.latitude - p_lat)^2 + ((l.longitude - p_lng) * cos(radians(p_lat)))^2
     LIMIT 25) x
   GROUP BY x.city ORDER BY count(*) DESC, x.city LIMIT 1
$$;

CREATE TABLE public.marketplace_reward_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  lat numeric(5,2) NOT NULL,
  lng numeric(6,2) NOT NULL,
  city text,
  trade text,
  visitor_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz
);
CREATE UNIQUE INDEX marketplace_reward_alerts_email_spot ON public.marketplace_reward_alerts (lower(email), lat, lng);
CREATE INDEX marketplace_reward_alerts_visitor_time ON public.marketplace_reward_alerts (visitor_hash, created_at);
CREATE INDEX marketplace_reward_alerts_city ON public.marketplace_reward_alerts (lower(city));
GRANT ALL ON public.marketplace_reward_alerts TO service_role;
ALTER TABLE public.marketplace_reward_alerts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_marketplace_reward_alert(p_email text, p_lat double precision, p_lng double precision, p_trade text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v text := public.fn_request_bucket(); em text := lower(btrim(coalesce(p_email, '')));
        la numeric := round(p_lat::numeric, 2); ln numeric := round(p_lng::numeric, 2);
        tr text := nullif(left(btrim(coalesce(p_trade, '')), 60), ''); c text; first_city boolean;
BEGIN
  IF length(em) NOT BETWEEN 3 AND 254 OR em !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'invalid_email'; END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'invalid_location'; END IF;
  c := public.fn_directory_nearest_city(p_lat, p_lng);
  IF EXISTS (SELECT 1 FROM public.marketplace_reward_alerts WHERE lower(email) = em AND lat = la AND lng = ln) THEN
    RETURN jsonb_build_object('ok', true, 'city', c, 'duplicate', true);
  END IF;
  IF (SELECT count(*) FROM public.marketplace_reward_alerts WHERE visitor_hash = v AND created_at > now() - interval '1 day') >= 5
     OR NOT public.fn_rate_bucket_hit('reward_alert:global', interval '1 hour', 300) THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  first_city := c IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.marketplace_reward_alerts WHERE lower(city) = lower(c));
  INSERT INTO public.marketplace_reward_alerts(email, lat, lng, city, trade, visitor_hash) VALUES (em, la, ln, c, tr, v);
  IF first_city THEN
    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'to', 'info@revvin.co', 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
      'subject', 'First reward alert signup: ' || left(c, 120),
      'text', 'Someone in or near ' || c || ' asked to hear when local businesses offer referral rewards' || coalesce(' (trade: ' || tr || ')', '') || '.',
      'html', '<p>Someone in or near ' || public.fn_directory_html(c) || ' asked to hear when local businesses offer referral rewards' || coalesce(' (trade: ' || public.fn_directory_html(tr) || ')', '') || '.</p>',
      'purpose', 'transactional', 'label', 'marketplace_reward_alert_first_city',
      'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'idempotency_key', 'reward_alert_city:' || lower(c), 'message_id', gen_random_uuid()::text));
  END IF;
  RETURN jsonb_build_object('ok', true, 'city', c, 'duplicate', false);
END $$;

REVOKE ALL ON FUNCTION public.fn_reward_dollars(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_directory_earn_search(double precision,double precision,double precision,double precision,text,double precision,double precision,text,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_directory_nearest_city(double precision,double precision) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_marketplace_reward_alert(text,double precision,double precision,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_reward_dollars(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_directory_earn_search(double precision,double precision,double precision,double precision,text,double precision,double precision,text,integer,integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_directory_nearest_city(double precision,double precision) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_marketplace_reward_alert(text,double precision,double precision,text) TO anon, authenticated, service_role;