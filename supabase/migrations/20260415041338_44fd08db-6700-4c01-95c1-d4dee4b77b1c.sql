
-- 1. Update handle_new_user to auto-approve businesses
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
    VALUES (NEW.id, _biz_name, _industry, _service_area, _phone, 'approved');
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

-- 2. Add is_sample column to offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

-- 3. Add paused_reason column to offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS paused_reason text;

-- 4. Update RLS: hide offers from suspended businesses
DROP POLICY IF EXISTS "Public offers viewable" ON public.offers;
CREATE POLICY "Public offers viewable" ON public.offers
FOR SELECT USING (
  (
    (status = 'active' AND approval_status = 'approved')
    AND NOT EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = offers.business_id
      AND b.account_status = 'suspended'
    )
  )
  OR EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = offers.business_id
    AND b.user_id = auth.uid()
  )
);
