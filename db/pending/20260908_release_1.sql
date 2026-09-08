-- Revvin release 1 — REVIEWABLE, NOT YET APPLIED.
--
-- Preview and production share one database, so this file is intentionally NOT
-- run by this changeset. Deployment order:
--   1. Review this SQL.
--   2. Apply it (migration tool).
--   3. Regenerate generated types.
--   4. Ship the frontend from this changeset.
-- The frontend guest-referral form and the ROI close-date labels only work once
-- step 2 has run. Until then the release is not user-facing-ready.
--
-- Security reasoning is documented inline at each object.

-- ---------------------------------------------------------------------------
-- 1. Close-date attribution for revenue
-- ---------------------------------------------------------------------------
-- Revenue was attributed to the month the lead was CREATED, which reports money
-- in the wrong period. We record the moment a job is marked won and attribute by
-- that. Historical rows keep closed_at = NULL: unknown, never invented.
-- Reporting surfaces unknown separately from zero.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS closed_at timestamptz;

CREATE OR REPLACE FUNCTION public.fn_set_lead_closed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'closed_won' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_lead_closed_at ON public.leads;
CREATE TRIGGER trg_set_lead_closed_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_lead_closed_at();

-- ---------------------------------------------------------------------------
-- 2. Secure guest referral submission
-- ---------------------------------------------------------------------------
-- Two defects are fixed here:
--   (a) The anon INSERT policy on leads required an active/trialing/paid
--       subscription, so a genuinely free published page could not receive a
--       referral at all. Publishing is free, so eligibility must not depend on
--       billing. (Billing checks in unrelated functions are left alone.)
--   (b) The client inserted directly and then called .select() to read back
--       status_token. Anonymous visitors have no SELECT policy on leads, and
--       must never get one because leads are private tenant data, so the
--       returning read failed and the submission surfaced as an error.
--
-- The fix is one narrowly scoped SECURITY DEFINER RPC. It resolves the business
-- server-side from the public slug, so a caller can never target an arbitrary
-- business_id; it generates the status token server-side; and it returns only a
-- limited receipt (lead id, token, business name). No SELECT grant on leads is
-- added for anon or authenticated, and no policy on leads is loosened.
CREATE OR REPLACE FUNCTION public.fn_submit_public_referral(
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
SET search_path = public   -- pinned: a mutable search_path on a definer
                           -- function is a privilege-escalation vector
AS $$
DECLARE
  _biz    public.businesses%ROWTYPE;
  _lead   public.leads%ROWTYPE;
  _email  text := lower(btrim(coalesce(p_referrer_email, '')));
  _phone  text := btrim(coalesce(p_lead_phone, ''));
  _lemail text := lower(btrim(coalesce(p_lead_email, '')));
  _recent int;
BEGIN
  IF p_consent IS NOT TRUE THEN
    RAISE EXCEPTION 'consent_required';
  END IF;

  -- Eligibility resolved server-side from the slug. Unpublished, disabled and
  -- suspended businesses stay ineligible. Billing is deliberately not checked.
  SELECT * INTO _biz
    FROM public.businesses
   WHERE slug = lower(btrim(coalesce(p_slug, '')))
     AND is_published = true
     AND is_disabled = false
     AND coalesce(account_status, '') <> 'suspended'
   LIMIT 1;

  IF _biz.id IS NULL THEN
    RAISE EXCEPTION 'page_not_live';
  END IF;

  -- Input validation. Everything below is caller-supplied and untrusted.
  IF length(coalesce(btrim(p_referrer_name), '')) < 2 OR length(p_referrer_name) > 120 THEN
    RAISE EXCEPTION 'invalid_referrer_name';
  END IF;
  IF _email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' OR length(_email) > 255 THEN
    RAISE EXCEPTION 'invalid_referrer_email';
  END IF;
  IF length(coalesce(btrim(p_lead_name), '')) < 2 OR length(p_lead_name) > 120 THEN
    RAISE EXCEPTION 'invalid_lead_name';
  END IF;
  IF length(_phone) < 7 OR length(_phone) > 32 THEN
    RAISE EXCEPTION 'invalid_lead_phone';
  END IF;
  IF _lemail <> '' AND (_lemail !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' OR length(_lemail) > 255) THEN
    RAISE EXCEPTION 'invalid_lead_email';
  END IF;
  IF length(coalesce(btrim(p_lead_need), '')) < 3 OR length(p_lead_need) > 2000 THEN
    RAISE EXCEPTION 'invalid_lead_need';
  END IF;
  IF length(coalesce(p_relationship, '')) > 200 OR length(coalesce(p_referrer_phone, '')) > 32 THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  -- Duplicate-submit protection: the same lead phone or email for the same
  -- business inside 24 hours returns the ORIGINAL receipt instead of creating a
  -- second lead, so double taps and retries are idempotent.
  SELECT * INTO _lead
    FROM public.leads
   WHERE business_id = _biz.id
     AND created_at > now() - interval '24 hours'
     AND (lead_phone = _phone OR (_lemail <> '' AND lower(coalesce(lead_email, '')) = _lemail))
   ORDER BY created_at DESC
   LIMIT 1;

  IF _lead.id IS NOT NULL THEN
    RETURN json_build_object(
      'lead_id', _lead.id,
      'status_token', _lead.status_token,
      'business_name', _biz.name,
      'duplicate', true
    );
  END IF;

  -- Abuse check: cap submissions per referrer email per business per hour.
  SELECT count(*) INTO _recent
    FROM public.leads
   WHERE business_id = _biz.id
     AND lower(referrer_email) = _email
     AND created_at > now() - interval '1 hour';
  IF _recent >= 5 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  INSERT INTO public.leads (
    business_id, referrer_name, referrer_email, referrer_phone,
    lead_name, lead_phone, lead_email, lead_need, relationship_to_lead,
    consent_given, lead_source, status, referrer_user_id, status_token
  ) VALUES (
    _biz.id, btrim(p_referrer_name), _email, nullif(btrim(coalesce(p_referrer_phone, '')), ''),
    btrim(p_lead_name), _phone, nullif(_lemail, ''), btrim(p_lead_need),
    nullif(btrim(coalesce(p_relationship, '')), ''),
    true, 'public_page', 'new', auth.uid(), gen_random_uuid()
  )
  RETURNING * INTO _lead;

  RETURN json_build_object(
    'lead_id', _lead.id,
    'status_token', _lead.status_token,
    'business_name', _biz.name,
    'duplicate', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_submit_public_referral(
  text, text, text, text, text, text, boolean, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_submit_public_referral(
  text, text, text, text, text, text, boolean, text, text, text) TO anon, authenticated;

-- The direct anon INSERT path is retired. All public submissions now go through
-- the RPC above, the only place eligibility and validation live. The private
-- SELECT policies on leads (owner, claimed referrer, admin) are untouched.
DROP POLICY IF EXISTS "Public submit leads to published businesses" ON public.leads;

-- ---------------------------------------------------------------------------
-- 3. ROI by close date, with unknown kept distinct from zero
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_business_roi(
  p_business_id uuid,
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _leads_total int; _leads_won int; _leads_revenue numeric;
  _refs_total int;  _refs_won int;  _refs_revenue numeric;
  _unknown_close int; _missing_amount int;
BEGIN
  SELECT user_id INTO _owner FROM public.businesses WHERE id = p_business_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'business not found'; END IF;
  IF _owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Volume is counted by arrival date. Revenue is attributed by closed_at, the
  -- date the owner marked the job won. Rows with an unknown close date are
  -- excluded from the windowed revenue and reported separately.
  SELECT
    count(*) FILTER (WHERE (p_from IS NULL OR created_at >= p_from)
                       AND (p_to   IS NULL OR created_at <  p_to)),
    count(*) FILTER (WHERE status = 'closed_won' AND closed_at IS NOT NULL
                       AND (p_from IS NULL OR closed_at >= p_from)
                       AND (p_to   IS NULL OR closed_at <  p_to)),
    coalesce(sum(deal_value) FILTER (WHERE status = 'closed_won' AND closed_at IS NOT NULL
                       AND (p_from IS NULL OR closed_at >= p_from)
                       AND (p_to   IS NULL OR closed_at <  p_to)), 0),
    count(*) FILTER (WHERE status = 'closed_won' AND closed_at IS NULL),
    count(*) FILTER (WHERE status = 'closed_won' AND deal_value IS NULL)
  INTO _leads_total, _leads_won, _leads_revenue, _unknown_close, _missing_amount
  FROM public.leads
  WHERE business_id = p_business_id;

  SELECT
    count(*) FILTER (WHERE (p_from IS NULL OR created_at >= p_from)
                       AND (p_to   IS NULL OR created_at <  p_to)),
    count(*) FILTER (WHERE status = 'won'
                       AND (p_from IS NULL OR updated_at >= p_from)
                       AND (p_to   IS NULL OR updated_at <  p_to)),
    coalesce(sum(deal_value) FILTER (WHERE status = 'won'
                       AND (p_from IS NULL OR updated_at >= p_from)
                       AND (p_to   IS NULL OR updated_at <  p_to)), 0)
  INTO _refs_total, _refs_won, _refs_revenue
  FROM public.referrals
  WHERE business_id = p_business_id;

  RETURN json_build_object(
    'leads_total',              _leads_total + _refs_total,
    'closed_count',             _leads_won + _refs_won,
    'revenue',                  (_leads_revenue + _refs_revenue),
    'revenue_basis',            'owner_reported_close_date',
    'unknown_close_date_count', _unknown_close,
    'missing_amount_count',     _missing_amount
  );
END;
$$;
