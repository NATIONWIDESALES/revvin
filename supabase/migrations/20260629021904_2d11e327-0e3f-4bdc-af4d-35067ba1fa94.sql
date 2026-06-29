
-- Avatars: intentionally public (shown on referrer profiles, marketplace).
DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects;
CREATE POLICY "Public read access to avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Business logos: intentionally public (shown on marketplace listings and branded referral pages).
DROP POLICY IF EXISTS "Public read access to business logos" ON storage.objects;
CREATE POLICY "Public read access to business logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-logos');
