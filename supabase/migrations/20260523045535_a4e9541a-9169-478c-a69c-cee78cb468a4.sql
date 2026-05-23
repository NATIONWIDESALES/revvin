-- Tighten SELECT on referral-attachments: require an actual matching referral
DROP POLICY IF EXISTS "Users read own referral attachments" ON storage.objects;

CREATE POLICY "Referrers read their referral attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'referral-attachments'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.referrals r
    WHERE r.referrer_id = auth.uid()
      AND r.file_url IS NOT NULL
      AND position(storage.objects.name in r.file_url) > 0
  )
);

CREATE POLICY "Business owners read referral attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'referral-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.referrals r
    JOIN public.businesses b ON b.id = r.business_id
    WHERE b.user_id = auth.uid()
      AND r.file_url IS NOT NULL
      AND position(storage.objects.name in r.file_url) > 0
  )
);
