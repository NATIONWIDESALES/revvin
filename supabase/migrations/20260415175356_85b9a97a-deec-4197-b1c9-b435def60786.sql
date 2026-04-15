
-- Auto-create wallet for business users on signup
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
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'referrer');
  IF _role IN ('business', 'referrer') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF _role = 'business' THEN
    _biz_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'business_name', ''), COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Business') || '''s Business');
    _industry := NEW.raw_user_meta_data->>'industry';
    _service_area := NEW.raw_user_meta_data->>'service_area';
    _phone := NEW.raw_user_meta_data->>'phone';
    
    INSERT INTO public.businesses (user_id, name, industry, city, phone, account_status)
    VALUES (NEW.id, _biz_name, _industry, _service_area, _phone, 'approved')
    RETURNING id INTO _biz_id;

    -- Auto-create wallet for the business
    INSERT INTO public.wallet_balances (user_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF _role = 'referrer' THEN
    _location := NEW.raw_user_meta_data->>'location';
    IF _location IS NOT NULL AND _location != '' THEN
      UPDATE public.profiles SET city = _location WHERE user_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add unique constraint on wallet_balances.user_id to support ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_balances_user_id_key'
  ) THEN
    ALTER TABLE public.wallet_balances ADD CONSTRAINT wallet_balances_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Allow authenticated users to insert their own wallet (for fallback recovery)
CREATE POLICY "Users insert own wallet" ON public.wallet_balances
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
