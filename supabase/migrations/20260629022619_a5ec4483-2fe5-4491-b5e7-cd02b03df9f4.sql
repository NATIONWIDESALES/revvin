CREATE OR REPLACE FUNCTION public.prevent_consent_timestamp_rollback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Backend / service-role and admins may correct the value if ever needed.
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR session_user = 'service_role'
     OR current_user = 'service_role'
     OR auth.uid() IS NULL
     OR has_role(auth.uid(), 'admin')
  THEN
    RETURN NEW;
  END IF;

  IF OLD.contact_outreach_consent_at IS NOT NULL THEN
    IF NEW.contact_outreach_consent_at IS NULL
       OR NEW.contact_outreach_consent_at < OLD.contact_outreach_consent_at
    THEN
      RAISE EXCEPTION 'contact_outreach_consent_at is append-only and cannot be cleared or moved earlier';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_consent_timestamp_rollback ON public.businesses;
CREATE TRIGGER trg_prevent_consent_timestamp_rollback
BEFORE UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.prevent_consent_timestamp_rollback();