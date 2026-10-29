CREATE OR REPLACE VIEW public.businesses_public
WITH (security_invoker = false) AS
  SELECT id, user_id, name, logo_url, description, industry, website, city, state,
         latitude, longitude, verified, created_at, updated_at, slug, category,
         service_area, offer_amount, offer_trigger, offer_fine_print,
         is_published, is_disabled, account_status, subscription_status,
         brand_color, cover_image_url, headline, welcome_message,
         referral_cta_label, testimonials, plan,
         coalesce(is_demo, false) AS is_demo,
         is_verified, show_on_earn
    FROM public.businesses
   WHERE public.fn_page_live(account_status, is_published, is_disabled);
GRANT SELECT ON public.businesses_public TO anon, authenticated;