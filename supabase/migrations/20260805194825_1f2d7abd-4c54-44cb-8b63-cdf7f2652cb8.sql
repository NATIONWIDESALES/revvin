DROP POLICY IF EXISTS "Public view active seasonal" ON public.seasonal_campaigns;

CREATE POLICY "Public view seasonal for visible offers"
ON public.seasonal_campaigns
FOR SELECT
USING (
  (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.offers o
      JOIN public.businesses b ON b.id = o.business_id
      WHERE o.id = seasonal_campaigns.offer_id
        AND o.status = 'active'
        AND o.approval_status = 'approved'
        AND b.marketplace_listed = true
        AND COALESCE(b.is_disabled, false) = false
        AND b.account_status = 'approved'
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.offers o
    JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id = seasonal_campaigns.offer_id
      AND b.user_id = auth.uid()
  )
);