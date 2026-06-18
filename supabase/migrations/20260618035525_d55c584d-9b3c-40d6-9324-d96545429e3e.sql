CREATE OR REPLACE FUNCTION public.fn_referral_privileged_unchanged(
  p_id uuid,
  p_status text,
  p_payout_status text,
  p_payment_status text,
  p_payout_amount numeric,
  p_payout_snapshot numeric,
  p_payout_type_snapshot text,
  p_deal_value numeric,
  p_business_id uuid,
  p_offer_id uuid,
  p_referrer_id uuid,
  p_payment_marked_at timestamptz
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.referrals
    WHERE id = p_id
      AND status                 IS NOT DISTINCT FROM p_status
      AND payout_status          IS NOT DISTINCT FROM p_payout_status
      AND payment_status         IS NOT DISTINCT FROM p_payment_status
      AND payout_amount          IS NOT DISTINCT FROM p_payout_amount
      AND payout_snapshot        IS NOT DISTINCT FROM p_payout_snapshot
      AND payout_type_snapshot   IS NOT DISTINCT FROM p_payout_type_snapshot
      AND deal_value             IS NOT DISTINCT FROM p_deal_value
      AND business_id            IS NOT DISTINCT FROM p_business_id
      AND offer_id               IS NOT DISTINCT FROM p_offer_id
      AND referrer_id            IS NOT DISTINCT FROM p_referrer_id
      AND payment_marked_at      IS NOT DISTINCT FROM p_payment_marked_at
  );
$$;

REVOKE EXECUTE ON FUNCTION public.fn_referral_privileged_unchanged(
  uuid, text, text, text, numeric, numeric, text, numeric, uuid, uuid, uuid, timestamptz
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_referral_privileged_unchanged(
  uuid, text, text, text, numeric, numeric, text, numeric, uuid, uuid, uuid, timestamptz
) TO authenticated, service_role;

DROP POLICY IF EXISTS "Referrers can update own referral status" ON public.referrals;

CREATE POLICY "Referrers can update own referral status"
ON public.referrals
FOR UPDATE
TO authenticated
USING (auth.uid() = referrer_id)
WITH CHECK (
  auth.uid() = referrer_id
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = referrals.business_id AND b.user_id = auth.uid()
    )
    OR public.fn_referral_privileged_unchanged(
      id,
      status,
      payout_status,
      payment_status,
      payout_amount,
      payout_snapshot,
      payout_type_snapshot,
      deal_value,
      business_id,
      offer_id,
      referrer_id,
      payment_marked_at
    )
  )
);
