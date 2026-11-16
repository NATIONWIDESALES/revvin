/* Rollback SQL (restore the original checks before restoring bucket settings):
CREATE POLICY "Raster image uploads only" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (bucket_id NOT IN ('business-logos','avatars') OR (metadata->>'mimetype' IN ('image/png','image/jpeg','image/webp') AND CASE WHEN metadata->>'size' ~ '^[0-9]{1,10}$' THEN (metadata->>'size')::bigint<=2097152 ELSE false END));
CREATE POLICY "Raster image updates only" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated WITH CHECK (bucket_id NOT IN ('business-logos','avatars') OR (metadata->>'mimetype' IN ('image/png','image/jpeg','image/webp') AND CASE WHEN metadata->>'size' ~ '^[0-9]{1,10}$' THEN (metadata->>'size')::bigint<=2097152 ELSE false END));
Original bucket settings: allowed_mime_types NULL, file_size_limit 2097152 for both buckets. Restore MIME settings through the Storage API, not SQL.
*/
DO $$ BEGIN
  IF (SELECT count(*) FROM storage.buckets WHERE id IN ('business-logos','avatars') AND file_size_limit = 2097152 AND cardinality(allowed_mime_types) = 3 AND allowed_mime_types @> ARRAY['image/png','image/jpeg','image/webp']::text[]) <> 2 THEN
    RAISE EXCEPTION 'Configure both image buckets with PNG, JPEG, WEBP and 2097152-byte limits through the Storage API before removing the restrictive policies';
  END IF;
END $$;
DROP POLICY "Raster image uploads only" ON storage.objects;
DROP POLICY "Raster image updates only" ON storage.objects;