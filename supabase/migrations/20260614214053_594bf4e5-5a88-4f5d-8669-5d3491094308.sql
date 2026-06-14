
-- 1) Businesses: prevent owner from changing privileged columns
CREATE OR REPLACE FUNCTION public.prevent_business_privileged_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin') THEN
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
$$;

DROP TRIGGER IF EXISTS trg_prevent_business_privileged_updates ON public.businesses;
CREATE TRIGGER trg_prevent_business_privileged_updates
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.prevent_business_privileged_updates();

-- 2) Referrals: prevent referrer from changing privileged columns
CREATE OR REPLACE FUNCTION public.prevent_referrer_privileged_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_business_owner boolean;
BEGIN
  IF has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = NEW.business_id AND user_id = auth.uid()
  ) INTO _is_business_owner;

  IF _is_business_owner THEN
    RETURN NEW;
  END IF;

  -- Caller is the referrer (RLS already enforced auth.uid() = referrer_id).
  -- They may only edit safe fields.
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.payout_status IS DISTINCT FROM OLD.payout_status
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.payout_amount IS DISTINCT FROM OLD.payout_amount
     OR NEW.payout_snapshot IS DISTINCT FROM OLD.payout_snapshot
     OR NEW.payment_marked_at IS DISTINCT FROM OLD.payment_marked_at
     OR NEW.business_id IS DISTINCT FROM OLD.business_id
     OR NEW.offer_id IS DISTINCT FROM OLD.offer_id
     OR NEW.referrer_id IS DISTINCT FROM OLD.referrer_id
  THEN
    RAISE EXCEPTION 'Referrers cannot modify status, payout, or payment fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_referrer_privileged_updates ON public.referrals;
CREATE TRIGGER trg_prevent_referrer_privileged_updates
BEFORE UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.prevent_referrer_privileged_updates();

-- 3) Mock listings: wipe public contact details
UPDATE public.mock_listings SET phone = NULL, email = NULL
WHERE is_mock = true AND (phone IS NOT NULL OR email IS NOT NULL);
