
-- 1. Drop the overly broad public SELECT policy that exposed every column
DROP POLICY IF EXISTS "Public can read published businesses" ON public.businesses;

-- 2. Recreate the view WITHOUT security_invoker so it runs as the view owner
--    and bypasses base-table RLS. Anon only sees the columns selected here.
DROP VIEW IF EXISTS public.businesses_public;
CREATE VIEW public.businesses_public AS
SELECT id, user_id, name, logo_url, description, industry, website,
       city, state, latitude, longitude, verified, created_at, updated_at,
       slug, category, service_area, offer_amount, offer_trigger,
       offer_fine_print, is_published, is_disabled, account_status,
       subscription_status
FROM public.businesses
WHERE account_status = 'approved'
   OR (is_published = true
       AND is_disabled = false
       AND subscription_status = ANY (ARRAY['active','trialing','paid']));

GRANT SELECT ON public.businesses_public TO anon, authenticated;
