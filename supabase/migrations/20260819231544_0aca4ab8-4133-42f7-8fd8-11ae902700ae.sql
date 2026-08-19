CREATE OR REPLACE FUNCTION public.prevent_business_privileged_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR session_user = 'service_role'
     OR current_user = 'service_role'
     OR auth.uid() IS NULL
  THEN
    RETURN NEW;
  END IF;

  IF has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verified := false;
    NEW.is_published := false;
    NEW.is_disabled := false;
    NEW.subscription_status := 'none';
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
    NEW.stripe_connected_account_id := NULL;
    NEW.stripe_connect_status := NULL;
    NEW.launch_package_status := NULL;
    NEW.current_period_end := NULL;
    NEW.account_status := 'pending_approval';
    RETURN NEW;
  END IF;

  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_connected_account_id IS DISTINCT FROM OLD.stripe_connected_account_id
     OR NEW.stripe_connect_status IS DISTINCT FROM OLD.stripe_connect_status
     OR NEW.is_disabled IS DISTINCT FROM OLD.is_disabled
     OR NEW.is_published IS DISTINCT FROM OLD.is_published
     OR NEW.launch_package_status IS DISTINCT FROM OLD.launch_package_status
     OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
     OR NEW.verified IS DISTINCT FROM OLD.verified
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
  THEN
    RAISE EXCEPTION 'Only admins or backend services can modify subscription/account/billing fields';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_business_privileged_inserts ON public.businesses;
CREATE TRIGGER trg_prevent_business_privileged_inserts
BEFORE INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.prevent_business_privileged_updates();