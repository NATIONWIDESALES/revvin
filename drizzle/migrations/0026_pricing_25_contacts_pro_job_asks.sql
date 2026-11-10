-- Free contact cap and Pro job asks. Existing guards, grants and rate limits retained.
CREATE OR REPLACE FUNCTION public.fn_enforce_free_contact_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan text; v_demo boolean; v_count integer;
BEGIN
 SELECT public.fn_effective_plan(id),coalesce(is_demo,false) INTO v_plan,v_demo FROM public.businesses WHERE id=NEW.business_id;
 IF coalesce(v_plan,'free')='pro' OR v_demo THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('free_contact_limit:' || NEW.business_id::text));
 SELECT count(*) INTO v_count FROM public.referral_contacts WHERE business_id=NEW.business_id;
 IF v_count>=25 THEN RAISE EXCEPTION 'free_contact_limit' USING ERRCODE='P0001'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.fn_contact_ask_allowed(p_business_id uuid,p_contact_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE owner_id uuid; rank_number bigint;
BEGIN
 SELECT user_id INTO owner_id FROM public.businesses WHERE id=p_business_id;
 IF auth.uid() IS DISTINCT FROM owner_id AND coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'not_authorized'; END IF;
 IF public.fn_effective_plan(p_business_id)='pro' THEN RETURN EXISTS(SELECT 1 FROM public.referral_contacts WHERE id=p_contact_id AND business_id=p_business_id); END IF;
 SELECT position INTO rank_number FROM (SELECT id,row_number() OVER (ORDER BY created_at,id) AS position FROM public.referral_contacts WHERE business_id=p_business_id) ranked WHERE id=p_contact_id;
 RETURN coalesce(rank_number<=25,false);
END $$;

CREATE OR REPLACE FUNCTION public.fn_create_job_ask(p_business_id uuid,p_data jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$ DECLARE b public.businesses%ROWTYPE; result uuid; cap integer; BEGIN SELECT * INTO b FROM public.businesses WHERE id=p_business_id; IF b.user_id IS DISTINCT FROM auth.uid() AND coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'not_authorized'; END IF; IF public.fn_effective_plan(b.id)<>'pro' THEN RAISE EXCEPTION 'pro_required_automatic_ask'; END IF; IF length(p_data::text)>4000 OR length(coalesce(p_data->>'customer_first_name','')) NOT BETWEEN 1 AND 80 OR length(coalesce(p_data->>'customer_email',''))>254 OR length(coalesce(p_data->>'customer_phone',''))>32 OR length(coalesce(p_data->>'service_description',''))>500 OR length(coalesce(p_data->>'technician_name',''))>120 THEN RAISE EXCEPTION 'invalid_job'; END IF; cap:=CASE WHEN public.fn_effective_plan(b.id)='pro' THEN 300 ELSE 50 END; IF NOT public.fn_rate_bucket_hit('job_hour:'||b.id,interval '1 hour',120) OR NOT public.fn_rate_bucket_hit('job_day:'||b.id,interval '1 day',cap) THEN RAISE EXCEPTION 'rate_limited'; END IF; INSERT INTO public.referral_triggers(business_id,source,source_event_id,customer_first_name,customer_email,customer_phone,service_description,technician_name,amount_paid,review_request_status,referral_requires_positive_signal,status,channel,failure_reason,scheduled_send_at) VALUES(b.id,'manual',gen_random_uuid()::text,p_data->>'customer_first_name',nullif(p_data->>'customer_email',''),nullif(p_data->>'customer_phone',''),p_data->>'service_description',p_data->>'technician_name',nullif(p_data->>'amount_paid','')::numeric,CASE WHEN p_data->>'review_request_status'='scheduled' AND nullif(p_data->>'customer_email','') IS NOT NULL AND b.google_review_url ~ '^https://' THEN 'scheduled' ELSE 'off' END,coalesce((p_data->>'referral_requires_positive_signal')::boolean,false),CASE WHEN nullif(p_data->>'customer_email','') IS NULL THEN 'canceled' ELSE 'scheduled' END,CASE WHEN nullif(p_data->>'customer_email','') IS NULL THEN NULL ELSE 'email' END,CASE WHEN nullif(p_data->>'customer_email','') IS NULL THEN 'no_email_send_by_text_from_your_phone' END,now()+make_interval(hours=>b.trigger_delay_hours)) RETURNING id INTO result; RETURN result; END $$;

CREATE OR REPLACE FUNCTION public.fn_job_daily_cap() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$ DECLARE daily integer; hourly integer; cap integer; BEGIN IF public.fn_effective_plan(NEW.business_id)<>'pro' THEN RAISE EXCEPTION 'pro_required_automatic_ask'; END IF; PERFORM pg_advisory_xact_lock(hashtext('job_cap:'||NEW.business_id::text)); cap:=CASE WHEN public.fn_effective_plan(NEW.business_id)='pro' THEN 300 ELSE 50 END; SELECT count(*) FILTER(WHERE created_at>=now()-interval '1 hour'),count(*) FILTER(WHERE created_at>=date_trunc('day',now())) INTO hourly,daily FROM public.referral_triggers WHERE business_id=NEW.business_id; IF hourly>=120 OR daily>=cap THEN RAISE EXCEPTION 'job_ask_limit'; END IF; RETURN NEW; END $$;
