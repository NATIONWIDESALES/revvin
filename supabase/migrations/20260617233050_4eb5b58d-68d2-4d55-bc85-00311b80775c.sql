
DROP VIEW IF EXISTS public.businesses_public;
CREATE VIEW public.businesses_public
WITH (security_invoker = true)
AS
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

ALTER TABLE public.businesses DISABLE TRIGGER USER;
UPDATE public.businesses SET slug = 'rev-test' WHERE id = 'f14ac785-89f6-4396-8b4e-5dccb99c155c';
ALTER TABLE public.businesses ENABLE TRIGGER USER;
