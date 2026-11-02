-- Prebuilt referral-page previews for outbound sales calls.
-- A preview is never a live referral page: it accepts nothing and shows no
-- reviews, ratings or endorsements. Only admins and the sales role can read
-- or write rows; the public preview page reaches the data through the narrow
-- rate-limited functions below.

CREATE TABLE public.prospect_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  name text NOT NULL,
  trade text NOT NULL,
  city text,
  region text,
  country text NOT NULL DEFAULT 'US',
  phone text,
  website text,
  google_place_id text,
  suggested_reward integer,
  headline_override text,
  created_by uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'claimed', 'removed', 'expired')),
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  view_alert_sent_at timestamptz,
  claimed_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  removed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(code) BETWEEN 10 AND 64 AND code ~ '^[A-Za-z0-9_-]+$'),
  CHECK (char_length(name) BETWEEN 1 AND 160),
  CHECK (country IN ('US', 'CA'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_pages TO authenticated;
GRANT ALL ON public.prospect_pages TO service_role;

ALTER TABLE public.prospect_pages ENABLE ROW LEVEL SECURITY;

-- Admins and sales users only. No anon access of any kind.
CREATE POLICY "Admins and sales read prospects"
  ON public.prospect_pages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales'));
CREATE POLICY "Admins and sales create prospects"
  ON public.prospect_pages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales'));
CREATE POLICY "Admins and sales update prospects"
  ON public.prospect_pages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales'));
CREATE POLICY "Admins and sales delete prospects"
  ON public.prospect_pages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public preview read + view counting. Rate limited per requester and
-- globally; returns only the fields the preview page renders. The first view
-- of a prospect queues one alert email (to the team and the caller), throttled
-- to one per prospect per day by view_alert_sent_at. The outbound email kill
-- switch is enforced by the queue processor.
CREATE OR REPLACE FUNCTION public.fn_prospect_view(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  p public.prospect_pages%ROWTYPE;
  caller_email text;
  first_view boolean := false;
BEGIN
  IF p_code IS NULL OR p_code !~ '^[A-Za-z0-9_-]{10,64}$' THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF NOT public.fn_rate_bucket_hit('prospect_view:' || public.fn_request_bucket(), interval '1 hour', 30)
     OR NOT public.fn_rate_bucket_hit('prospect_view:global', interval '1 hour', 2000) THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  SELECT * INTO p FROM public.prospect_pages WHERE code = p_code LIMIT 1;
  IF p.id IS NULL OR p.status IN ('removed', 'expired') OR p.expires_at < now() THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  first_view := p.first_viewed_at IS NULL;
  UPDATE public.prospect_pages
     SET view_count = view_count + 1,
         last_viewed_at = now(),
         first_viewed_at = coalesce(first_viewed_at, now()),
         status = CASE WHEN status IN ('draft', 'sent') THEN 'viewed' ELSE status END,
         updated_at = now()
   WHERE id = p.id;

  IF first_view AND (p.view_alert_sent_at IS NULL OR p.view_alert_sent_at < now() - interval '1 day') THEN
    UPDATE public.prospect_pages SET view_alert_sent_at = now() WHERE id = p.id;
    IF p.created_by IS NOT NULL THEN
      SELECT email INTO caller_email FROM auth.users WHERE id = p.created_by;
    END IF;
    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'to', 'info@revvin.co',
      'from', 'Revvin <info@revvin.co>',
      'reply_to', 'info@revvin.co',
      'subject', p.name || ' just opened their page',
      'text', p.name || ' just opened their prebuilt referral page.' || coalesce(' Phone: ' || p.phone, '') || ' Link: https://revvin.co/preview/' || p.code,
      'html', '<p>' || p.name || ' just opened their prebuilt referral page.</p>' || coalesce('<p>Phone: <a href="tel:' || p.phone || '">' || p.phone || '</a></p>', '') || '<p><a href="https://revvin.co/preview/' || p.code || '">Open the preview</a></p>',
      'purpose', 'transactional',
      'label', 'prospect_first_view',
      'queued_at', extract(epoch from now()),
      'message_id', gen_random_uuid()::text));
    IF caller_email IS NOT NULL AND lower(caller_email) <> 'info@revvin.co' THEN
      PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
        'to', caller_email,
        'from', 'Revvin <info@revvin.co>',
        'reply_to', 'info@revvin.co',
        'subject', p.name || ' just opened their page',
        'text', p.name || ' just opened the page you built for them.' || coalesce(' Phone: ' || p.phone, '') || ' Link: https://revvin.co/preview/' || p.code,
        'html', '<p>' || p.name || ' just opened the page you built for them.</p>' || coalesce('<p>Phone: <a href="tel:' || p.phone || '">' || p.phone || '</a></p>', '') || '<p><a href="https://revvin.co/preview/' || p.code || '">Open the preview</a></p>',
        'purpose', 'transactional',
        'label', 'prospect_first_view',
        'queued_at', extract(epoch from now()),
        'message_id', gen_random_uuid()::text));
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'name', p.name,
    'trade', p.trade,
    'city', p.city,
    'region', p.region,
    'country', p.country,
    'suggested_reward', p.suggested_reward,
    'headline_override', p.headline_override,
    'status', p.status);
