-- RLS policies for business-logos bucket using path prefix
CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT USING (bucket_id = 'business-logos');
CREATE POLICY "Business owners upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'business-logos' AND auth.uid()::text = split_part(name, '/', 1));
CREATE POLICY "Business owners update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'business-logos' AND auth.uid()::text = split_part(name, '/', 1));
CREATE POLICY "Business owners delete logos" ON storage.objects FOR DELETE USING (bucket_id = 'business-logos' AND auth.uid()::text = split_part(name, '/', 1));

-- Update handle_new_user trigger to persist business metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role text;
  _biz_name text;
  _industry text;
  _service_area text;
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
    
    INSERT INTO public.businesses (user_id, name, industry, city)
    VALUES (NEW.id, _biz_name, _industry, _service_area);
  END IF;
  
  RETURN NEW;
END;
$$;