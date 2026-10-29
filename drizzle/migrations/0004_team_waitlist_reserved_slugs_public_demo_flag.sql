CREATE OR REPLACE FUNCTION public.fn_submit_earn_lead(p_email text, p_source text, p_city text DEFAULT NULL::text, p_metro_slug text DEFAULT NULL::text, p_business_name text DEFAULT NULL::text, p_business_contact text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _email text := lower(btrim(coalesce(p_email, '')));
BEGIN
  IF p_source NOT IN ('earn_waitlist', 'business_invite', 'team_waitlist') THEN RAISE EXCEPTION 'invalid_source'; END IF;
  IF _email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' OR char_length(_email) > 320 THEN RAISE EXCEPTION 'invalid_email'; END IF;
  IF NOT public.fn_rate_bucket_hit('earn_lead:' || md5(_email), interval '1 hour', 10) THEN RAISE EXCEPTION 'rate_limited'; END IF;
  INSERT INTO public.email_leads (email, source, city, metro_slug, business_name, business_contact)
  VALUES (_email, p_source, left(nullif(btrim(coalesce(p_city, '')), ''), 120),
    (SELECT slug FROM public.metros WHERE slug = lower(btrim(coalesce(p_metro_slug, ''))) LIMIT 1),
    left(nullif(btrim(coalesce(p_business_name, '')), ''), 160), left(nullif(btrim(coalesce(p_business_contact, '')), ''), 200));
  RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.fn_slug_reserved_words()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT ARRAY[
    'admin','api','auth','login','signin','signup','dashboard','welcome',
    'pricing','browse','marketplace','sample','terms','privacy','trust',
    'saved','i','r','offer','referrer','reset-password','for-businesses',
    'for-referrers','about-revvin-llm','referral-agreement','how-it-works',
    'feedback','print','docs','www','mail','ftp','cdn','static','assets',
    'app','help','support','status','blog','null','undefined','test',
    'earn','me','about','partners','tools'
  ]::text[]
$function$;

CREATE OR REPLACE VIEW public.businesses_public
WITH (security_invoker = false) AS
  SELECT id, user_id, name, logo_url, description, industry, website, city, state,
         latitude, longitude, verified, created_at, updated_at, slug, category,
         service_area, offer_amount, offer_trigger, offer_fine_print,
         is_published, is_disabled, account_status, subscription_status,
         brand_color, cover_image_url, headline, welcome_message,
         referral_cta_label, testimonials, plan,
         coalesce(is_demo, false) AS is_demo
    FROM public.businesses
   WHERE public.fn_page_live(account_status, is_published, is_disabled);