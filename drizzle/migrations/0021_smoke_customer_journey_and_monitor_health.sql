CREATE TABLE IF NOT EXISTS public.smoke_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  failed_step text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_ms integer
);
GRANT SELECT ON public.smoke_test_runs TO authenticated;
GRANT ALL ON public.smoke_test_runs TO service_role;
ALTER TABLE public.smoke_test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read smoke test runs" ON public.smoke_test_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS smoke_test_runs_ran_at_idx ON public.smoke_test_runs (ran_at DESC);

-- Hourly "real customer" journey. Runs as the session role (postgres via
-- pg_cron) so it can switch to the real anon/authenticated roles; Postgres
-- forbids SET ROLE inside SECURITY DEFINER functions. Every step runs in a
-- sub-block that always ends with a sentinel exception, so all journey data
-- is rolled back. Only the result row is kept.
CREATE OR REPLACE FUNCTION public.fn_smoke_customer_journey()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $fn$
DECLARE
  t0 timestamptz := clock_timestamp();
  uid uuid := gen_random_uuid();
  short text := substr(replace(uid::text, '-', ''), 1, 10);
  steps jsonb := '[]'::jsonb;
  cur text := 'signup';
  failed text;
  err text;
  bid uuid; lid uuid; rid uuid;
  b record; n int; v text; ok_flag boolean;
BEGIN
  BEGIN
    -- 1. signup
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
    VALUES (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'smoke-' || uid::text || '@example.com',
            jsonb_build_object('role', 'business', 'business_name', 'Smoke Test Roofing'),
            '{"provider":"email","providers":["email"]}'::jsonb, now(), now());
    SELECT id, account_status INTO b FROM public.businesses WHERE user_id = uid LIMIT 1;
    IF b.id IS NULL THEN RAISE EXCEPTION 'no business created by signup'; END IF;
    IF b.account_status <> 'approved' THEN RAISE EXCEPTION 'account_status is %', b.account_status; END IF;
    bid := b.id;
    steps := steps || jsonb_build_object('step', cur, 'ok', true);

    -- 2. onboarding, as the owner
    cur := 'onboarding';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', uid::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    SET LOCAL ROLE authenticated;
    UPDATE public.businesses SET slug = 'smoke-' || short, category = 'Roofing', offer_amount = '500', service_area = 'Dallas, TX' WHERE id = bid;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'owner update touched % rows', n; END IF;
    SELECT offer_amount INTO v FROM public.businesses WHERE id = bid;
    IF v IS DISTINCT FROM '$500' THEN RAISE EXCEPTION 'offer_amount stored as %', v; END IF;
    steps := steps || jsonb_build_object('step', cur, 'ok', true);

    -- 3. publish
    cur := 'publish';
    SELECT published INTO ok_flag FROM public.fn_set_business_published(true);
    IF ok_flag IS NOT TRUE THEN RAISE EXCEPTION 'publish returned %', ok_flag; END IF;
    RESET ROLE;
    SELECT * INTO b FROM public.businesses WHERE id = bid;
    IF NOT b.is_published THEN RAISE EXCEPTION 'is_published still false'; END IF;
    IF NOT public.fn_page_live(b.account_status, b.is_published, b.is_disabled) THEN RAISE EXCEPTION 'fn_page_live false'; END IF;
    steps := steps || jsonb_build_object('step', cur, 'ok', true);

    -- 4. public page, as anon
    cur := 'public_page';
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claim.role', 'anon', true);
    SET LOCAL ROLE anon;
    SELECT count(*) INTO n FROM public.businesses_public WHERE slug = 'smoke-' || short;
    IF n <> 1 THEN RAISE EXCEPTION 'businesses_public returned % rows', n; END IF;
    steps := steps || jsonb_build_object('step', cur, 'ok', true);

    -- 5. referral, as anon
    cur := 'referral';
    PERFORM public.fn_submit_public_referral(
      'smoke' || replace(gen_random_uuid()::text, '-', ''), 'smoke-' || short,
      'Smoke Referrer', 'smoke-ref-' || short || '@example.com',
      'Smoke Lead', '2145550100', 'Roof inspection after hail', true);
    RESET ROLE;
    SELECT id INTO lid FROM public.leads WHERE business_id = bid LIMIT 1;
    IF lid IS NULL THEN RAISE EXCEPTION 'no lead created'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.referrers WHERE business_id = bid) THEN RAISE EXCEPTION 'no referrer row'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.notification_jobs WHERE business_id = bid AND event = 'new_lead') THEN RAISE EXCEPTION 'no new_lead notification job'; END IF;
    steps := steps || jsonb_build_object('step', cur, 'ok', true);

    -- 6. lead work, as the owner
    cur := 'lead_work';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', uid::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    SET LOCAL ROLE authenticated;
    IF NOT EXISTS (SELECT 1 FROM public.leads WHERE id = lid) THEN RAISE EXCEPTION 'owner cannot read lead'; END IF;
    UPDATE public.leads SET status = 'in_progress' WHERE id = lid;
    UPDATE public.leads SET status = 'closed_won', deal_value = 1000 WHERE id = lid;
    SELECT id INTO rid FROM public.rewards WHERE lead_id = lid AND amount = 500 AND status = 'pending' LIMIT 1;
    IF rid IS NULL THEN RAISE EXCEPTION 'no pending $500 reward'; END IF;
    UPDATE public.rewards SET status = 'paid', marked_paid_at = now() WHERE id = rid;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'reward paid update touched % rows', n; END IF;
    steps := steps || jsonb_build_object('step', cur, 'ok', true);

    -- 7. import
    cur := 'import';
    INSERT INTO public.referral_contacts (business_id, name, email) VALUES (bid, 'Smoke Contact', 'smoke-contact-' || short || '@example.com');
    steps := steps || jsonb_build_object('step', cur, 'ok', true);

    -- 8. plan
    cur := 'plan';
    RESET ROLE;
    v := public.fn_effective_plan(bid);
    IF v IS DISTINCT FROM 'pro' THEN RAISE EXCEPTION 'effective plan is %', v; END IF;
    steps := steps || jsonb_build_object('step', cur, 'ok', true);

    -- 9. unpublish
    cur := 'unpublish';
    SET LOCAL ROLE authenticated;
    SELECT published INTO ok_flag FROM public.fn_set_business_published(false);
    RESET ROLE;
    IF EXISTS (SELECT 1 FROM public.businesses WHERE id = bid AND is_published) THEN RAISE EXCEPTION 'still published'; END IF;
    steps := steps || jsonb_build_object('step', cur, 'ok', true);

    -- 10. guardrails
    cur := 'guardrails';
    SET LOCAL ROLE authenticated;
    ok_flag := false;
    BEGIN UPDATE public.businesses SET subscription_status = 'active' WHERE id = bid; EXCEPTION WHEN OTHERS THEN ok_flag := true; END;
    IF NOT ok_flag THEN RAISE EXCEPTION 'owner changed subscription_status'; END IF;
    ok_flag := false;
    BEGIN UPDATE public.businesses SET is_published = true WHERE id = bid; EXCEPTION WHEN OTHERS THEN ok_flag := true; END;
    IF NOT ok_flag THEN RAISE EXCEPTION 'owner changed is_published directly'; END IF;
    RESET ROLE;
    steps := steps || jsonb_build_object('step', cur, 'ok', true);

    RAISE EXCEPTION 'SMOKE_ROLLBACK';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'SMOKE_ROLLBACK' THEN
      failed := cur; err := SQLERRM;
      steps := steps || jsonb_build_object('step', cur, 'ok', false, 'error', left(err, 500));
    END IF;
  END;

  INSERT INTO public.smoke_test_runs (ok, failed_step, steps, duration_ms)
  VALUES (failed IS NULL, failed, steps, (extract(epoch from clock_timestamp() - t0) * 1000)::int);
  DELETE FROM public.smoke_test_runs WHERE ran_at < now() - interval '30 days';
  RETURN jsonb_build_object('ok', failed IS NULL, 'failed_step', failed, 'error', err, 'steps', steps);
