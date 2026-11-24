ALTER TABLE public.business_trial_history ADD COLUMN IF NOT EXISTS launch_granted_at timestamptz;

CREATE OR REPLACE FUNCTION public.fn_new_business_acquisition_trial()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE metadata jsonb; clean jsonb := '{}'::jsonb; k text;
BEGIN
 IF TG_OP = 'INSERT' THEN
  -- The Pro trial starts at the first referral launch (fn_start_launch_trial), not at signup.
  NEW.pro_trial_ends_at := NULL;
  SELECT raw_user_meta_data INTO metadata FROM auth.users WHERE id = NEW.user_id;
  IF jsonb_typeof(metadata->'acquisition') = 'object' THEN
   FOREACH k IN ARRAY ARRAY['utm_source','utm_medium','utm_campaign','utm_content','utm_term','landing_path'] LOOP
    IF jsonb_typeof(metadata->'acquisition'->k) = 'string' THEN clean := clean || jsonb_build_object(k,left(metadata->'acquisition'->>k,200)); END IF;
   END LOOP;
   IF coalesce(metadata->'acquisition'->>'prospect_code','') ~ '^[A-Za-z0-9_-]{10,64}$' THEN
    clean := clean || jsonb_build_object('prospect_code', metadata->'acquisition'->>'prospect_code');
   END IF;
   NEW.acquisition := clean;
  END IF;
  IF coalesce(metadata->>'preview_trade','') <> '' THEN NEW.category := left(metadata->>'preview_trade',80); NEW.industry := NEW.category; END IF;
  IF coalesce(metadata->>'preview_reward','') ~ '^\d{1,7}$' AND (metadata->>'preview_reward')::numeric BETWEEN 1 AND 1000000 THEN NEW.offer_amount := '$' || (metadata->>'preview_reward'); END IF;
  NEW.published_notified_at := NULL;
 ELSIF NEW.pro_trial_ends_at IS DISTINCT FROM OLD.pro_trial_ends_at
   AND NOT (coalesce(current_setting('revvin.launch_trial', true),'') = '1'
            AND (coalesce(auth.role(),'') = 'service_role' OR session_user IN ('postgres','supabase_admin'))) THEN
  RAISE EXCEPTION 'Trial expiry is managed by the server';
 ELSIF NEW.published_notified_at IS DISTINCT FROM OLD.published_notified_at AND coalesce(auth.role(),'') <> 'service_role' AND session_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'Publication notifications are managed by the server';
 END IF;
 RETURN NEW;
END $function$;

-- Signup no longer grants or records a trial; the history is written at the first launch.
CREATE OR REPLACE FUNCTION public.fn_guard_first_trial() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
BEGIN
 NEW.pro_trial_ends_at := NULL;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.fn_start_launch_trial(p_business_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE b public.businesses%ROWTYPE; n integer;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' AND session_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
 SELECT * INTO b FROM public.businesses WHERE id = p_business_id FOR UPDATE;
 IF b.id IS NULL THEN RETURN 'not_found'; END IF;
 IF b.plan = 'pro' THEN RETURN 'paid'; END IF;
 IF coalesce(b.is_demo,false) THEN RETURN 'demo'; END IF;
 INSERT INTO public.business_trial_history(user_id, launch_granted_at) VALUES (b.user_id, now())
  ON CONFLICT (user_id) DO UPDATE SET launch_granted_at = now() WHERE public.business_trial_history.launch_granted_at IS NULL;
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n = 0 THEN RETURN 'already_used'; END IF;
 PERFORM set_config('revvin.launch_trial','1',true);
 UPDATE public.businesses SET pro_trial_ends_at = greatest(coalesce(b.pro_trial_ends_at, now()), now() + interval '14 days') WHERE id = b.id;
 PERFORM set_config('revvin.launch_trial','',true);
 RETURN 'started';
END $$;
REVOKE ALL ON FUNCTION public.fn_start_launch_trial(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_start_launch_trial(uuid) TO service_role;