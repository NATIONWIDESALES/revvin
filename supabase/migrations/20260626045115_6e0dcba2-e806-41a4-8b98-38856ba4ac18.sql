
-- 1) Referrals: add WITH CHECK to business owners UPDATE policy
DROP POLICY IF EXISTS "Business owners update referrals" ON public.referrals;
CREATE POLICY "Business owners update referrals"
ON public.referrals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = referrals.business_id
      AND businesses.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = referrals.business_id
      AND businesses.user_id = auth.uid()
  )
  AND business_id = (SELECT business_id FROM public.referrals r WHERE r.id = referrals.id)
  AND offer_id IS NOT DISTINCT FROM (SELECT offer_id FROM public.referrals r WHERE r.id = referrals.id)
  AND referrer_id IS NOT DISTINCT FROM (SELECT referrer_id FROM public.referrals r WHERE r.id = referrals.id)
);

-- 2) user_roles: prevent stacking duplicate/multiple roles
DROP POLICY IF EXISTS "Users can insert non-admin roles" ON public.user_roles;
CREATE POLICY "Users can insert non-admin roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = ANY (ARRAY['referrer'::app_role, 'business'::app_role])
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = user_roles.role
  )
);

-- 3) avatars: add DELETE policy
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 4) business-logos: drop the legacy split_part duplicates, keep foldername versions
DROP POLICY IF EXISTS "Business owners upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Business owners update logos" ON storage.objects;
