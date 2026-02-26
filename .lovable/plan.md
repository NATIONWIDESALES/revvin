

# Fix: Business Logo Upload — Bucket Not Found

The error is straightforward: the `business-logos` storage bucket does not exist. The code in `BusinessLogoUpload.tsx` references `supabase.storage.from("business-logos")`, but no storage buckets have been created in the backend.

## Fix

Create the `business-logos` storage bucket via a database migration, with public read access and RLS policies so only authenticated business owners can upload/update their own logos.

### SQL Migration

```sql
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
```

No code changes needed — `BusinessLogoUpload.tsx` already uses the correct bucket name and uploads to `{user.id}/logo.{ext}`, which matches the RLS folder-based policies above.

