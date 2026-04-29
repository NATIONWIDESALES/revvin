-- Align offer inserts with the wallet-validation flow. New business offers start
-- as deposit_status='required', then reserve-offer-funds validates wallet
-- coverage and flips them to deposit_status='validated'.
DROP POLICY IF EXISTS "Business owners manage offers" ON public.offers;

CREATE POLICY "Business owners manage offers" ON public.offers
  FOR INSERT WITH CHECK (
    (
      EXISTS (
        SELECT 1
        FROM public.businesses
        WHERE businesses.id = offers.business_id
          AND businesses.user_id = auth.uid()
      )
      AND deposit_status = 'required'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );
