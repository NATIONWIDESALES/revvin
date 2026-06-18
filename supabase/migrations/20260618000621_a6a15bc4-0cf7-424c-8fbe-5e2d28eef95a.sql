-- 1. Additive columns on public.businesses (all nullable, safe to deploy)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS brand_color text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS welcome_message text,
  ADD COLUMN IF NOT EXISTS referral_cta_label text,
  ADD COLUMN IF NOT EXISTS testimonials jsonb;

-- 2. Rebuild businesses_public to expose the new display-only fields.
--    Continues to exclude Stripe / Jobber / billing / contact-secret columns.
DROP VIEW IF EXISTS public.businesses_public;
CREATE VIEW public.businesses_public AS
SELECT id, user_id, name, logo_url, description, industry, website,
       city, state, latitude, longitude, verified, created_at, updated_at,
       slug, category, service_area, offer_amount, offer_trigger,
       offer_fine_print, is_published, is_disabled, account_status,
       subscription_status,
       brand_color, cover_image_url, headline, welcome_message,
       referral_cta_label, testimonials
FROM public.businesses
WHERE account_status = 'approved'
   OR (is_published = true
       AND is_disabled = false
       AND subscription_status = ANY (ARRAY['active','trialing','paid']));

GRANT SELECT ON public.businesses_public TO anon, authenticated;