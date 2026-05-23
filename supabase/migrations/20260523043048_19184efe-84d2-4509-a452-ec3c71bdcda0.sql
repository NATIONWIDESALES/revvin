ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS marketplace_listed boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Public offers viewable" ON public.offers;

CREATE POLICY "Public offers viewable"
ON public.offers
FOR SELECT
USING (
  (
    status = 'active'
    AND approval_status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = offers.business_id
        AND b.account_status <> 'suspended'
        AND b.marketplace_listed = true
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = offers.business_id
      AND b.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);