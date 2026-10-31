ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS acquisition jsonb;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS pro_trial_ends_at timestamptz;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS published_notified_at timestamptz;
CREATE OR REPLACE FUNCTION public.fn_new_business_acquisition_trial() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE metadata jsonb; clean jsonb := '{}'::jsonb; k text;
BEGIN
 IF TG_OP = 'INSERT' THEN
  NEW.pro_trial_ends_at := now() + interval '14 days';
  SELECT raw_user_meta_data INTO metadata FROM auth.users WHERE id = NEW.user_id;
  IF jsonb_typeof(metadata->'acquisition') = 'object' THEN
   FOREACH k IN ARRAY ARRAY['utm_source','utm_medium','utm_campaign','utm_content','utm_term','landing_path'] LOOP
    IF jsonb_typeof(metadata->'acquisition'->k) = 'string' THEN clean := clean || jsonb_build_object(k,left(metadata->'acquisition'->>k,200)); END IF;
   END LOOP;
   NEW.acquisition := clean;
  END IF;
  IF coalesce(metadata->>'preview_trade','') <> '' THEN NEW.category := left(metadata->>'preview_trade',80); NEW.industry := NEW.category; END IF;
  IF coalesce(metadata->>'preview_reward','') ~ '^\d{1,7}$' AND (metadata->>'preview_reward')::numeric BETWEEN 1 AND 1000000 THEN NEW.offer_amount := '$' || (metadata->>'preview_reward'); END IF;
  NEW.published_notified_at := NULL;
 ELSIF NEW.pro_trial_ends_at IS DISTINCT FROM OLD.pro_trial_ends_at THEN RAISE EXCEPTION 'Trial expiry is managed by the server';
 ELSIF NEW.published_notified_at IS DISTINCT FROM OLD.published_notified_at AND coalesce(auth.role(),'') <> 'service_role' AND session_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'Publication notifications are managed by the server';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_acquisition_trial_guard BEFORE INSERT OR UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.fn_new_business_acquisition_trial();
CREATE OR REPLACE FUNCTION public.fn_effective_plan(p_business_id uuid) RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE b public.businesses%ROWTYPE;
BEGIN
 SELECT * INTO b FROM public.businesses WHERE id=p_business_id;
 IF b.id IS NULL THEN RETURN 'free'; END IF;
 IF coalesce(auth.role(),'') <> 'service_role' AND auth.uid() IS DISTINCT FROM b.user_id AND NOT coalesce(public.has_role(auth.uid(),'admin'),false) THEN RAISE EXCEPTION 'not_authorized'; END IF;
 RETURN CASE WHEN b.plan='pro' OR b.pro_trial_ends_at > now() THEN 'pro' ELSE coalesce(b.plan,'free') END;
END $$;
REVOKE ALL ON FUNCTION public.fn_effective_plan(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_effective_plan(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.fn_enforce_free_contact_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan text; v_demo boolean; v_count integer;
BEGIN
 SELECT public.fn_effective_plan(id),coalesce(is_demo,false) INTO v_plan,v_demo FROM public.businesses WHERE id=NEW.business_id;
 IF coalesce(v_plan,'free')='pro' OR v_demo THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('free_contact_limit:' || NEW.business_id::text));
 SELECT count(*) INTO v_count FROM public.referral_contacts WHERE business_id=NEW.business_id;
 IF v_count>=100 THEN RAISE EXCEPTION 'free_contact_limit' USING ERRCODE='P0001'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.fn_contact_ask_allowed(p_business_id uuid,p_contact_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE owner_id uuid; rank_number bigint;
BEGIN
 SELECT user_id INTO owner_id FROM public.businesses WHERE id=p_business_id;
 IF auth.uid() IS DISTINCT FROM owner_id AND coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'not_authorized'; END IF;
 IF public.fn_effective_plan(p_business_id)='pro' THEN RETURN EXISTS(SELECT 1 FROM public.referral_contacts WHERE id=p_contact_id AND business_id=p_business_id); END IF;
 SELECT position INTO rank_number FROM (SELECT id,row_number() OVER (ORDER BY created_at,id) AS position FROM public.referral_contacts WHERE business_id=p_business_id) ranked WHERE id=p_contact_id;
 RETURN coalesce(rank_number<=100,false);
END $$;
REVOKE ALL ON FUNCTION public.fn_contact_ask_allowed(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_contact_ask_allowed(uuid,uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.fn_guard_contact_ask_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
BEGIN
 IF NOT public.fn_contact_ask_allowed(NEW.business_id,NEW.contact_id) THEN RAISE EXCEPTION 'free_ask_limit'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_contact_ask_limit BEFORE INSERT ON public.referral_contact_sends FOR EACH ROW EXECUTE FUNCTION public.fn_guard_contact_ask_limit();
CREATE OR REPLACE FUNCTION public.fn_record_acquisition_event(p_event text,p_path text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
BEGIN
 IF p_event IN ('preview_started','preview_submitted') THEN
  IF p_path <> '/' AND p_path !~ '^/start(/[a-z-]{1,40})?$' THEN RETURN false; END IF;
 ELSIF p_event='signup_completed' THEN
  IF p_path NOT IN ('/signup','/auth','/welcome','/dashboard') THEN RETURN false; END IF;
 ELSE RETURN false;
 END IF;
 IF NOT public.fn_rate_bucket_hit('acquisition:' || coalesce(auth.uid()::text,left(coalesce(current_setting('request.headers',true),'anonymous'),256)),interval '1 minute',30) THEN RETURN false; END IF;
 INSERT INTO public.funnel_events(event,path,meta) VALUES(p_event,p_path,jsonb_build_object('traffic',CASE WHEN p_event='signup_completed' THEN 'product' ELSE 'marketing' END,'is_demo',false));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.fn_record_acquisition_event(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_record_acquisition_event(text,text) TO anon,authenticated,service_role;