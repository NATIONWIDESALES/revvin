DROP VIEW IF EXISTS public.businesses_public;

CREATE VIEW public.businesses_public
WITH (security_invoker = false)
AS
  SELECT id,
     user_id,
     name,
     logo_url,
     description,
     industry,
     website,
     city,
     state,
     latitude,
     longitude,
     verified,
     created_at,
     updated_at,
     slug,
     category,
     service_area,
     offer_amount,
     offer_trigger,
     offer_fine_print,
     is_published,
     is_disabled,
     account_status,
     subscription_status,
     brand_color,
     cover_image_url,
     headline,
     welcome_message,
     referral_cta_label,
     testimonials
  FROM public.businesses
  WHERE account_status = 'approved'::text
    AND is_published = true
    AND is_disabled = false
    AND subscription_status = ANY (ARRAY['active'::text, 'trialing'::text, 'paid'::text]);

GRANT SELECT ON public.businesses_public TO anon;
GRANT SELECT ON public.businesses_public TO authenticated;
GRANT SELECT ON public.businesses_public TO service_role;