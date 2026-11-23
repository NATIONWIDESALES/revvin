CREATE OR REPLACE FUNCTION public.fn_smoke_customer_journey()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $fn$
DECLARE
  t0 timestamptz := clock_timestamp();
  uid uuid := gen_random_uuid();
  short text := translate(substr(replace(uid::text, '-', ''), 1, 10), '0123456789abcdef', 'cdfgjklmnpqrtvwy');
  steps jsonb := '[]'::jsonb;
  cur text := 'signup';
  failed text;
  err text;
  bid uuid; lid uuid; rid uuid;
  b record; n int; v text; ok_flag boolean;
  retry_result jsonb;
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
  INSERT INTO public.smoke_test_runs (ok, failed_step, steps, duration_ms, ran_at)
  VALUES (failed IS NULL, failed, steps, (extract(epoch from clock_timestamp() - t0) * 1000)::int, clock_timestamp());
  DELETE FROM public.smoke_test_runs WHERE ran_at < now() - interval '30 days';
  -- The scheduled privileged caller can exercise real roles; the monitor cannot.
  -- Retry only once, after the first journey has rolled back completely.
  IF failed IS NOT NULL AND coalesce(current_setting('revvin.smoke_retry', true), '') <> '1' THEN
    PERFORM set_config('revvin.smoke_retry', '1', true);
    BEGIN
      retry_result := public.fn_smoke_customer_journey();
    EXCEPTION WHEN OTHERS THEN
      PERFORM set_config('revvin.smoke_retry', '', true);
      RAISE;
    END;
    PERFORM set_config('revvin.smoke_retry', '', true);
    RETURN retry_result || jsonb_build_object('attempts', 2);
  END IF;
  RETURN jsonb_build_object('ok', failed IS NULL, 'failed_step', failed, 'error', err, 'steps', steps);
END $fn$;