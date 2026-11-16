-- 0031_image_upload_owner_select
-- Adds owner-scoped SELECT policies on storage.objects for business-logos and avatars.
-- Required because the client uploads with upsert: true, and Storage upsert
-- (INSERT ... ON CONFLICT DO UPDATE ... RETURNING) needs a SELECT policy on the row.
-- Both buckets are already public for file reads, so nothing new is exposed.
--
-- Rollback:
--   DROP POLICY IF EXISTS "Owners read own logo objects" ON storage.objects;
--   DROP POLICY IF EXISTS "Owners read own avatar objects" ON storage.objects;

DROP POLICY IF EXISTS "Owners read own logo objects" ON storage.objects;
CREATE POLICY "Owners read own logo objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'business-logos' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Owners read own avatar objects" ON storage.objects;
CREATE POLICY "Owners read own avatar objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);