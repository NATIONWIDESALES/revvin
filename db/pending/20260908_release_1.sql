-- Revvin release 1 — REVIEWABLE, NOT YET APPLIED.
--
-- Preview and production share one database, so this file is intentionally NOT
-- run by this changeset. Deployment order and rollback live in
-- db/pending/README.md. Nothing in this release is user-facing-ready until this
-- file has been reviewed and applied.
--
-- This is a full replacement of the earlier draft. The earlier draft was unsafe:
-- its duplicate-submit shortcut matched on the prospect's phone/email and
-- returned the ORIGINAL row's status_token, which handed one visitor another
-- referrer's private receipt. Idempotency here is keyed on a caller-generated
-- request id plus a payload fingerprint, never on prospect contact details.
--
-- Everything below is written to be re-runnable (idempotent DDL) so a partial
-- apply can simply be re-applied.

BEGIN;

-- ===========================================================================
-- 0. One shared definition of "this referral page is live"
-- ===========================================================================
-- Publishing is free. Eligibility to publish, to READ a page and to SUBMIT to a
-- page must be the same rule, and must not depend on billing. Abuse-disabled
-- and not-yet-approved accounts stay ineligible: 'approved' is required, which
-- is stricter (and correct) versus the draft's "anything except suspended".
CREATE OR REPLACE FUNCTION public.fn_page_live(
  p_account_status text,
  p_is_published   boolean,
  p_is_disabled    boolean
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT coalesce(p_is_published, false)
     AND NOT coalesce(p_is_disabled, true)
     AND coalesce(p_account_status, '') = 'approved'
$$;

COMMENT ON FUNCTION public.fn_page_live(text, boolean, boolean) IS
  'Single source of truth for public referral-page eligibility: approved, published, not disabled. Deliberately independent of subscription_status: publishing is free.';

-- Public read of a published page. The exported migration 20260729010459 for
-- businesses_public still required subscription_status in (active,trialing,paid),
-- which would leave every Free or canceled page unreadable, so the visitor never
-- reached the submit RPC at all. The live database was inspected read-only and
-- already carries the billing-independent predicate; this statement makes that
-- state reproducible from source and pins it to the shared helper.
-- Marketplace eligibility is NOT defined here: /browse and the marketplace keep
-- using businesses.marketplace_listed and the offers tables.
CREATE OR REPLACE VIEW public.businesses_public
WITH (security_invoker = false) AS
  SELECT id, user_id, name, logo_url, description, industry, website, city, state,
         latitude, longitude, verified, created_at, updated_at, slug, category,
         service_area, offer_amount, offer_trigger, offer_fine_print,
         is_published, is_disabled, account_status, subscription_status,
         brand_color, cover_image_url, headline, welcome_message,
         referral_cta_label, testimonials, plan
    FROM public.businesses
   WHERE public.fn_page_live(account_status, is_published, is_disabled);

GRANT SELECT ON public.businesses_public TO anon, authenticated;

-- ===========================================================================
-- 1. Outcome timestamps for revenue attribution (leads AND referrals)
-- ===========================================================================
-- updated_at is not a close date: editing notes or a payout moved revenue into
-- another month. Both tables get a real outcome timestamp.
--
-- Documented rule, identical for leads.closed_at and referrals.won_at:
--   * set to now() when the row ENTERS the won state, whether by INSERT or by
--     UPDATE (insert-as-won is handled);
--   * an explicitly supplied value is respected (backfills, imports);
--   * untouched by unrelated edits, so a note or payout edit cannot move the
--     revenue month;
--   * cleared when the row LEAVES the won state, and set again on re-win, so the
--     stamp always describes the current won outcome;
--   * NULL means unknown, never zero and never invented. Historical rows keep
--     NULL and reporting shows them as unknown.
ALTER TABLE public.leads     ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS won_at    timestamptz;

CREATE OR REPLACE FUNCTION public.fn_stamp_lead_closed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'closed_won' THEN
      NEW.closed_at := coalesce(NEW.closed_at, now());
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'closed_won' AND OLD.status IS DISTINCT FROM 'closed_won' THEN
    -- entering won (including re-win after a reopen)
    NEW.closed_at := coalesce(NULLIF(NEW.closed_at, OLD.closed_at), now());
  ELSIF NEW.status IS DISTINCT FROM 'closed_won' AND OLD.status = 'closed_won' THEN
    -- leaving won: the outcome no longer exists
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_stamp_referral_won_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'won' THEN
      NEW.won_at := coalesce(NEW.won_at, now());
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'won' AND OLD.status IS DISTINCT FROM 'won' THEN
    NEW.won_at := coalesce(NULLIF(NEW.won_at, OLD.won_at), now());
  ELSIF NEW.status IS DISTINCT FROM 'won' AND OLD.status = 'won' THEN
    NEW.won_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_lead_closed_at ON public.leads;  -- draft name
DROP TRIGGER IF EXISTS trg_stamp_lead_closed_at ON public.leads;
CREATE TRIGGER trg_stamp_lead_closed_at
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.fn_stamp_lead_closed_at();

DROP TRIGGER IF EXISTS trg_stamp_referral_won_at ON public.referrals;
CREATE TRIGGER trg_stamp_referral_won_at
  BEFORE INSERT OR UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.fn_stamp_referral_won_at();

-- No backfill. Existing won rows keep NULL because their real close date is not
-- knowable; all-time reporting still counts their revenue (see fn_get_business_roi).

-- ===========================================================================
-- 2. Guest submission: request-scoped idempotency, no cross-referrer leakage
-- ===========================================================================
-- One row per accepted client submission attempt. UNIQUE (business_id,
-- request_id) is the final invariant. The submission function also takes a
-- transaction-scoped request lock BEFORE creating a lead or trigger side effect.
CREATE TABLE IF NOT EXISTS public.referral_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  request_id    text NOT NULL,
  fingerprint   text NOT NULL,
  lead_id       uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_submissions_request_id_len CHECK (char_length(request_id) BETWEEN 24 AND 64),
  CONSTRAINT referral_submissions_tenant_request_key UNIQUE (business_id, request_id)
);

