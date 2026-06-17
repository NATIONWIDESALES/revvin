
DROP POLICY IF EXISTS "Business owners read referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Referrers read their referral attachments" ON storage.objects;

CREATE POLICY "Business owners read referral attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'referral-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.referrals r
    JOIN public.businesses b ON b.id = r.business_id
    WHERE b.user_id = auth.uid()
      AND r.file_url IS NOT NULL
      AND r.file_url LIKE '%/referral-attachments/' || objects.name || '?%'
  )
);

CREATE POLICY "Referrers read their referral attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'referral-attachments'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.referrals r
    WHERE r.referrer_id = auth.uid()
      AND r.file_url IS NOT NULL
      AND r.file_url LIKE '%/referral-attachments/' || objects.name || '?%'
  )
);
