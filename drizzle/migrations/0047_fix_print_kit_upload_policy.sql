DROP POLICY IF EXISTS "Owners upload print kit PDFs to their own folder" ON storage.objects;
CREATE POLICY "Owners upload print kit PDFs to their own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'print-kits'
    AND lower(storage.extension(objects.name)) = 'pdf'
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id::text = (storage.foldername(objects.name))[1] AND b.user_id = auth.uid())
  );