CREATE OR REPLACE FUNCTION public.fn_set_business_published(p_published boolean)
 RETURNS TABLE(published boolean, slug text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b public.businesses%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'You need to be signed in.'; END IF;

  SELECT * INTO b FROM public.businesses WHERE user_id = auth.uid() LIMIT 1;
  IF b.id IS NULL THEN RAISE EXCEPTION 'No business found on this account.'; END IF;
  IF b.is_disabled THEN
    RAISE EXCEPTION 'This account is disabled. Email info@revvin.co and we will sort it out.';
  END IF;

  IF p_published THEN
    IF coalesce(btrim(b.slug),'')   = '' THEN RAISE EXCEPTION 'Choose your page link before publishing.'; END IF;
    IF coalesce(btrim(b.name),'')   = '' THEN RAISE EXCEPTION 'Add your business name before publishing.'; END IF;
    IF coalesce(btrim(b.offer_amount),'') = '' THEN RAISE EXCEPTION 'Add the reward you pay before publishing.'; END IF;
  END IF;

  PERFORM set_config('revvin.publish_toggle', 'on', true);
  UPDATE public.businesses
     SET is_published = p_published,
         account_status = CASE WHEN p_published AND account_status = 'pending_approval' THEN 'approved' ELSE account_status END,
         updated_at = now()
   WHERE id = b.id;
  PERFORM set_config('revvin.publish_toggle', 'off', true);

  RETURN QUERY SELECT p_published, b.slug;
END $function$;

CREATE OR REPLACE FUNCTION public.prevent_business_privileged_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_toggle boolean := coalesce(current_setting('revvin.publish_toggle', true), '') = 'on';
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
     OR (NEW.is_published IS DISTINCT FROM OLD.is_published AND NOT v_toggle)
     OR NEW.launch_package_status IS DISTINCT FROM OLD.launch_package_status
     OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
     OR NEW.verified IS DISTINCT FROM OLD.verified
     OR (NEW.account_status IS DISTINCT FROM OLD.account_status
         AND NOT (v_toggle AND OLD.account_status = 'pending_approval' AND NEW.account_status = 'approved'))
  THEN
    RAISE EXCEPTION 'Only admins or backend services can modify subscription/account/billing fields';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_status_self_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Backend / service-role calls bypass.
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR session_user = 'service_role'
     OR current_user = 'service_role'
     OR auth.uid() IS NULL
  THEN
    RETURN NEW;
  END IF;

  IF NEW.account_status IS DISTINCT FROM OLD.account_status
     AND NOT has_role(auth.uid(), 'admin')
     AND NOT (coalesce(current_setting('revvin.publish_toggle', true), '') = 'on'
              AND OLD.account_status = 'pending_approval' AND NEW.account_status = 'approved') THEN
    RAISE EXCEPTION 'Only admins can change account_status';
  END IF;

  IF NEW.verified IS DISTINCT FROM OLD.verified
     AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change verified status';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_normalize_offer_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.offer_amount IS NOT NULL AND btrim(NEW.offer_amount) ~ '^[0-9][0-9,]*(\.[0-9]+)?$' THEN
    NEW.offer_amount := '$' || btrim(NEW.offer_amount);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_normalize_offer_amount ON public.businesses;
CREATE TRIGGER trg_normalize_offer_amount BEFORE INSERT OR UPDATE OF offer_amount ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_offer_amount();

UPDATE public.businesses SET offer_amount = '$' || btrim(offer_amount)
 WHERE btrim(offer_amount) ~ '^[0-9][0-9,]*(\.[0-9]+)?$';