-- DRAFT ONLY: review and apply separately from the release-1 backend migration.
-- No global-list SELECT policy or public contact-read access is introduced.
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_suppressed_emails_for_business(p_business_id uuid)
RETURNS TABLE(email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.businesses AS b
    WHERE b.id = p_business_id AND b.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Business owner access required' USING ERRCODE = '42501';
  END IF;

  -- Return only normalized addresses already present in this owner's contacts.
  -- No arbitrary email parameter, suppression reason, metadata, or timestamps.
  RETURN QUERY
  SELECT DISTINCT lower(btrim(c.email))
  FROM public.referral_contacts AS c
  WHERE c.business_id = p_business_id
    AND nullif(btrim(c.email), '') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.suppressed_emails AS s
      WHERE lower(btrim(s.email)) = lower(btrim(c.email))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_suppressed_emails_for_business(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_suppressed_emails_for_business(uuid) TO authenticated;

COMMIT;
