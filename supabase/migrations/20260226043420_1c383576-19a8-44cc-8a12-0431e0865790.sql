
-- Add phone and account_status columns to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'pending_approval';

-- Set existing businesses to 'approved' so they aren't affected
UPDATE public.businesses SET account_status = 'approved' WHERE account_status = 'pending_approval';

-- Update handle_new_user trigger to extract phone and set account_status
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
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Insert role from metadata (defaults to 'referrer' if not specified)
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'referrer');
  IF _role IN ('business', 'referrer', 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- If business role, create a business record with metadata
  IF _role = 'business' THEN
    _biz_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'business_name', ''), COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Business') || '''s Business');
    _industry := NEW.raw_user_meta_data->>'industry';
    _service_area := NEW.raw_user_meta_data->>'service_area';
    _phone := NEW.raw_user_meta_data->>'phone';
    
    INSERT INTO public.businesses (user_id, name, industry, city, phone, account_status)
    VALUES (NEW.id, _biz_name, _industry, _service_area, _phone, 'pending_approval');
  END IF;
  
  RETURN NEW;
END;
$function$;
