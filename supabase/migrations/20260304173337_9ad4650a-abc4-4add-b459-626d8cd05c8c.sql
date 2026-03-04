
-- 1. Fix handle_new_user trigger: remove 'admin' from self-assignable roles
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
    VALUES (NEW.id, _biz_name, _industry, _service_area, _phone, 'pending_approval');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Tighten businesses INSERT: force account_status = 'pending_approval'
DROP POLICY IF EXISTS "Owners manage business" ON public.businesses;
CREATE POLICY "Owners manage business" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() = user_id AND account_status = 'pending_approval');

-- 3. Tighten offers INSERT: force safe defaults on insert
DROP POLICY IF EXISTS "Business owners manage offers" ON public.offers;
CREATE POLICY "Business owners manage offers" ON public.offers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM businesses WHERE businesses.id = offers.business_id AND businesses.user_id = auth.uid())
    AND deposit_status = 'required'
  );

-- 4. Restrict profiles SELECT: authenticated users only + admins + own profile
DROP POLICY IF EXISTS "Public profiles viewable" ON public.profiles;
CREATE POLICY "Authenticated profiles viewable" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 5. Restrict businesses SELECT: show only approved businesses publicly, owners see own
DROP POLICY IF EXISTS "Public businesses viewable" ON public.businesses;
CREATE POLICY "Public businesses viewable" ON public.businesses
  FOR SELECT USING (
    account_status = 'approved'
    OR auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );
