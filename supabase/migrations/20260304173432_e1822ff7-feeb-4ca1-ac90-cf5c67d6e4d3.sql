
-- Allow admins to insert offers without the deposit_status restriction
DROP POLICY IF EXISTS "Business owners manage offers" ON public.offers;
CREATE POLICY "Business owners manage offers" ON public.offers
  FOR INSERT WITH CHECK (
    (
      EXISTS (SELECT 1 FROM businesses WHERE businesses.id = offers.business_id AND businesses.user_id = auth.uid())
      AND deposit_status = 'required'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );
