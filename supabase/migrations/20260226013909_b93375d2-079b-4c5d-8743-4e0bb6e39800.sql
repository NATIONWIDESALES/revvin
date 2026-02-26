-- Create the public bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update/replace their own logo
CREATE POLICY "Users can update their own logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access
CREATE POLICY "Public read access for business logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-logos');