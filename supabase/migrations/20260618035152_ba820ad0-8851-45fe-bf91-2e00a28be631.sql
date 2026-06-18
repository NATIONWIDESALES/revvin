-- Helper: returns true if every privileged column on the row matches the
-- supplied (NEW) values. SECURITY DEFINER so it can read the OLD row even
-- when called from an RLS WITH CHECK on the same table.
CREATE OR REPLACE FUNCTION public.fn_business_privileged_unchanged(
  p_id uuid,
  p_subscription_status text,
  p_account_status text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_stripe_connected_account_id text,
  p_stripe_connect_status text,
  p_verified boolean,
  p_is_disabled boolean,
  p_is_published boolean,
  p_launch_package_status text,
  p_current_period_end timestamptz
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE id = p_id
      AND subscription_status            IS NOT DISTINCT FROM p_subscription_status
      AND account_status                 IS NOT DISTINCT FROM p_account_status
      AND stripe_customer_id             IS NOT DISTINCT FROM p_stripe_customer_id
      AND stripe_subscription_id         IS NOT DISTINCT FROM p_stripe_subscription_id
      AND stripe_connected_account_id    IS NOT DISTINCT FROM p_stripe_connected_account_id
      AND stripe_connect_status          IS NOT DISTINCT FROM p_stripe_connect_status
      AND verified                       IS NOT DISTINCT FROM p_verified
      AND is_disabled                    IS NOT DISTINCT FROM p_is_disabled
      AND is_published                   IS NOT DISTINCT FROM p_is_published
      AND launch_package_status          IS NOT DISTINCT FROM p_launch_package_status
      AND current_period_end             IS NOT DISTINCT FROM p_current_period_end
  );
$$;

REVOKE EXECUTE ON FUNCTION public.fn_business_privileged_unchanged(
  uuid, text, text, text, text, text, text, boolean, boolean, boolean, text, timestamptz
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_business_privileged_unchanged(
  uuid, text, text, text, text, text, text, boolean, boolean, boolean, text, timestamptz
) TO authenticated, service_role;

-- Replace the owner UPDATE policy with one that blocks privileged-field edits.
-- service_role bypasses RLS entirely, so Stripe webhooks/edge functions are unaffected.
-- Admins keep an escape hatch via has_role().
DROP POLICY IF EXISTS "Owners update business" ON public.businesses;

CREATE POLICY "Owners update business"
ON public.businesses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.fn_business_privileged_unchanged(
      id,
      subscription_status,
      account_status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_connected_account_id,
      stripe_connect_status,
      verified,
      is_disabled,
      is_published,
      launch_package_status,
      current_period_end
    )
  )
);
