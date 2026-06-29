-- Verifies prevent_consent_timestamp_rollback trigger on public.businesses.
-- Run inside a transaction and ROLLBACK so it is safe against the live DB:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/contact_consent_trigger.sql
-- Exits with an ERROR if any assertion fails.

BEGIN;

-- Seed an isolated owner + business row for this test.
DO $$
DECLARE
  _owner uuid := gen_random_uuid();
  _biz   uuid;
  _t0    timestamptz := now();
  _t1    timestamptz := now() + interval '1 hour';
  _err   text;
BEGIN
  INSERT INTO public.businesses (user_id, name, account_status)
  VALUES (_owner, 'consent trigger test', 'approved')
  RETURNING id INTO _biz;

  -- Simulate the owner being the authenticated caller.
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', _owner::text, 'role', 'authenticated')::text,
    true
  );
  SET LOCAL ROLE authenticated;

  -- 1) Initial set from NULL -> timestamp must succeed.
  UPDATE public.businesses
     SET contact_outreach_consent_at = _t1
   WHERE id = _biz;

  -- 2) Owner clearing back to NULL must FAIL.
  BEGIN
    UPDATE public.businesses
       SET contact_outreach_consent_at = NULL
     WHERE id = _biz;
    RAISE EXCEPTION 'TEST FAIL: owner was able to clear contact_outreach_consent_at';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS _err = MESSAGE_TEXT;
    IF _err NOT LIKE '%append-only%' THEN RAISE; END IF;
  END;

  -- 3) Owner moving the timestamp earlier must FAIL.
  BEGIN
    UPDATE public.businesses
       SET contact_outreach_consent_at = _t0
     WHERE id = _biz;
    RAISE EXCEPTION 'TEST FAIL: owner was able to backdate contact_outreach_consent_at';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS _err = MESSAGE_TEXT;
    IF _err NOT LIKE '%append-only%' THEN RAISE; END IF;
  END;

  -- 4) Owner moving the timestamp forward must SUCCEED.
  UPDATE public.businesses
     SET contact_outreach_consent_at = _t1 + interval '1 hour'
   WHERE id = _biz;

  -- 5) Service role / backend (auth.uid() IS NULL) may correct it freely.
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  UPDATE public.businesses
     SET contact_outreach_consent_at = NULL
   WHERE id = _biz;

  UPDATE public.businesses
     SET contact_outreach_consent_at = _t0
   WHERE id = _biz;

  RAISE NOTICE 'contact_consent_trigger.sql: all assertions passed';
END $$;

ROLLBACK;