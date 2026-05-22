
-- 1) Tighten businesses RLS: only owner + admin can read raw row
DROP POLICY IF EXISTS "Public businesses viewable" ON public.businesses;
DROP POLICY IF EXISTS "V1 public read published businesses" ON public.businesses;

CREATE POLICY "Owners and admins can read businesses"
  ON public.businesses FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- 2) Safe public view (only non-sensitive display columns)
DROP VIEW IF EXISTS public.businesses_public;
CREATE VIEW public.businesses_public AS
SELECT id, user_id, name, logo_url, description, industry, website,
       city, state, latitude, longitude, verified, created_at, updated_at,
       slug, category, service_area, offer_amount, offer_trigger,
       offer_fine_print, is_published, is_disabled, account_status,
       subscription_status, pricing_tier
FROM public.businesses
WHERE account_status = 'approved'
   OR (is_published = true
       AND is_disabled = false
       AND subscription_status = ANY (ARRAY['active','trialing','paid']));

GRANT SELECT ON public.businesses_public TO anon, authenticated;

-- 3) Realtime notifications: drop bare-topic OR branch
DROP POLICY IF EXISTS "Users only receive own notifications" ON realtime.messages;
CREATE POLICY "Users only receive own notifications"
  ON realtime.messages FOR SELECT TO authenticated
  USING (realtime.topic() = ('notifications:' || auth.uid()::text));

-- 4) Function search_path hardening
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

-- 5) Revoke EXECUTE on internal-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
