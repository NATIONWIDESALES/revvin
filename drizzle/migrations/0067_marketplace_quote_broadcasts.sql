CREATE TABLE public.marketplace_quote_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade text NOT NULL,
  details text NOT NULL,
  city text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  timing text,
  matched_count integer NOT NULL DEFAULT 0,
  share_later_consent boolean NOT NULL DEFAULT false,
  visitor_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX marketplace_quote_broadcasts_visitor ON public.marketplace_quote_broadcasts (visitor_hash, created_at);
CREATE INDEX marketplace_quote_broadcasts_trade_time ON public.marketplace_quote_broadcasts (lower(trade), created_at);
GRANT ALL ON public.marketplace_quote_broadcasts TO service_role;
ALTER TABLE public.marketplace_quote_broadcasts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS broadcast_id uuid REFERENCES public.marketplace_quote_broadcasts(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS quote_requests_broadcast_business ON public.quote_requests (broadcast_id, business_id) WHERE broadcast_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_quote_km(a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT 6371 * 2 * asin(least(1, sqrt(power(sin(radians(b_lat - a_lat) / 2), 2)
         + cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2))))
$$;

-- Internal: claimed, live businesses in a trade within 60 km. Pro first, then reviewed, then nearest.
CREATE OR REPLACE FUNCTION public.fn_quote_candidates(p_trade text, p_lat double precision, p_lng double precision, p_limit integer DEFAULT 3)
RETURNS TABLE(id uuid, slug text, name text, city text, region text, is_pro boolean, review_count bigint, rating_avg numeric, km double precision, business_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT x.id, x.slug, x.name, x.city, x.region, x.is_pro, x.rc, x.ra, x.km, x.business_email FROM (
    SELECT b.id, b.slug, b.name, nullif(btrim(b.city), '') AS city, nullif(btrim(b.state), '') AS region,
           public.fn_plan_is_pro(b.plan, b.pro_trial_ends_at) AS is_pro,
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

CREATE OR REPLACE FUNCTION public.fn_quote_match_preview(p_trade text, p_lat double precision, p_lng double precision)
RETURNS TABLE(slug text, name text, city text, region text, is_pro boolean, review_count bigint, rating_avg numeric, km double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT c.slug, c.name, c.city, c.region, c.is_pro, c.review_count, c.rating_avg, round(c.km::numeric, 1)::double precision
    FROM public.fn_quote_candidates(left(p_trade, 60), p_lat, p_lng, 3) c
   WHERE p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180
$$;

CREATE OR REPLACE FUNCTION public.fn_quote_unclaimed_nearby(p_trade text, p_lat double precision, p_lng double precision)
RETURNS TABLE(slug text, name text, city text, region text, phone text, website text, km double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT l.slug, l.name, split_part(l.city, ',', 1), l.region, l.phone, l.website,
         round(public.fn_quote_km(p_lat, p_lng, l.latitude, l.longitude)::numeric, 1)::double precision
    FROM public.directory_listings l
   WHERE p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180 AND NOT public.fn_directory_regulated(p_trade)
     AND l.status = 'unclaimed' AND NOT l.is_chain AND l.category = left(p_trade, 60)
     AND l.latitude BETWEEN p_lat - 0.6 AND p_lat + 0.6 AND l.longitude BETWEEN p_lng - 0.9 AND p_lng + 0.9
   ORDER BY (l.latitude - p_lat)^2 + ((l.longitude - p_lng) * cos(radians(p_lat)))^2, l.name
   LIMIT 5
$$;

CREATE OR REPLACE FUNCTION public.fn_quote_demand_count(p_trade text, p_lat double precision, p_lng double precision)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT count(*)::int FROM public.marketplace_quote_broadcasts q
   WHERE p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180
     AND lower(q.trade) = lower(left(p_trade, 60)) AND q.created_at > now() - interval '30 days'
     AND q.lat BETWEEN p_lat - 0.6 AND p_lat + 0.6
     AND public.fn_quote_km(p_lat, p_lng, q.lat, q.lng) <= 60
$$;

-- Internal: one dashboard row plus the existing quote email for one business.
CREATE OR REPLACE FUNCTION public.fn_quote_deliver_one(p_broadcast uuid, p_business uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE q public.marketplace_quote_broadcasts%ROWTYPE; bemail text; qid uuid; msg text; lines text[];
BEGIN
  SELECT * INTO q FROM public.marketplace_quote_broadcasts WHERE id = p_broadcast;
  IF q.id IS NULL THEN RETURN false; END IF;
  msg := left('Trade: ' || q.trade || E'\nLocation: ' || q.city || coalesce(E'\nTiming: ' || q.timing, '') || E'\n\n' || q.details, 1500);
  INSERT INTO public.quote_requests(business_id, name, email, phone, message, broadcast_id)
  VALUES (p_business, q.name, q.email, q.phone, msg, q.id)
  ON CONFLICT (broadcast_id, business_id) WHERE broadcast_id IS NOT NULL DO NOTHING
  RETURNING id INTO qid;
  IF qid IS NULL THEN RETURN false; END IF;
  SELECT business_email INTO bemail FROM public.businesses WHERE id = p_business;
  IF nullif(btrim(coalesce(bemail, '')), '') IS NOT NULL THEN
    lines := ARRAY['Name: ' || q.name, 'Email: ' || q.email] || CASE WHEN q.phone IS NOT NULL THEN ARRAY['Phone: ' || q.phone] ELSE ARRAY[]::text[] END || ARRAY['Message: ' || msg];
    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'to', bemail, 'from', 'Revvin <info@revvin.co>', 'reply_to', q.email,
      'subject', left('New quote request from ' || q.name, 200),
      'text', 'You have a new quote request from your Revvin profile.' || E'\n\n' || array_to_string(lines, E'\n')
              || E'\n\nSent through the Revvin marketplace. Up to 2 other local businesses may also have received this request.'
              || E'\n\nReply to this email to answer ' || q.name || ' directly.',
      'html', '<p>You have a new quote request from your Revvin profile.</p>'
              || (SELECT string_agg('<p style="white-space:pre-wrap">' || public.fn_directory_html(l) || '</p>', '') FROM unnest(lines) l)
              || '<p>Sent through the Revvin marketplace. Up to 2 other local businesses may also have received this request.</p>'
              || '<p>Reply to this email to answer ' || public.fn_directory_html(q.name) || ' directly.</p>',
      'purpose', 'transactional', 'label', 'quote_request',
      'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'idempotency_key', 'quote_request:' || qid::text, 'message_id', gen_random_uuid()::text));
  END IF;
  RETURN true;
END $$;

-- Service-only: the marketplace-quotes edge function calls this after validation.
CREATE OR REPLACE FUNCTION public.fn_quote_broadcast_submit(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE tr text := btrim(coalesce(p->>'trade', '')); det text := btrim(coalesce(p->>'details', ''));
        ct text := btrim(coalesce(p->>'city', '')); la double precision := (p->>'lat')::double precision; ln double precision := (p->>'lng')::double precision;
        nm text := btrim(coalesce(p->>'name', '')); em text := lower(btrim(coalesce(p->>'email', '')));
        ph text := nullif(btrim(coalesce(p->>'phone', '')), ''); tm text := nullif(p->>'timing', '');
        vh text := coalesce(p->>'visitor_hash', ''); later boolean := coalesce((p->>'share_later')::boolean, false);
        picked text[] := ARRAY(SELECT jsonb_array_elements_text(coalesce(p->'slugs', '[]'::jsonb)));
        bid uuid; sent jsonb := '[]'::jsonb; n int := 0; c record;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF length(tr) NOT BETWEEN 2 AND 60 OR public.fn_directory_regulated(tr) THEN RAISE EXCEPTION 'invalid_trade'; END IF;
  IF length(det) NOT BETWEEN 20 AND 1000 THEN RAISE EXCEPTION 'invalid_details'; END IF;
  IF length(ct) NOT BETWEEN 2 AND 80 OR la IS NULL OR ln IS NULL OR la NOT BETWEEN -90 AND 90 OR ln NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'invalid_location'; END IF;
  IF length(nm) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF length(em) NOT BETWEEN 3 AND 254 OR em !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'invalid_email'; END IF;
  IF length(coalesce(ph, '')) > 40 OR coalesce(tm, 'asap') NOT IN ('asap', 'month', 'planning') OR length(vh) NOT BETWEEN 8 AND 128 THEN RAISE EXCEPTION 'invalid_request'; END IF;
  IF (SELECT count(*) FROM public.marketplace_quote_broadcasts WHERE visitor_hash = vh AND created_at > now() - interval '1 day') >= 3
     OR NOT public.fn_rate_bucket_hit('quote_broadcast:global', interval '1 hour', 200) THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  -- Only businesses the visitor saw and kept ticked, re-checked against the live match.
  IF NOT EXISTS (SELECT 1 FROM public.fn_quote_candidates(tr, la, ln, 3) x WHERE x.slug = ANY (picked)) AND NOT later THEN
    RAISE EXCEPTION 'nothing_to_send';
  END IF;
  INSERT INTO public.marketplace_quote_broadcasts(trade, details, city, lat, lng, name, email, phone, timing, share_later_consent, visitor_hash)
  VALUES (tr, det, ct, la, ln, nm, em, ph, tm, later, vh) RETURNING id INTO bid;
  FOR c IN SELECT * FROM public.fn_quote_candidates(tr, la, ln, 3) x WHERE x.slug = ANY (picked) LOOP
    IF public.fn_quote_deliver_one(bid, c.id) THEN
      n := n + 1;
      sent := sent || jsonb_build_object('slug', c.slug, 'name', c.name, 'city', c.city);
    END IF;
  END LOOP;
  UPDATE public.marketplace_quote_broadcasts SET matched_count = n WHERE id = bid;
  IF n > 0 THEN
    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'to', em, 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
      'subject', 'Your ' || tr || ' quote request was sent',
      'text', 'Hi ' || nm || E',\n\nYour request was sent to:\n' ||
              (SELECT string_agg('- ' || (e->>'name') || ': https://revvin.co/b/' || (e->>'slug'), E'\n') FROM jsonb_array_elements(sent) e) ||
              E'\n\nThey will reply to you directly. Revvin does not do the work or set prices.',
      'html', '<p>Hi ' || public.fn_directory_html(nm) || ',</p><p>Your request was sent to:</p><ul>' ||
              (SELECT string_agg('<li><a href="https://revvin.co/b/' || public.fn_directory_html(e->>'slug') || '">' || public.fn_directory_html(e->>'name') || '</a></li>', '') FROM jsonb_array_elements(sent) e) ||
              '</ul><p>They will reply to you directly. Revvin does not do the work or set prices.</p>',
      'purpose', 'transactional', 'label', 'quote_broadcast_confirmation',
      'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'idempotency_key', 'quote_broadcast_confirm:' || bid::text, 'message_id', gen_random_uuid()::text));
  END IF;
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'to', 'info@revvin.co', 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
    'subject', left('Marketplace quote request: ' || tr || ' near ' || ct, 200),
    'text', 'Trade: ' || tr || E'\nCity: ' || ct || E'\nMatched businesses: ' || n || E'\nSaved for later businesses: ' || CASE WHEN later THEN 'yes' ELSE 'no' END,
    'html', '<p>Trade: ' || public.fn_directory_html(tr) || '</p><p>City: ' || public.fn_directory_html(ct) || '</p><p>Matched businesses: ' || n || '</p><p>Saved for later businesses: ' || CASE WHEN later THEN 'yes' ELSE 'no' END || '</p>',
    'purpose', 'transactional', 'label', 'quote_broadcast_admin',
    'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'idempotency_key', 'quote_broadcast_admin:' || bid::text, 'message_id', gen_random_uuid()::text));
  RETURN jsonb_build_object('ok', true, 'sent', sent, 'saved', later);
END $$;

-- Delivers consented saved requests (last 14 days, same trade, within 60 km, fewer than 3 deliveries) to one business.
CREATE OR REPLACE FUNCTION public.fn_quote_deliver_saved(p_business_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE b public.businesses%ROWTYPE; q record; n int := 0;
BEGIN
  SELECT * INTO b FROM public.businesses WHERE id = p_business_id;
  IF b.id IS NULL OR b.latitude IS NULL OR b.longitude IS NULL OR b.slug IS NULL
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
END $$;

-- Runs after a business is created, claimed or published. Never blocks the save.
CREATE OR REPLACE FUNCTION public.fn_quote_saved_on_business()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF public.fn_page_live(NEW.account_status, NEW.is_published, NEW.is_disabled) AND NEW.latitude IS NOT NULL THEN
    BEGIN
      PERFORM public.fn_quote_deliver_saved(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'saved quote delivery failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_quote_saved_on_business AFTER INSERT OR UPDATE OF is_published, account_status, is_disabled, latitude, longitude, category, marketplace_listed
  ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.fn_quote_saved_on_business();

CREATE OR REPLACE FUNCTION public.fn_admin_quote_deliver_saved(p_business_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') OR coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  RETURN public.fn_quote_deliver_saved(p_business_id);
END $$;

REVOKE ALL ON FUNCTION public.fn_quote_km(double precision,double precision,double precision,double precision) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_quote_candidates(text,double precision,double precision,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_quote_match_preview(text,double precision,double precision) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_quote_unclaimed_nearby(text,double precision,double precision) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_quote_demand_count(text,double precision,double precision) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_quote_deliver_one(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_quote_broadcast_submit(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_quote_deliver_saved(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_quote_saved_on_business() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_admin_quote_deliver_saved(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_quote_km(double precision,double precision,double precision,double precision) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_quote_match_preview(text,double precision,double precision) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_quote_unclaimed_nearby(text,double precision,double precision) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_quote_demand_count(text,double precision,double precision) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_quote_candidates(text,double precision,double precision,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_quote_deliver_one(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_quote_broadcast_submit(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_quote_deliver_saved(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_admin_quote_deliver_saved(uuid) TO authenticated;