-- Explicit role revokes also remove grants inherited from deployment default ACLs.
-- Server-only table. It is written and read exclusively by the definer function
-- below, which runs as the table owner, so no client role gets any privilege and
-- RLS with no policy denies everything else.
REVOKE ALL ON TABLE public.referral_submissions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.referral_submissions TO service_role;
ALTER TABLE public.referral_submissions ENABLE ROW LEVEL SECURITY;

-- Atomic, bounded rate control. A count(*) over caller-supplied email was racy
-- and unbounded; this is one INSERT .. ON CONFLICT DO UPDATE returning the new
-- counter, so concurrent requests cannot both pass.
CREATE TABLE IF NOT EXISTS public.referral_rate_buckets (
  bucket_key   text        NOT NULL,
  window_start timestamptz NOT NULL,
  hits         integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);
REVOKE ALL ON TABLE public.referral_rate_buckets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.referral_rate_buckets TO service_role;
ALTER TABLE public.referral_rate_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_rate_bucket_hit(
  p_key      text,
  p_window   interval,
  p_max_hits integer
)
RETURNS boolean            -- true = within budget, false = over budget
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _start timestamptz := to_timestamp(floor(extract(epoch FROM now()) / extract(epoch FROM p_window)) * extract(epoch FROM p_window));
  _hits  integer;
BEGIN
  INSERT INTO public.referral_rate_buckets (bucket_key, window_start, hits)
  VALUES (left(p_key, 200), _start, 1)
  ON CONFLICT (bucket_key, window_start)
    DO UPDATE SET hits = public.referral_rate_buckets.hits + 1
  RETURNING hits INTO _hits;

  -- Opportunistic cleanup, bounded so it can never dominate a request.
  DELETE FROM public.referral_rate_buckets
   WHERE (bucket_key, window_start) IN (
     SELECT bucket_key, window_start FROM public.referral_rate_buckets
      WHERE window_start < now() - interval '2 days' LIMIT 200);

  RETURN _hits <= p_max_hits;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_rate_bucket_hit(text, interval, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_rate_bucket_hit(text, interval, integer) TO service_role;

-- Durable owner-notification work item. One row per (lead, event); the UNIQUE
-- constraint is the dedupe. Written in the SAME transaction as the lead, so a
-- browser that closes, a dropped connection or a provider outage cannot lose it.
CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  lead_id             uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  event               text NOT NULL,
  -- pending -> claimed -> sent | failed ; attempts/next_attempt_at drive retry.
  status              text NOT NULL DEFAULT 'pending',
  attempts            integer NOT NULL DEFAULT 0,
  next_attempt_at     timestamptz NOT NULL DEFAULT now(),
  claimed_at          timestamptz,
  claim_token         uuid,
  in_app_notified_at   timestamptz,
  sent_at             timestamptz,
  provider_message_id text,
  last_error          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_jobs_status_check CHECK (status IN ('pending','claimed','sent','failed')),
  CONSTRAINT notification_jobs_lead_event_key UNIQUE (lead_id, event)
);
ALTER TABLE public.notification_jobs ADD COLUMN IF NOT EXISTS claim_token uuid;
ALTER TABLE public.notification_jobs ADD COLUMN IF NOT EXISTS in_app_notified_at timestamptz;
REVOKE ALL ON TABLE public.notification_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.notification_jobs TO service_role;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS notification_jobs_due_idx
  ON public.notification_jobs (next_attempt_at)
  WHERE status IN ('pending', 'claimed');

