
DROP POLICY IF EXISTS "Public can read published businesses" ON public.businesses;
CREATE POLICY "Public can read published businesses"
  ON public.businesses FOR SELECT
  TO anon, authenticated
  USING (
    account_status = 'approved'
    OR (is_published = true
        AND is_disabled = false
        AND subscription_status = ANY (ARRAY['active','trialing','paid']))
  );
