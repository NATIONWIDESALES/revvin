CREATE OR REPLACE FUNCTION public.fn_slug_rejection(p_slug text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text := coalesce(p_slug, '');
  flat text;
  segs text[];
  w text;
  phishing_hits integer := 0;
BEGIN
  -- ASCII only
  IF s ~ '[^\x20-\x7E]' THEN RETURN 'format'; END IF;
  IF length(s) < 3 OR length(s) > 40 THEN RETURN 'format'; END IF;
  IF s !~ '^[a-z0-9]([a-z0-9]|-)*[a-z0-9]$' THEN RETURN 'format'; END IF;
  IF s LIKE '%--%' THEN RETURN 'format'; END IF;
  IF replace(s, '-', '') ~ '^[0-9]+$' THEN RETURN 'numeric'; END IF;
  flat := translate(lower(replace(s, '-', '')), '01345789@$|!', 'oieastbgasli');
  SELECT array_agg(translate(lower(x), '01345789@$|!', 'oieastbgasli')) INTO segs FROM unnest(string_to_array(s, '-')) AS x;
  IF s = ANY (public.fn_slug_reserved_words()) THEN RETURN 'reserved'; END IF;
  FOREACH w IN ARRAY public.fn_slug_reserved_words() LOOP
    IF translate(lower(replace(w, '-', '')), '01345789@$|!', 'oieastbgasli') = flat THEN RETURN 'reserved'; END IF;
  END LOOP;
  -- Strong brand variants remain substring matches. Short variants are segments.
  FOREACH w IN ARRAY ARRAY['revvin','rewvin','revvn','revvinn'] LOOP
    IF position(w IN flat) > 0 THEN RETURN 'reserved'; END IF;
  END LOOP;
  IF 'revin' = ANY(segs) OR 'rewin' = ANY(segs) THEN RETURN 'reserved'; END IF;
  -- Count matching segments, not substrings or distinct terms.
  SELECT count(*) INTO phishing_hits FROM unnest(segs) AS segment
   WHERE segment IN (SELECT translate(lower(term), '01345789@$|!', 'oieastbgasli') FROM unnest(public.fn_slug_blocked_terms()) AS term
     WHERE term NOT IN ('revvin','revin','rewin','rewvin','revvn','revvinn'));
  IF (cardinality(segs) = 1 AND phishing_hits = 1) OR phishing_hits >= 2 THEN RETURN 'reserved'; END IF;
  FOREACH w IN ARRAY ARRAY['fuck','shit','porn','slut','nigg'] LOOP
    IF position(w IN flat) > 0 THEN RETURN 'profanity'; END IF;
  END LOOP;
  FOREACH w IN ARRAY public.fn_slug_profanity() LOOP
    IF length(w) <= 4 THEN
      IF w = ANY (segs) OR flat = w THEN RETURN 'profanity'; END IF;
    ELSE
      IF position(w IN flat) > 0 THEN RETURN 'profanity'; END IF;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.fn_report_failure(p_step text,p_message text,p_code text,p_route text,p_business_id uuid,p_build_id text,p_user_agent text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE
 uid uuid := auth.uid(); bid uuid; b public.businesses%ROWTYPE;
 f public.app_failures%ROWTYPE; owner_email text; business_name text;
 daily integer; repeats integer; mid uuid := gen_random_uuid(); token text;
 body text; subject text; session_key text; bot_reason text;
BEGIN
 IF p_step IS NULL OR p_step NOT IN ('image_upload','logo_save','signup','business_create','setup_save','publish','unpublish','referral_submit','lead_status','closed_won','reward_paid','customer_import','job_done_ask','checkout','render_crash') THEN RETURN false; END IF;
 IF uid IS NOT NULL THEN
   SELECT * INTO b FROM public.businesses WHERE user_id=uid LIMIT 1;
   IF coalesce(b.is_demo,false) THEN RETURN false; END IF;
   bid:=b.id;
   IF p_business_id IS NOT NULL AND bid IS DISTINCT FROM p_business_id THEN
     IF p_step<>'referral_submit' THEN RETURN false; END IF;
     SELECT * INTO b FROM public.businesses WHERE id=p_business_id AND public.fn_page_live(account_status,is_published,is_disabled) LIMIT 1;
     bid:=b.id;
   END IF;
 ELSIF p_business_id IS NOT NULL THEN
   IF p_step<>'referral_submit' THEN RETURN false; END IF;
   SELECT * INTO b FROM public.businesses WHERE id=p_business_id AND public.fn_page_live(account_status,is_published,is_disabled) LIMIT 1;
   bid:=b.id;
 END IF;
 IF coalesce(b.is_demo,false) OR (p_business_id IS NOT NULL AND bid IS NULL) THEN RETURN false; END IF;
 IF NOT public.fn_rate_bucket_hit('failure:'||public.fn_request_bucket(),interval '1 hour',60)
    OR NOT public.fn_rate_bucket_hit('failure:global',interval '1 hour',3000) THEN RETURN false; END IF;
 INSERT INTO public.app_failures(step,message,code,route,business_id,user_id,build_id,user_agent)
 VALUES(p_step,public.fn_failure_scrub(p_message),public.fn_failure_scrub(p_code),
   CASE WHEN p_route LIKE '/%' THEN left(split_part(split_part(p_route,'?',1),'#',1),300) ELSE '/' END,
   bid,uid,left(p_build_id,100),left(p_user_agent,300)) RETURNING * INTO f;
 -- Each accepted report remains recorded, including bots and attempted recovery.
 session_key := substring(f.build_id FROM '\|s:([a-f0-9]{32})\|');
 bot_reason := public.fn_bot_reason(f.user_agent, CASE WHEN f.build_id LIKE '%|r:1' THEN 'present' ELSE '' END);
 IF bot_reason IS NOT NULL THEN RETURN true; END IF;
 -- Serialize reservations: sliding hourly throttle and Pacific calendar-day cap.
 PERFORM pg_advisory_xact_lock(320032);
 IF f.code = 'chunk_reload' AND f.message LIKE '%automatic recovery attempted%' THEN
   IF session_key IS NULL OR NOT EXISTS (
     SELECT 1 FROM public.app_failures previous WHERE previous.id <> f.id
       AND substring(previous.build_id FROM '\|s:([a-f0-9]{32})\|') = session_key
       AND previous.user_id IS NOT DISTINCT FROM f.user_id
       AND previous.created_at >= f.created_at - interval '60 seconds'
       AND previous.created_at <= f.created_at
   ) THEN RETURN true; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.failure_alerts WHERE step=p_step AND business_id IS NOT DISTINCT FROM bid AND sent_at>now()-interval '1 hour') THEN RETURN true; END IF;
 SELECT count(*) INTO daily FROM public.failure_alerts WHERE (sent_at AT TIME ZONE 'America/Los_Angeles')::date=(now() AT TIME ZONE 'America/Los_Angeles')::date;
 IF daily>=20 THEN RETURN true; END IF;
 SELECT count(*) INTO repeats FROM public.app_failures WHERE step=p_step AND business_id IS NOT DISTINCT FROM bid AND created_at>now()-interval '24 hours';
 business_name:=coalesce(b.name,'signed-out visitor');
 IF b.user_id IS NOT NULL THEN SELECT email INTO owner_email FROM auth.users WHERE id=b.user_id; END IF;
 subject:='[Customer] Revvin failure: '||p_step||' for '||left(regexp_replace(business_name,'[\r\n]',' ','g'),120);
 body:='Real visitor'||CASE WHEN bid IS NOT NULL THEN ': '||regexp_replace(business_name,'[\r\n]',' ','g')||' ('||coalesce(owner_email,'email unknown')||')' ELSE '' END||E'\nStep: '||p_step||E'\nError: '||f.message||E'\nCode: '||coalesce(f.code,'')||E'\nBusiness: '||business_name||E'\nOwner email: '||coalesce(owner_email,'unknown')||E'\nRoute: '||f.route||E'\nTime (Pacific): '||to_char(now() AT TIME ZONE 'America/Los_Angeles','YYYY-MM-DD HH24:MI:SS')||E'\nSame failure in last 24 hours: '||repeats||E'\nFailures list: https://revvin.co/__sa?tab=failures';
 IF daily=19 THEN body:=body||E'\nAlerts paused until midnight Pacific, check the failures list'; END IF;
 SELECT t.token INTO token FROM public.email_unsubscribe_tokens t WHERE lower(t.email)='info@revvin.co' LIMIT 1;
 IF token IS NULL THEN token:=replace(gen_random_uuid()::text,'-',''); INSERT INTO public.email_unsubscribe_tokens(token,email) VALUES(token,'info@revvin.co'); END IF;
 PERFORM public.enqueue_email('transactional_emails',jsonb_build_object(
   'to','info@revvin.co','from','Revvin <info@revvin.co>','reply_to','info@revvin.co',
   'sender_domain','notify.revvin.co','subject',subject,'text',body,
   'purpose','transactional','label','failure_alert','unsubscribe_token',token,
   'queued_at',to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   'idempotency_key','failure_alert:'||f.id::text,'message_id',mid::text));
 INSERT INTO public.failure_alerts(step,business_id,message_id) VALUES(p_step,bid,mid);
 RETURN true;
END $$;