DROP TRIGGER IF EXISTS trg_notification_jobs_updated_at ON public.notification_jobs;
CREATE TRIGGER trg_notification_jobs_updated_at
  BEFORE UPDATE ON public.notification_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- The one public write path for guest referrals.
-- ---------------------------------------------------------------------------
-- Signature note: p_request_id is required and comes first. The browser
-- generates it once per real submission (crypto.randomUUID + a nonce) and reuses
-- it for retries of that same submission. It is NOT the receipt token: the
-- receipt token stays server-generated and is only ever returned to the request
-- that owns it.
DROP FUNCTION IF EXISTS public.fn_submit_public_referral(
  text, text, text, text, text, text, boolean, text, text, text);

CREATE OR REPLACE FUNCTION public.fn_submit_public_referral(
  p_request_id     text,
  p_slug           text,
  p_referrer_name  text,
  p_referrer_email text,
  p_lead_name      text,
  p_lead_phone     text,
  p_lead_need      text,
  p_consent        boolean,
  p_referrer_phone text DEFAULT NULL,
  p_lead_email     text DEFAULT NULL,
  p_relationship   text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public   -- pinned: a mutable search_path on a
                                       -- definer function is an escalation vector
AS $$
DECLARE
  _biz     public.businesses%ROWTYPE;
  _lead    public.leads%ROWTYPE;
  _sub     public.referral_submissions%ROWTYPE;
  _req     text := btrim(coalesce(p_request_id, ''));
  _name    text := btrim(coalesce(p_referrer_name, ''));
  _email   text := lower(btrim(coalesce(p_referrer_email, '')));
  _rphone  text := nullif(btrim(coalesce(p_referrer_phone, '')), '');
  _lname   text := btrim(coalesce(p_lead_name, ''));
  _lphone  text := btrim(coalesce(p_lead_phone, ''));
  _lemail  text := lower(btrim(coalesce(p_lead_email, '')));
  _need    text := btrim(coalesce(p_lead_need, ''));
  _rel     text := nullif(btrim(coalesce(p_relationship, '')), '');
  _fp      text;
BEGIN
  IF p_consent IS NOT TRUE THEN
    RAISE EXCEPTION 'consent_required';
  END IF;

  -- High-entropy request id, format-checked before it reaches the unique index.
  IF _req !~ '^[a-zA-Z0-9_-]{24,64}$' THEN
    RAISE EXCEPTION 'invalid_request_id';
  END IF;

  -- Eligibility resolved server-side from the public slug: a caller can never
  -- name a business_id, and billing is deliberately not consulted.
  SELECT * INTO _biz
    FROM public.businesses
   WHERE slug = lower(btrim(coalesce(p_slug, '')))
     AND public.fn_page_live(account_status, is_published, is_disabled)
   LIMIT 1 FOR SHARE;

  IF _biz.id IS NULL THEN
    RAISE EXCEPTION 'page_not_live';
  END IF;

  -- Normalise and bound every caller-supplied field.
  IF char_length(_name)  < 2 OR char_length(_name)  > 120  THEN RAISE EXCEPTION 'invalid_referrer_name';  END IF;
  IF _email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' OR char_length(_email) > 255
                                                            THEN RAISE EXCEPTION 'invalid_referrer_email'; END IF;
  IF char_length(_lname) < 2 OR char_length(_lname) > 120  THEN RAISE EXCEPTION 'invalid_lead_name';      END IF;
  IF char_length(_lphone) < 7 OR char_length(_lphone) > 32 THEN RAISE EXCEPTION 'invalid_lead_phone';     END IF;
  IF _lemail <> '' AND (_lemail !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' OR char_length(_lemail) > 255)
                                                            THEN RAISE EXCEPTION 'invalid_lead_email';     END IF;
  IF char_length(_need)  < 3 OR char_length(_need)  > 2000 THEN RAISE EXCEPTION 'invalid_lead_need';      END IF;
  IF char_length(coalesce(_rel, '')) > 200 OR char_length(coalesce(_rphone, '')) > 32
                                                            THEN RAISE EXCEPTION 'invalid_input';          END IF;

  -- Fingerprint of the NORMALISED payload. Same request id + same payload is a
  -- retry; same request id + different payload is rejected generically.
  _fp := md5(jsonb_build_array(
    _biz.id, _name, _email, _rphone, _lname, _lphone, _lemail, _need, _rel)::text);

  -- Serialize this request before INSERTing a lead. A hash collision only
  -- serializes unrelated requests; tenant/request uniqueness remains exact.
  -- This prevents losing retries from creating phantom lead.created webhooks.
  PERFORM pg_advisory_xact_lock(hashtextextended('revvin-referral:' || _biz.id::text || ':' || _req, 0));

  -- Fast path for a retry that already succeeded. Scoped to (business,
  -- request_id) only: prospect contact details are never used to find a row, so
  -- one visitor can never surface another referrer's receipt.
  SELECT * INTO _sub
    FROM public.referral_submissions
   WHERE business_id = _biz.id AND request_id = _req
   LIMIT 1;

  IF _sub.id IS NOT NULL THEN
    IF _sub.fingerprint <> _fp THEN
      RAISE EXCEPTION 'submission_conflict';   -- generic on purpose: no detail leaks
    END IF;
    SELECT * INTO _lead FROM public.leads WHERE id = _sub.lead_id LIMIT 1;
    IF _lead.id IS NULL THEN RAISE EXCEPTION 'submission_conflict'; END IF;
    RETURN json_build_object(
      'lead_id', _lead.id,
      'status_token', _lead.status_token,
      'business_name', _biz.name,
      'replay', true);
  END IF;

  -- Bounded, atomic abuse controls: per referrer email per business per hour,
  -- and a per-business ceiling so one page cannot be flooded from many mailboxes.
  IF NOT public.fn_rate_bucket_hit('ref:' || _biz.id::text || ':' || md5(_email), interval '1 hour', 5) THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  IF NOT public.fn_rate_bucket_hit('biz:' || _biz.id::text, interval '1 hour', 60) THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  -- Status, source, receipt token and referrer attribution are assigned here,
  -- server-side. auth.uid() is NULL for a guest and is only ever used to link a
  -- signed-in referrer to their own row.
  INSERT INTO public.leads (
    business_id, referrer_name, referrer_email, referrer_phone,
    lead_name, lead_phone, lead_email, lead_need, relationship_to_lead,
    consent_given, lead_source, status, referrer_user_id, status_token
  ) VALUES (
    _biz.id, _name, _email, _rphone,
    _lname, _lphone, nullif(_lemail, ''), _need, _rel,
    true, 'public_page', 'new', auth.uid(), gen_random_uuid()
  )
  RETURNING * INTO _lead;

  -- The request lock is held until commit. The unique constraint also protects
  -- against incompatible writers; an unexpected conflict rolls back the lead
  -- AND every trigger effect rather than deleting only the lead afterwards.
  INSERT INTO public.referral_submissions (business_id, request_id, fingerprint, lead_id)
  VALUES (_biz.id, _req, _fp, _lead.id);

  -- Durable owner notification, committed with the lead. The visitor does not
  -- have to call anything; the worker drains this queue. Recipients are resolved
  -- by the worker from the owner's settings, never by the caller.
  INSERT INTO public.notification_jobs (business_id, lead_id, event)
  VALUES (_biz.id, _lead.id, 'new_lead')
  ON CONFLICT (lead_id, event) DO NOTHING;

  RETURN json_build_object(
    'lead_id', _lead.id,
    'status_token', _lead.status_token,
    'business_name', _biz.name,
    'replay', false);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_submit_public_referral(
  text, text, text, text, text, text, text, boolean, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_submit_public_referral(
  text, text, text, text, text, text, text, boolean, text, text, text) TO anon, authenticated;

-- Inventory of direct public write paths into leads: the anon/authenticated
-- INSERT policy below was the only one (verified read-only against pg_policies:
-- leads has owner SELECT/UPDATE, referrer SELECT, admin SELECT, and this INSERT).
-- It also carried the wrong rule, requiring a subscription to receive a
-- referral. It is retired so the RPC is the single validated entry point, and no
-- SELECT privilege is granted to anon anywhere: leads stay private tenant data.
DROP POLICY IF EXISTS "Public submit leads to published businesses" ON public.leads;

-- ---------------------------------------------------------------------------
-- Notification worker contract (service_role only)
-- ---------------------------------------------------------------------------
-- Claim is a conditional UPDATE, so two worker runs cannot claim the same job.
-- attempts is incremented at CLAIM time (attempted), and 'sent' is only written
-- by fn_finish_notification_job with provider evidence.
CREATE OR REPLACE FUNCTION public.fn_claim_notification_jobs(p_limit integer DEFAULT 10)
RETURNS SETOF public.notification_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- A final worker crash must also become visible as a terminal failure.
  UPDATE public.notification_jobs
     SET status = 'failed', claim_token = NULL,
         last_error = coalesce(last_error, 'Notification retry limit reached')
   WHERE status IN ('pending', 'claimed') AND attempts >= 6
     AND next_attempt_at <= now();

  RETURN QUERY
  UPDATE public.notification_jobs j
     SET status = 'claimed',
         claimed_at = now(),
         claim_token = gen_random_uuid(),
         attempts = j.attempts + 1,
         -- If the worker dies mid-flight the job becomes due again, with backoff.
         next_attempt_at = now() + (least(j.attempts + 1, 6) * interval '5 minutes')
   WHERE j.id IN (
     SELECT id FROM public.notification_jobs
      WHERE status IN ('pending', 'claimed')
        AND next_attempt_at <= now()
        AND attempts < 6
      ORDER BY next_attempt_at
      FOR UPDATE SKIP LOCKED
      LIMIT greatest(1, least(coalesce(p_limit, 10), 50)))
  RETURNING j.*;
END;
$$;

DROP FUNCTION IF EXISTS public.fn_finish_notification_job(uuid, text, text, text);
CREATE OR REPLACE FUNCTION public.fn_finish_notification_job(
  p_job_id             uuid,
  p_claim_token        uuid,
  p_outcome            text,          -- 'sent' | 'retry' | 'failed'
  p_provider_message_id text DEFAULT NULL,
  p_error              text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _changed integer;
  _lead_id uuid;
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('sent', 'retry', 'failed') THEN
    RAISE EXCEPTION 'invalid_outcome';
  END IF;
  IF p_outcome = 'sent' AND nullif(btrim(p_provider_message_id), '') IS NULL THEN
    RAISE EXCEPTION 'provider_evidence_required';
  END IF;

  UPDATE public.notification_jobs
     SET status = CASE p_outcome WHEN 'sent' THEN 'sent'
                                 WHEN 'failed' THEN 'failed'
                                 WHEN 'retry' THEN CASE WHEN attempts >= 6 THEN 'failed' ELSE 'pending' END
                                 ELSE 'pending' END,
         sent_at = CASE WHEN p_outcome = 'sent' THEN now() ELSE sent_at END,
         provider_message_id = coalesce(p_provider_message_id, provider_message_id),
         last_error = CASE WHEN p_outcome = 'sent' THEN NULL ELSE left(coalesce(p_error, ''), 500) END,
         claim_token = NULL
   WHERE id = p_job_id AND status = 'claimed'
     AND claim_token = p_claim_token AND p_claim_token IS NOT NULL
   RETURNING lead_id INTO _lead_id;
  GET DIAGNOSTICS _changed = ROW_COUNT;
  IF _changed = 1 AND p_outcome = 'sent' THEN
    UPDATE public.leads SET owner_notified_at = coalesce(owner_notified_at, now()) WHERE id = _lead_id;
  END IF;
  RETURN _changed = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_claim_notification_jobs(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_finish_notification_job(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_claim_notification_jobs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_finish_notification_job(uuid, uuid, text, text, text) TO service_role;

-- The notification and marker share a transaction, so every email retry sees
-- the same single in-app notice. The worker never supplies its recipient/body.
CREATE OR REPLACE FUNCTION public.fn_ensure_lead_notification(p_job_id uuid, p_claim_token uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _job public.notification_jobs%ROWTYPE;
  _lead public.leads%ROWTYPE;
  _biz public.businesses%ROWTYPE;
BEGIN
  SELECT * INTO _job FROM public.notification_jobs
   WHERE id = p_job_id AND status = 'claimed' AND claim_token = p_claim_token
   FOR UPDATE;
  IF _job.id IS NULL THEN RETURN false; END IF;
  IF _job.in_app_notified_at IS NOT NULL THEN RETURN true; END IF;
  SELECT * INTO _lead FROM public.leads WHERE id = _job.lead_id AND business_id = _job.business_id;
  SELECT * INTO _biz FROM public.businesses WHERE id = _job.business_id;
  IF _lead.id IS NULL OR _biz.id IS NULL OR _biz.is_demo IS TRUE THEN RETURN false; END IF;
  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (_biz.user_id, 'New referral: ' || _lead.lead_name,
          'Referred by ' || _lead.referrer_name || '. Reach out today while it is fresh.', 'referral_submitted');
  UPDATE public.notification_jobs SET in_app_notified_at = now() WHERE id = _job.id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_ensure_lead_notification(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ensure_lead_notification(uuid, uuid) TO service_role;

-- Backfill work items for leads that arrived before this release and were never
-- notified, so nothing already in the table is silently dropped.
INSERT INTO public.notification_jobs (business_id, lead_id, event, status, sent_at)
SELECT l.business_id, l.id, 'new_lead',
       CASE WHEN l.owner_notified_at IS NOT NULL THEN 'sent' ELSE 'pending' END,
       l.owner_notified_at
  FROM public.leads l
 WHERE l.created_at > now() - interval '30 days'
ON CONFLICT (lead_id, event) DO NOTHING;

-- ===========================================================================
-- 3. ROI: NULL-safe authorization, real close dates, unknown kept unknown
-- ===========================================================================
-- The previous body compared `_owner <> auth.uid()`, which is NULL for an
-- anonymous caller. NULL is not true, so the branch did not raise and the
-- function fell through. Anonymous identity is now rejected explicitly, and
-- authorization is written NULL-safe.
CREATE OR REPLACE FUNCTION public.fn_get_business_roi(
  p_business_id uuid,
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _owner uuid;
  _uid   uuid := auth.uid();
  _is_service boolean := coalesce(auth.role() = 'service_role', false);
  _windowed boolean := (p_from IS NOT NULL OR p_to IS NOT NULL);
  _leads_total int; _leads_won int; _leads_revenue numeric;
  _refs_total int;  _refs_won int;  _refs_revenue numeric;
  _unknown_close int; _unknown_referral_close int; _missing_amount int; _missing_referral_amount int;
BEGIN
  SELECT user_id INTO _owner FROM public.businesses WHERE id = p_business_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'business_not_found'; END IF;

  -- A trusted backend caller (monthly recap worker) is allowed explicitly.
  IF NOT _is_service THEN
    IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
    IF NOT (_owner IS NOT DISTINCT FROM _uid OR public.has_role(_uid, 'admin')) THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  END IF;

  -- Volume counts by arrival date. Revenue is attributed by the outcome date.
  -- In a DATE WINDOW, rows with an unknown outcome date are excluded and counted
  -- separately. For ALL TIME (no window) they are included, so historic revenue
  -- is never silently dropped.
  SELECT
    count(*) FILTER (WHERE (p_from IS NULL OR created_at >= p_from)
                       AND (p_to   IS NULL OR created_at <  p_to)),
    count(*) FILTER (WHERE status = 'closed_won'
                       AND (NOT _windowed OR (closed_at IS NOT NULL
                            AND (p_from IS NULL OR closed_at >= p_from)
                            AND (p_to   IS NULL OR closed_at <  p_to)))),
    coalesce(sum(deal_value) FILTER (WHERE status = 'closed_won'
                       AND (NOT _windowed OR (closed_at IS NOT NULL
                            AND (p_from IS NULL OR closed_at >= p_from)
                            AND (p_to   IS NULL OR closed_at <  p_to)))), 0),
    count(*) FILTER (WHERE status = 'closed_won' AND closed_at IS NULL),
    count(*) FILTER (WHERE status = 'closed_won' AND deal_value IS NULL
                       AND (NOT _windowed OR closed_at IS NULL OR
                            ((p_from IS NULL OR closed_at >= p_from) AND (p_to IS NULL OR closed_at < p_to))))
  INTO _leads_total, _leads_won, _leads_revenue, _unknown_close, _missing_amount
  FROM public.leads
  WHERE business_id = p_business_id;

  SELECT
    count(*) FILTER (WHERE (p_from IS NULL OR created_at >= p_from)
                       AND (p_to   IS NULL OR created_at <  p_to)),
    count(*) FILTER (WHERE status = 'won'
                       AND (NOT _windowed OR (won_at IS NOT NULL
                            AND (p_from IS NULL OR won_at >= p_from)
                            AND (p_to   IS NULL OR won_at <  p_to)))),
    coalesce(sum(deal_value) FILTER (WHERE status = 'won'
                       AND (NOT _windowed OR (won_at IS NOT NULL
                            AND (p_from IS NULL OR won_at >= p_from)
                            AND (p_to   IS NULL OR won_at <  p_to)))), 0),
    count(*) FILTER (WHERE status = 'won' AND won_at IS NULL),
    count(*) FILTER (WHERE status = 'won' AND deal_value IS NULL
                       AND (NOT _windowed OR won_at IS NULL OR
                            ((p_from IS NULL OR won_at >= p_from) AND (p_to IS NULL OR won_at < p_to))))
  INTO _refs_total, _refs_won, _refs_revenue, _unknown_referral_close, _missing_referral_amount
  FROM public.referrals
  WHERE business_id = p_business_id;

  RETURN json_build_object(
    'leads_total',              _leads_total + _refs_total,
    'closed_count',             _leads_won + _refs_won,
    'revenue',                  (_leads_revenue + _refs_revenue),
    'revenue_basis',            CASE WHEN _windowed THEN 'owner_reported_by_close_date'
                                     ELSE 'owner_reported_all_time' END,
    'windowed',                 _windowed,
    'unknown_close_date_count', _unknown_close + _unknown_referral_close,
    'missing_amount_count',     _missing_amount + _missing_referral_amount
  );
END;
$$;

-- anon must not reach reporting at all; the trusted worker is named explicitly.
REVOKE ALL ON FUNCTION public.fn_get_business_roi(uuid, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_get_business_roi(uuid, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_business_roi(uuid, timestamptz, timestamptz) TO authenticated, service_role;

-- ===========================================================================
-- 4. Payment integrity: an authoritative, server-only payment record
-- ===========================================================================
-- The webhook did SELECT-then-INSERT on funnel_events and ignored write errors
-- before answering 200, so a concurrent redelivery could double count and a
-- failed write was lost forever. Money now lands in its own table whose UNIQUE
-- invoice id makes persistence atomic and idempotent; the webhook distinguishes
-- "duplicate" (safe, return 200) from "transient failure" (return 500 so Stripe
-- retries). Payment identity is the invoice, never a browser session.
CREATE TABLE IF NOT EXISTS public.stripe_payments (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id      text NOT NULL,
  stripe_subscription_id text,
  stripe_customer_id     text,
  business_id            uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  amount_paid_cents      bigint NOT NULL,
  currency               text   NOT NULL,
  -- true only when money actually moved. A zero-charge trial invoice is recorded
  -- for completeness with collected = false and is never counted as revenue.
  collected              boolean NOT NULL,
  -- 'first_payment' for this business's first collected invoice, else 'renewal'.
  billing_reason         text,
  kind                   text NOT NULL,
  paid_at                timestamptz NOT NULL DEFAULT now(),
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stripe_payments_invoice_key UNIQUE (stripe_invoice_id),
  CONSTRAINT stripe_payments_kind_check CHECK (kind IN ('first_payment','renewal','no_charge'))
);
ALTER TABLE public.stripe_payments DROP CONSTRAINT IF EXISTS stripe_payments_kind_check;
UPDATE public.stripe_payments SET kind = 'no_charge' WHERE kind = 'trial_no_charge';
ALTER TABLE public.stripe_payments ADD CONSTRAINT stripe_payments_kind_check
  CHECK (kind IN ('first_payment','renewal','no_charge'));
REVOKE ALL ON TABLE public.stripe_payments FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.stripe_payments TO service_role;
ALTER TABLE public.stripe_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read payments" ON public.stripe_payments;
CREATE POLICY "Admins read payments" ON public.stripe_payments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.stripe_payments TO authenticated;

-- Only the verified payment handler may call this. Business-row locking orders
-- distinct invoice events as well as replay, and classification uses paid_at
-- rather than arrival order. A delayed earlier invoice corrects first/renewal
-- labels atomically without changing recorded invoice facts.
CREATE OR REPLACE FUNCTION public.fn_record_stripe_payment(
  p_invoice_id text,
  p_subscription_id text,
  p_customer_id text,
  p_business_id uuid,
  p_amount_paid_cents bigint,
  p_currency text,
  p_billing_reason text,
  p_paid_at timestamptz
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _biz public.businesses%ROWTYPE;
  _payment public.stripe_payments%ROWTYPE;
  _first_id uuid;
  _inserted_id uuid;
BEGIN
  IF nullif(btrim(p_invoice_id), '') IS NULL OR char_length(p_invoice_id) > 255
     OR nullif(btrim(p_subscription_id), '') IS NULL OR char_length(p_subscription_id) > 255
     OR p_amount_paid_cents IS NULL OR p_amount_paid_cents < 0
     OR p_currency IS NULL OR upper(p_currency) !~ '^[A-Z]{3}$' OR p_paid_at IS NULL THEN
    RAISE EXCEPTION 'invalid_payment';
  END IF;
  SELECT * INTO _biz FROM public.businesses
   WHERE id = p_business_id AND stripe_subscription_id = p_subscription_id
   FOR UPDATE;
  IF _biz.id IS NULL THEN RAISE EXCEPTION 'payment_business_not_found'; END IF;

  INSERT INTO public.stripe_payments (
    stripe_invoice_id, stripe_subscription_id, stripe_customer_id, business_id,
    amount_paid_cents, currency, collected, billing_reason, kind, paid_at)
  VALUES (p_invoice_id, p_subscription_id, p_customer_id, _biz.id,
    p_amount_paid_cents, upper(p_currency), p_amount_paid_cents > 0, p_billing_reason,
    CASE WHEN p_amount_paid_cents > 0 THEN 'renewal' ELSE 'no_charge' END, p_paid_at)
  ON CONFLICT (stripe_invoice_id) DO NOTHING RETURNING id INTO _inserted_id;

  SELECT * INTO _payment FROM public.stripe_payments WHERE stripe_invoice_id = p_invoice_id;
  IF _payment.business_id IS DISTINCT FROM _biz.id
     OR _payment.stripe_subscription_id IS DISTINCT FROM p_subscription_id
     OR _payment.amount_paid_cents IS DISTINCT FROM p_amount_paid_cents
     OR _payment.currency IS DISTINCT FROM upper(p_currency)
     OR _payment.paid_at IS DISTINCT FROM p_paid_at THEN
    RAISE EXCEPTION 'payment_conflict';
  END IF;

  SELECT id INTO _first_id FROM public.stripe_payments
   WHERE business_id = _biz.id AND collected = true
   ORDER BY paid_at, stripe_invoice_id LIMIT 1;
  UPDATE public.stripe_payments
     SET kind = CASE WHEN NOT collected THEN 'no_charge'
                     WHEN id = _first_id THEN 'first_payment' ELSE 'renewal' END
   WHERE business_id = _biz.id;
  SELECT * INTO _payment FROM public.stripe_payments WHERE id = _payment.id;
  RETURN json_build_object('id', _payment.id, 'duplicate', _inserted_id IS NULL,
                           'kind', _payment.kind, 'collected', _payment.collected);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_record_stripe_payment(text,text,text,uuid,bigint,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_record_stripe_payment(text,text,text,uuid,bigint,text,text,timestamptz) TO service_role;

-- ===========================================================================
-- 5. Funnel event RLS: allowed client events only, server facts stay server-side
-- ===========================================================================
-- The deployed policy (from 20260807133537, verified read-only) allows a
-- 'checkout_succeeded' name the app no longer sends, and omits the current
-- client events, so those inserts are silently rejected. This restates the
-- allow-list. subscription_activated and payment_collected are deliberately NOT
-- insertable by a client: they are verified server facts written with the
-- service role.
DROP POLICY IF EXISTS "Anyone can record an allowed funnel event" ON public.funnel_events;
CREATE POLICY "Anyone can record an allowed funnel event"
  ON public.funnel_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(event) <= 64
    AND event = ANY (ARRAY[
      'page_viewed','signup_viewed','signup_submitted','signup_succeeded','signup_failed',
      'onboarding_started','onboarding_completed','go_live_clicked','publish_page_clicked',
      'checkout_redirected','checkout_canceled','email_lead_submitted','referral_submitted',
      'sample_page_viewed','promo_popup_shown','promo_cta_clicked','invite_link_opened',
      'invite_code_entered','invite_landing_viewed','signup_form_started','invite_cta_clicked',
      'cta_clicked','demo_started','demo_completed','page_published','first_ask_prepared'
    ])
    AND (session_id IS NULL OR length(session_id) <= 64)
    AND (path IS NULL OR length(path) <= 512)
    AND (referrer IS NULL OR length(referrer) <= 512)
    AND (user_agent IS NULL OR length(user_agent) <= 512)
  );

COMMIT;

-- ===========================================================================
-- 6. OPTIONAL, APPLY SEPARATELY: scheduled drain of notification_jobs
-- ===========================================================================
-- The email queue already runs this exact pattern (public.email_queue_dispatch
-- uses pg_cron + net.http_post + the vault-held service key). The statement
-- below reuses it for the notification worker so no visitor request is needed.
-- It is left commented out because it depends on operator-held infrastructure
-- (the vault secret name and cron availability) that cannot be verified from
-- this changeset. Until it is scheduled, the worker must be invoked by the
-- existing operator cron; jobs are durable either way and nothing is lost.
--
-- SELECT cron.schedule(
--   'drain-notification-jobs', '*/2 * * * *',
--   $cron$
--     SELECT net.http_post(
--       url := 'https://<project>.supabase.co/functions/v1/notify-new-lead',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets
--                                         WHERE name = 'email_queue_service_role_key')),
--       body := '{"drain":true}'::jsonb);
--   $cron$);
