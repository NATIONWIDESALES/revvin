
DROP POLICY IF EXISTS "Public offers viewable" ON public.offers;
CREATE POLICY "Public offers viewable" ON public.offers
  FOR SELECT
  USING (
    (status = 'active' AND approval_status = 'approved')
    OR EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = offers.business_id
      AND businesses.user_id = auth.uid()
    )
  );
