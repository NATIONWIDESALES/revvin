DROP POLICY IF EXISTS "Authenticated users upload referral attachments" ON storage.objects;

CREATE POLICY "Authenticated users upload referral attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'referral-attachments'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.referrals r
    WHERE r.referrer_id = auth.uid()
  )
);
