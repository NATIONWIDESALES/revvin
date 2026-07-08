DROP POLICY IF EXISTS "Public view reward tiers" ON public.reward_tiers;

CREATE POLICY "Public view reward tiers for visible offers"
ON public.reward_tiers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.offers o
    JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id = reward_tiers.offer_id
      AND o.status = 'active'
      AND o.approval_status = 'approved'
      AND b.marketplace_listed = true
      AND COALESCE(b.is_disabled, false) = false
      AND b.account_status = 'approved'
  )
  OR EXISTS (
    SELECT 1
    FROM public.offers o
    JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id = reward_tiers.offer_id
      AND b.user_id = auth.uid()
  )
);