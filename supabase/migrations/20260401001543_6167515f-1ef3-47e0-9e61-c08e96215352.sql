
CREATE OR REPLACE FUNCTION public.prevent_status_self_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_status IS DISTINCT FROM OLD.account_status
     AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change account_status';
  END IF;

  IF NEW.pricing_tier IS DISTINCT FROM OLD.pricing_tier
     AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change pricing_tier';
  END IF;

  IF NEW.verified IS DISTINCT FROM OLD.verified
     AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change verified status';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_status_self_approval
BEFORE UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.prevent_status_self_approval();
