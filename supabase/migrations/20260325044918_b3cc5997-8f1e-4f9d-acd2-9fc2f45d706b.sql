CREATE OR REPLACE FUNCTION public.fn_platform_counts()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'businesses', (SELECT count(*) FROM public.user_roles WHERE role = 'business'),
    'referrers', (SELECT count(*) FROM public.user_roles WHERE role = 'referrer')
  )
$$;