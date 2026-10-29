CREATE TABLE public.metros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  radius_km integer NOT NULL DEFAULT 45,
  is_live boolean NOT NULL DEFAULT false,
  launched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.metros TO authenticated;
GRANT ALL ON public.metros TO service_role;
ALTER TABLE public.metros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read metros" ON public.metros FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update metros" ON public.metros FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.fn_metro_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_live IS DISTINCT FROM OLD.is_live THEN
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'only_admins_set_is_live';
    END IF;
    IF NEW.is_live AND OLD.launched_at IS NULL THEN NEW.launched_at := now(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_metro_guard BEFORE UPDATE ON public.metros FOR EACH ROW EXECUTE FUNCTION public.fn_metro_guard();

INSERT INTO public.metros (name, slug, center_lat, center_lng, radius_km, is_live)
VALUES ('Fraser Valley, BC', 'fraser-valley', 49.104, -122.66, 45, false);

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS show_on_earn boolean NOT NULL DEFAULT true;
ALTER TABLE public.email_leads ADD COLUMN IF NOT EXISTS city text, ADD COLUMN IF NOT EXISTS metro_slug text,
  ADD COLUMN IF NOT EXISTS business_name text, ADD COLUMN IF NOT EXISTS business_contact text;

-- One eligibility rule for every Earn list, count and lookup.
CREATE OR REPLACE FUNCTION public.fn_earn_eligible(b public.businesses, m public.metros)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
    AND coalesce(b.is_demo, false) = false
    AND b.show_on_earn
    AND b.slug IS NOT NULL
    AND nullif(btrim(coalesce(b.offer_amount, '')), '') IS NOT NULL
    AND lower(regexp_replace(coalesce(b.category, ''), '[^a-zA-Z]', '', 'g'))
        NOT IN ('finance', 'insurance', 'legal', 'mortgage', 'realestate')
    AND CASE
      WHEN b.latitude IS NOT NULL AND b.longitude IS NOT NULL THEN
        6371 * 2 * asin(sqrt(
          power(sin(radians(b.latitude - m.center_lat) / 2), 2) +
          cos(radians(m.center_lat)) * cos(radians(b.latitude)) *
          power(sin(radians(b.longitude - m.center_lng) / 2), 2))) <= m.radius_km
      ELSE lower(btrim(coalesce(b.city, ''))) <> ''
        AND lower(split_part(m.name, ',', 1)) LIKE '%' || lower(btrim(b.city)) || '%'
    END;
$$;

CREATE OR REPLACE FUNCTION public.fn_earn_metros()
RETURNS TABLE(name text, slug text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT name, slug FROM public.metros WHERE is_live ORDER BY launched_at NULLS LAST, name;
$$;
GRANT EXECUTE ON FUNCTION public.fn_earn_metros() TO anon, authenticated;

-- Metro page header, live or not (name only).
CREATE OR REPLACE FUNCTION public.fn_earn_metro(p_slug text)
RETURNS TABLE(name text, slug text, is_live boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT name, slug, is_live FROM public.metros WHERE slug = lower(btrim(coalesce(p_slug, ''))) LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.fn_earn_metro(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_earn_businesses(p_metro_slug text)
RETURNS TABLE(slug text, name text, trade text, city text, reward text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.slug, b.name, b.category, b.city, b.offer_amount
    FROM public.metros m JOIN public.businesses b ON public.fn_earn_eligible(b, m)
   WHERE m.slug = lower(btrim(coalesce(p_metro_slug, ''))) AND m.is_live
   ORDER BY b.name;
$$;
GRANT EXECUTE ON FUNCTION public.fn_earn_businesses(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_business_metro(p_slug text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.slug FROM public.businesses b JOIN public.metros m ON m.is_live AND public.fn_earn_eligible(b, m)
   WHERE b.slug = lower(btrim(coalesce(p_slug, ''))) ORDER BY m.launched_at LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.fn_business_metro(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_earn_get_link(p_business_slug text, p_name text, p_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b public.businesses%ROWTYPE; _email text; _name text := btrim(coalesce(p_name, '')); _r public.referrers%ROWTYPE;
BEGIN
  SELECT b.* INTO _b FROM public.businesses b
   WHERE b.slug = lower(btrim(coalesce(p_business_slug, '')))
     AND EXISTS (SELECT 1 FROM public.metros m WHERE m.is_live AND public.fn_earn_eligible(b, m))
   LIMIT 1;
  IF _b.id IS NULL THEN RAISE EXCEPTION 'not_on_earn'; END IF;
  IF auth.uid() IS NOT NULL THEN
    SELECT lower(email) INTO _email FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  END IF;
  IF _email IS NULL THEN _email := lower(btrim(coalesce(p_email, ''))); END IF;
  IF _email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' OR char_length(_email) > 255 THEN RAISE EXCEPTION 'invalid_email'; END IF;
  SELECT * INTO _r FROM public.referrers WHERE business_id = _b.id AND lower(email) = _email LIMIT 1;
  IF _r.id IS NOT NULL THEN RETURN _r.token; END IF;
  IF char_length(_name) < 2 OR char_length(_name) > 120 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF NOT public.fn_rate_bucket_hit('earn_link:' || md5(_email), interval '1 hour', 30) THEN RAISE EXCEPTION 'rate_limited'; END IF;
  _r := public.fn_upsert_referrer(_b.id, _name, _email, NULL);
  RETURN _r.token;
END $$;
GRANT EXECUTE ON FUNCTION public.fn_earn_get_link(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_earn_waiting_count(p_metro_slug text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT nullif(count(DISTINCT lower(email)), 0)::int FROM public.email_leads
   WHERE source = 'earn_waitlist' AND metro_slug = lower(btrim(coalesce(p_metro_slug, '')));
$$;
GRANT EXECUTE ON FUNCTION public.fn_earn_waiting_count(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_submit_earn_lead(p_email text, p_source text, p_city text DEFAULT NULL, p_metro_slug text DEFAULT NULL, p_business_name text DEFAULT NULL, p_business_contact text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text := lower(btrim(coalesce(p_email, '')));
BEGIN
  IF p_source NOT IN ('earn_waitlist', 'business_invite') THEN RAISE EXCEPTION 'invalid_source'; END IF;
  IF _email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' OR char_length(_email) > 320 THEN RAISE EXCEPTION 'invalid_email'; END IF;
  IF NOT public.fn_rate_bucket_hit('earn_lead:' || md5(_email), interval '1 hour', 10) THEN RAISE EXCEPTION 'rate_limited'; END IF;
  INSERT INTO public.email_leads (email, source, city, metro_slug, business_name, business_contact)
  VALUES (_email, p_source, left(nullif(btrim(coalesce(p_city, '')), ''), 120),
    (SELECT slug FROM public.metros WHERE slug = lower(btrim(coalesce(p_metro_slug, ''))) LIMIT 1),
    left(nullif(btrim(coalesce(p_business_name, '')), ''), 160), left(nullif(btrim(coalesce(p_business_contact, '')), ''), 200));
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.fn_submit_earn_lead(text, text, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_admin_metros()
RETURNS TABLE(id uuid, name text, slug text, is_live boolean, launched_at timestamptz, eligible integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin_only'; END IF;
  RETURN QUERY SELECT m.id, m.name, m.slug, m.is_live, m.launched_at,
    (SELECT count(*)::int FROM public.businesses b WHERE public.fn_earn_eligible(b, m))
    FROM public.metros m ORDER BY m.name;
END $$;
REVOKE ALL ON FUNCTION public.fn_admin_metros() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_metros() TO authenticated;