END $fn$;
REVOKE ALL ON FUNCTION public.fn_smoke_customer_journey() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_smoke_customer_journey() TO service_role;

-- Counts for security-monitor that the Data API cannot read directly.
CREATE OR REPLACE FUNCTION public.fn_monitor_health()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
  SELECT jsonb_build_object(
    'http_non_200', (SELECT coalesce(jsonb_object_agg(coalesce(status_code::text, 'error'), c), '{}'::jsonb)
                       FROM (SELECT status_code, count(*) c FROM net._http_response
                              WHERE created > now() - interval '1 hour' AND status_code IS DISTINCT FROM 200
                              GROUP BY 1) h),
    'oldest_auth_email_min', (SELECT extract(epoch from now() - min(enqueued_at)) / 60 FROM pgmq.q_auth_emails),
    'oldest_transactional_email_min', (SELECT extract(epoch from now() - min(enqueued_at)) / 60 FROM pgmq.q_transactional_emails),
    'stuck_new_lead_jobs', (SELECT count(*) FROM public.notification_jobs j JOIN public.businesses b ON b.id = j.business_id
                             WHERE j.event = 'new_lead' AND j.sent_at IS NULL AND j.status <> 'sent'
                               AND j.created_at < now() - interval '10 minutes'
                               AND j.created_at > now() - interval '7 days'
                               AND NOT coalesce(b.is_demo, false)),
    'publish_failed_1h', (SELECT count(*) FROM public.funnel_events
                           WHERE event = 'publish_failed' AND bot_reason IS NULL
                             AND created_at > now() - interval '1 hour'
                             AND coalesce(meta->>'demo', 'false') <> 'true'),
    'latest_smoke', (SELECT to_jsonb(s) FROM (SELECT ran_at, ok, failed_step, steps FROM public.smoke_test_runs ORDER BY ran_at DESC LIMIT 1) s)
  )
$fn$;
REVOKE ALL ON FUNCTION public.fn_monitor_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_monitor_health() TO service_role;

CREATE OR REPLACE FUNCTION public.fn_prospect_view(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
      'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'idempotency_key', 'prospect_first_view:' || p.id::text || ':' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
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
        'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'idempotency_key', 'prospect_first_view:' || p.id::text || ':' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD') || ':caller',
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
END $function$;