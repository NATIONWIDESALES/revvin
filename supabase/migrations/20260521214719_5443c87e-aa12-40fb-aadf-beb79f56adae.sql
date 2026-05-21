-- FIX 1: Wire handle_new_user to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Defensive backfill: ensure every existing auth user has a profile + referrer role
INSERT INTO public.profiles (user_id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'referrer'::app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id);

-- FIX 4: Unique slug constraint (case-insensitive via lower(); slugs are stored lowercase per fn_slug_available)
CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_unique_idx
  ON public.businesses (lower(slug))
  WHERE slug IS NOT NULL;