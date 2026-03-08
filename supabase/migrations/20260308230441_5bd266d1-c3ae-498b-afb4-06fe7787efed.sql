
-- Create storage bucket for referral attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('referral-attachments', 'referral-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to referral-attachments
CREATE POLICY "Authenticated users upload referral attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'referral-attachments');

-- Allow users to read their own uploads
CREATE POLICY "Users read own referral attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'referral-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow referrers to update status on their own referrals (for dispute)
CREATE POLICY "Referrers can update own referral status"
ON public.referrals FOR UPDATE TO authenticated
USING (auth.uid() = referrer_id)
WITH CHECK (auth.uid() = referrer_id);
