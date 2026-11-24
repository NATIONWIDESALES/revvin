DROP POLICY IF EXISTS "Business owners read referral attachments" ON storage.objects;
CREATE POLICY "Business owners read referral attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'referral-attachments'
    AND EXISTS (
      SELECT 1 FROM public.referrals r JOIN public.businesses b ON b.id = r.business_id
      WHERE b.user_id = auth.uid() AND (storage.foldername(objects.name))[1] = r.referrer_id::text
    )
  );