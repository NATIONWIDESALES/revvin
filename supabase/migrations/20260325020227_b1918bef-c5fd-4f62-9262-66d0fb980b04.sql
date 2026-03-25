CREATE POLICY "Business owners create payouts for own referrals"
ON public.payouts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = payouts.business_id
    AND businesses.user_id = auth.uid()
  )
);