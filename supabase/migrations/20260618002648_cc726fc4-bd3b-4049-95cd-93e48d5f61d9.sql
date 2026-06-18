
-- 1) Switch businesses_public view to security_invoker so it no longer bypasses RLS as its owner
ALTER VIEW public.businesses_public SET (security_invoker = true);

-- 2) Allow anon to read only safe display columns on businesses (Stripe/Jobber/contact fields are NOT granted)
GRANT SELECT (
  id, user_id, name, logo_url, description, industry, website, city, state,
  latitude, longitude, verified, created_at, updated_at, slug, category,
  service_area, offer_amount, offer_trigger, offer_fine_print,
  is_published, is_disabled, account_status, subscription_status,
  brand_color, cover_image_url, headline, welcome_message,
  referral_cta_label, testimonials
) ON public.businesses TO anon;

GRANT SELECT (
  id, user_id, name, logo_url, description, industry, website, city, state,
  latitude, longitude, verified, created_at, updated_at, slug, category,
  service_area, offer_amount, offer_trigger, offer_fine_print,
  is_published, is_disabled, account_status, subscription_status,
  brand_color, cover_image_url, headline, welcome_message,
  referral_cta_label, testimonials
) ON public.businesses TO authenticated;

-- Public-read RLS policy mirroring the view's WHERE clause
DROP POLICY IF EXISTS "Public can read approved or published businesses" ON public.businesses;
CREATE POLICY "Public can read approved or published businesses"
ON public.businesses
FOR SELECT
TO anon, authenticated
USING (
  account_status = 'approved'
  OR (
    is_published = true
    AND is_disabled = false
    AND subscription_status = ANY (ARRAY['active','trialing','paid'])
  )
);

-- 3) Admins can read referral attachments in storage
DROP POLICY IF EXISTS "Admins read referral attachments" ON storage.objects;
CREATE POLICY "Admins read referral attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'referral-attachments'
  AND public.has_role(auth.uid(), 'admin')
);
