CREATE OR REPLACE FUNCTION public.fn_launch_trial_available(p_business_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE b public.businesses%ROWTYPE;
BEGIN
 SELECT * INTO b FROM public.businesses WHERE id = p_business_id;
 IF b.id IS NULL THEN RETURN false; END IF;
 IF coalesce(auth.role(),'') <> 'service_role' AND auth.uid() IS DISTINCT FROM b.user_id THEN RAISE EXCEPTION 'not_authorized'; END IF;
 IF b.plan = 'pro' OR coalesce(b.is_demo,false) THEN RETURN false; END IF;
 RETURN NOT EXISTS (SELECT 1 FROM public.business_trial_history h WHERE h.user_id = b.user_id AND h.launch_granted_at IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.fn_launch_trial_available(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_launch_trial_available(uuid) TO authenticated, service_role;