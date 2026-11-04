CREATE OR REPLACE FUNCTION public.fn_new_business_acquisition_trial()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE metadata jsonb; clean jsonb := '{}'::jsonb; k text;
BEGIN
 IF TG_OP = 'INSERT' THEN
  NEW.pro_trial_ends_at := now() + interval '14 days';
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
 ELSIF NEW.pro_trial_ends_at IS DISTINCT FROM OLD.pro_trial_ends_at THEN RAISE EXCEPTION 'Trial expiry is managed by the server';
 ELSIF NEW.published_notified_at IS DISTINCT FROM OLD.published_notified_at AND coalesce(auth.role(),'') <> 'service_role' AND session_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'Publication notifications are managed by the server';
 END IF;
 RETURN NEW;
END $function$;