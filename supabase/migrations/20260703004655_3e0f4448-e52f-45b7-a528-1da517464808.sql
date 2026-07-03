
-- 1) user_roles: remove client self-insert; provide controlled RPC for first-time role selection
DROP POLICY IF EXISTS "Users can insert non-admin roles" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.assign_self_role(_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _role NOT IN ('referrer'::app_role, 'business'::app_role) THEN
    RAISE EXCEPTION 'invalid role';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'role already assigned';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), _role);
END;
$$;

REVOKE ALL ON FUNCTION public.assign_self_role(app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_self_role(app_role) TO authenticated;

-- Admins can manage user_roles directly if needed
CREATE POLICY "Admins manage user roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Storage: drop broad public SELECT policies that allow listing
DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to business logos" ON storage.objects;

-- 3) referral_triggers: explicit admin management (writes otherwise via service_role)
CREATE POLICY "Admins manage referral triggers"
ON public.referral_triggers FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) suppressed_contacts: explicit admin management (writes otherwise via service_role)
CREATE POLICY "Admins manage suppressions"
ON public.suppressed_contacts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) unsubscribe_tokens: document intent (already service_role-only)
COMMENT ON TABLE public.unsubscribe_tokens IS
'Contains contact values used for one-click unsubscribe. Access is restricted to service_role only; no client (anon/authenticated) SELECT policy exists by design.';
