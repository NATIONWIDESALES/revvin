
-- Fix 1: Lock down user_roles INSERT to prevent admin self-assignment
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
CREATE POLICY "Users can insert non-admin roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('referrer'::app_role, 'business'::app_role)
);

-- Fix 2: Restrict profiles SELECT to own profile only (admin policy already exists separately)
DROP POLICY IF EXISTS "Authenticated profiles viewable" ON public.profiles;
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Fix 3: Add country and currency columns to offers
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