END $$;
REVOKE ALL ON FUNCTION public.fn_prospect_view(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_prospect_view(text) TO service_role;

-- Owner removal link on the preview page. One tap, immediate, no login.
CREATE OR REPLACE FUNCTION public.fn_prospect_remove(p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF p_code IS NULL OR p_code !~ '^[A-Za-z0-9_-]{10,64}$' THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF NOT public.fn_rate_bucket_hit('prospect_remove:' || public.fn_request_bucket(), interval '1 hour', 10) THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  UPDATE public.prospect_pages
     SET status = 'removed', removed_at = now(), updated_at = now()
   WHERE code = p_code AND status NOT IN ('removed', 'claimed');
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.fn_prospect_remove(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_prospect_remove(text) TO anon, authenticated;

-- Claiming. Only counts when the signed-up business carries this prospect
-- code in its acquisition snapshot, the caller owns the business, and the
-- preview is still inside its validity window.
CREATE OR REPLACE FUNCTION public.fn_prospect_claim(p_code text, p_business_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  p public.prospect_pages%ROWTYPE;
  b public.businesses%ROWTYPE;
  caller_email text;
BEGIN
  IF p_code IS NULL OR p_code !~ '^[A-Za-z0-9_-]{10,64}$' THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  SELECT * INTO p FROM public.prospect_pages WHERE code = p_code LIMIT 1;
  IF p.id IS NULL OR p.status IN ('removed', 'expired', 'claimed') OR p.expires_at < now() THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  SELECT * INTO b FROM public.businesses WHERE id = p_business_id LIMIT 1;
  IF b.id IS NULL OR b.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF coalesce(b.acquisition ->> 'prospect_code', '') IS DISTINCT FROM p.code THEN
    RAISE EXCEPTION 'code_mismatch';
  END IF;

  UPDATE public.prospect_pages
     SET status = 'claimed', claimed_business_id = b.id, updated_at = now()
   WHERE id = p.id;

  IF p.created_by IS NOT NULL THEN
    SELECT email INTO caller_email FROM auth.users WHERE id = p.created_by;
  END IF;
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'to', 'info@revvin.co',
    'from', 'Revvin <info@revvin.co>',
    'reply_to', 'info@revvin.co',
    'subject', 'Claimed: ' || p.name,
    'text', p.name || ' claimed their prebuilt referral page.' || coalesce(' Phone: ' || p.phone, ''),
    'html', '<p>' || p.name || ' claimed their prebuilt referral page.</p>' || coalesce('<p>Phone: <a href="tel:' || p.phone || '">' || p.phone || '</a></p>', ''),
    'purpose', 'transactional',
    'label', 'prospect_claimed',
    'queued_at', extract(epoch from now()),
    'message_id', gen_random_uuid()::text));
  IF caller_email IS NOT NULL AND lower(caller_email) <> 'info@revvin.co' THEN
    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'to', caller_email,
      'from', 'Revvin <info@revvin.co>',
      'reply_to', 'info@revvin.co',
      'subject', 'Claimed: ' || p.name,
      'text', p.name || ' claimed the page you built for them.' || coalesce(' Phone: ' || p.phone, ''),
      'html', '<p>' || p.name || ' claimed the page you built for them.</p>' || coalesce('<p>Phone: <a href="tel:' || p.phone || '">' || p.phone || '</a></p>', ''),
      'purpose', 'transactional',
      'label', 'prospect_claimed',
      'queued_at', extract(epoch from now()),
      'message_id', gen_random_uuid()::text));
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.fn_prospect_claim(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_prospect_claim(text, uuid) TO authenticated;

-- Daily expiry and scrub. Pages expire 30 days after creation; 30 days after
-- expiry or removal the contact details and notes are nulled.
CREATE OR REPLACE FUNCTION public.fn_prospect_expire()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  n_expired integer;
  n_scrubbed integer;
BEGIN
  UPDATE public.prospect_pages
     SET status = 'expired', updated_at = now()
   WHERE status IN ('draft', 'sent', 'viewed') AND expires_at < now();
  GET DIAGNOSTICS n_expired = ROW_COUNT;

  UPDATE public.prospect_pages
     SET phone = NULL, website = NULL, notes = NULL, updated_at = now()
   WHERE status IN ('expired', 'removed')
     AND coalesce(removed_at, expires_at) < now() - interval '30 days'
     AND (phone IS NOT NULL OR website IS NOT NULL OR notes IS NOT NULL);
  GET DIAGNOSTICS n_scrubbed = ROW_COUNT;

  INSERT INTO public.audit_log (referral_id, actor_id, event_type, payload)
  VALUES (NULL, '00000000-0000-0000-0000-000000000000', 'prospect_expiry',
          jsonb_build_object('expired', n_expired, 'scrubbed', n_scrubbed));
  RETURN jsonb_build_object('expired', n_expired, 'scrubbed', n_scrubbed);
END $$;
REVOKE ALL ON FUNCTION public.fn_prospect_expire() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_prospect_expire() TO service_role;

SELECT cron.schedule(
  'prospect-expiry-daily',
  '20 3 * * *',
  $$SELECT public.fn_prospect_expire();$$
);