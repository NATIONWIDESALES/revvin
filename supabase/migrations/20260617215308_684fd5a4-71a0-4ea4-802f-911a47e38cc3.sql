
-- 1. Attach existing trigger functions to enforce column-level restrictions
DROP TRIGGER IF EXISTS trg_prevent_business_privileged_updates ON public.businesses;
CREATE TRIGGER trg_prevent_business_privileged_updates
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.prevent_business_privileged_updates();

DROP TRIGGER IF EXISTS trg_prevent_referrer_privileged_updates ON public.referrals;
CREATE TRIGGER trg_prevent_referrer_privileged_updates
BEFORE UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.prevent_referrer_privileged_updates();

-- 2. Restrict system campaign templates read access to authenticated users only
DROP POLICY IF EXISTS "Anyone view system templates" ON public.campaign_templates;
CREATE POLICY "Authenticated view system templates"
ON public.campaign_templates
FOR SELECT
TO authenticated
USING (is_system = true);

-- 3. Make monthly_recap_log write-restriction explicit (service_role bypasses RLS)
CREATE POLICY "No client inserts on monthly_recap_log"
ON public.monthly_recap_log
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No client updates on monthly_recap_log"
ON public.monthly_recap_log
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No client deletes on monthly_recap_log"
ON public.monthly_recap_log
FOR DELETE
TO authenticated
USING (false);
