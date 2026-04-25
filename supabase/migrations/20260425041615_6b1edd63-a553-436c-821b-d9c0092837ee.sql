-- Update handle_new_user trigger to support a 'both' role at signup
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

  -- Decide which role records to create
  _wants_business := _role IN ('business', 'both');
  _wants_referrer := _role IN ('referrer', 'both');

  IF _wants_referrer THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'referrer'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  IF _wants_business THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'business'::app_role)
    ON CONFLICT DO NOTHING;

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

    INSERT INTO public.wallet_balances (user_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Capture optional referrer location for referrer or both
  IF _wants_referrer THEN
    _location := NEW.raw_user_meta_data->>'location';
    IF _location IS NOT NULL AND _location != '' THEN
      UPDATE public.profiles SET city = _location WHERE user_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;