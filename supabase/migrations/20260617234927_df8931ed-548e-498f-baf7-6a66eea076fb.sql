
-- 1. Optional link from a public-page submission to a Revvin account.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS referrer_user_id uuid;

-- 2. Lookup indexes used by the dashboard query and the claim function.
CREATE INDEX IF NOT EXISTS leads_referrer_user_id_idx
  ON public.leads (referrer_user_id);

CREATE INDEX IF NOT EXISTS leads_referrer_email_lower_idx
  ON public.leads (lower(referrer_email));

-- 3. RLS: a signed-in user can read their own claimed leads.
DROP POLICY IF EXISTS "Referrers view own claimed leads" ON public.leads;
CREATE POLICY "Referrers view own claimed leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (referrer_user_id = auth.uid());

-- 4. Claim function: matches by the caller's verified email in auth.users.
--    Only updates rows where referrer_user_id is still null, so it never
--    steals a claim from someone else.
CREATE OR REPLACE FUNCTION public.fn_claim_referrer_leads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _updated integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT lower(email) INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL OR _email = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.leads
     SET referrer_user_id = auth.uid()
   WHERE referrer_user_id IS NULL
     AND lower(referrer_email) = _email;

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_claim_referrer_leads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_claim_referrer_leads() TO authenticated;
