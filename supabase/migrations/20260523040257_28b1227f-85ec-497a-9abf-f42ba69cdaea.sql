
-- Update handle_new_user (drop wallet insert)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role text;
  _biz_name text;
  _industry text;
  _service_area text;
  _phone text;
  _location text;
  _biz_id uuid;
  _wants_business boolean;
  _wants_referrer boolean;
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'referrer');
  _wants_business := _role IN ('business', 'both');
  _wants_referrer := _role IN ('referrer', 'both');

  IF _wants_referrer THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'referrer'::app_role) ON CONFLICT DO NOTHING;
  END IF;

  IF _wants_business THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'business'::app_role) ON CONFLICT DO NOTHING;

    _biz_name := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'business_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Business') || '''s Business'
    );
    _industry := NEW.raw_user_meta_data->>'industry';
    _service_area := NEW.raw_user_meta_data->>'service_area';
    _phone := NEW.raw_user_meta_data->>'phone';

    INSERT INTO public.businesses (user_id, name, industry, city, phone, account_status)
    VALUES (NEW.id, _biz_name, _industry, _service_area, _phone, 'approved')
    RETURNING id INTO _biz_id;
  END IF;

  IF _wants_referrer THEN
    _location := NEW.raw_user_meta_data->>'location';
    IF _location IS NOT NULL AND _location != '' THEN
      UPDATE public.profiles SET city = _location WHERE user_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop dependent view first (Stripe ID masking no longer needed)
DROP VIEW IF EXISTS public.offers_public CASCADE;

-- Drop wallet/payout/tremendous tables
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.wallet_balances CASCADE;
DROP TABLE IF EXISTS public.referrer_payout_preferences CASCADE;
DROP TABLE IF EXISTS public.tremendous_webhook_log CASCADE;
DROP TABLE IF EXISTS public.payouts CASCADE;

-- Add payment tracking to referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_due',
  ADD COLUMN IF NOT EXISTS payment_marked_at timestamptz,
  ADD COLUMN IF NOT EXISTS flagged_unpaid_at timestamptz;

-- Drop fee/deposit columns from offers (CASCADE to remove any remaining dependents)
ALTER TABLE public.offers
  DROP COLUMN IF EXISTS platform_fee_rate CASCADE,
  DROP COLUMN IF EXISTS deposit_status CASCADE,
  DROP COLUMN IF EXISTS deposit_amount CASCADE,
  DROP COLUMN IF EXISTS deposit_currency CASCADE,
  DROP COLUMN IF EXISTS stripe_checkout_session_id CASCADE,
  DROP COLUMN IF EXISTS stripe_payment_intent_id CASCADE,
  DROP COLUMN IF EXISTS deposit_paid_at CASCADE,
  DROP COLUMN IF EXISTS max_payout_cap CASCADE;

-- Replace offer INSERT policy that referenced deposit_status
DROP POLICY IF EXISTS "Business owners manage offers" ON public.offers;
CREATE POLICY "Business owners manage offers"
ON public.offers
FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = offers.business_id AND businesses.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Drop pricing_tier from businesses
ALTER TABLE public.businesses
  DROP COLUMN IF EXISTS pricing_tier CASCADE;
