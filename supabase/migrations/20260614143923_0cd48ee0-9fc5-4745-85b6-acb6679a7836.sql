
-- Fix 1: Restrict mock_listings SELECT to actual mock rows only
DROP POLICY IF EXISTS "Public can read mock listings" ON public.mock_listings;
CREATE POLICY "Public can read mock listings"
  ON public.mock_listings
  FOR SELECT
  TO anon, authenticated
  USING (is_mock = true);

-- Fix 2: Add explicit service_role write policies on notifications_log
CREATE POLICY "Service role can insert notifications log"
  ON public.notifications_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update notifications log"
  ON public.notifications_log
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT INSERT, UPDATE ON public.notifications_log TO service_role;

-- Fix 3: Tighten callback_requests INSERT policy with basic validation
DROP POLICY IF EXISTS "Anyone can submit callback requests" ON public.callback_requests;
CREATE POLICY "Anyone can submit callback requests"
  ON public.callback_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(btrim(name)) BETWEEN 1 AND 200
    AND length(btrim(email)) BETWEEN 3 AND 254
    AND email LIKE '%_@_%.__%'
    AND (phone IS NULL OR length(phone) <= 32)
    AND (business_name IS NULL OR length(business_name) <= 200)
    AND (city IS NULL OR length(city) <= 120)
    AND (help_with IS NULL OR length(help_with) <= 2000)
    AND is_mock = false
  );
