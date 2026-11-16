-- 0032: Private operational failures, using existing queue and retention run.
CREATE TABLE public.app_failures (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), step text NOT NULL,
 message text NOT NULL, code text, route text, business_id uuid, user_id uuid,
 build_id text, user_agent text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_failures TO service_role;
ALTER TABLE public.app_failures ENABLE ROW LEVEL SECURITY;
CREATE INDEX app_failures_recent ON public.app_failures(created_at DESC);
CREATE INDEX app_failures_group ON public.app_failures(step,business_id,created_at DESC);
CREATE TABLE public.failure_alerts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), step text NOT NULL,
 business_id uuid, sent_at timestamptz NOT NULL DEFAULT now(), message_id uuid NOT NULL
);
GRANT ALL ON public.failure_alerts TO service_role;
ALTER TABLE public.failure_alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX failure_alerts_recent ON public.failure_alerts(sent_at DESC);

CREATE FUNCTION public.fn_failure_scrub(p_text text) RETURNS text
 LANGUAGE sql IMMUTABLE SET search_path=public,pg_catalog AS $$
 SELECT left(regexp_replace(regexp_replace(regexp_replace(coalesce(p_text,''),
 '(https?://[^[:space:]]+|[[:alnum:].+_-]+@[[:alnum:]._-]+|Bearer[[:space:]]+[^[:space:]]+|eyJ[[:alnum:]._-]+)', '[redacted]', 'gi'),
 '(password|token|secret|authorization)[[:space:]]*[:=][[:space:]]*[^[:space:]]+', '[redacted]', 'gi'),
 '(\([^)]*\)|"[^"]*"|''[^'']*'')','[redacted]','g'),300)
 $$;
REVOKE ALL ON FUNCTION public.fn_failure_scrub(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_failure_scrub(text) TO service_role;

CREATE FUNCTION public.fn_report_failure(p_step text,p_message text,p_code text,p_route text,p_business_id uuid,p_build_id text,p_user_agent text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE
 uid uuid := auth.uid(); bid uuid; b public.businesses%ROWTYPE;
 f public.app_failures%ROWTYPE; owner_email text; business_name text;
 daily integer; repeats integer; mid uuid := gen_random_uuid(); token text;
 body text; subject text;
BEGIN
 IF p_step IS NULL OR p_step NOT IN ('image_upload','logo_save','signup','business_create','setup_save','publish','unpublish','referral_submit','lead_status','closed_won','reward_paid','customer_import','job_done_ask','checkout','render_crash') THEN RETURN false; END IF;
 IF uid IS NOT NULL THEN
   SELECT * INTO b FROM public.businesses WHERE user_id=uid LIMIT 1;
   IF coalesce(b.is_demo,false) THEN RETURN false; END IF;
   bid:=b.id;
   IF p_business_id IS NOT NULL AND bid IS DISTINCT FROM p_business_id THEN
     IF p_step<>'referral_submit' THEN RETURN false; END IF;
     SELECT * INTO b FROM public.businesses WHERE id=p_business_id AND public.fn_page_live(account_status,is_published,is_disabled) LIMIT 1;
     bid:=b.id;
   END IF;
 ELSIF p_business_id IS NOT NULL THEN
   IF p_step<>'referral_submit' THEN RETURN false; END IF;
   SELECT * INTO b FROM public.businesses WHERE id=p_business_id AND public.fn_page_live(account_status,is_published,is_disabled) LIMIT 1;
   bid:=b.id;
 END IF;
 IF coalesce(b.is_demo,false) OR (p_business_id IS NOT NULL AND bid IS NULL) THEN RETURN false; END IF;
 IF NOT public.fn_rate_bucket_hit('failure:'||public.fn_request_bucket(),interval '1 hour',60)
    OR NOT public.fn_rate_bucket_hit('failure:global',interval '1 hour',3000) THEN RETURN false; END IF;
 INSERT INTO public.app_failures(step,message,code,route,business_id,user_id,build_id,user_agent)
 VALUES(p_step,public.fn_failure_scrub(p_message),public.fn_failure_scrub(p_code),
   CASE WHEN p_route LIKE '/%' THEN left(split_part(split_part(p_route,'?',1),'#',1),300) ELSE '/' END,
   bid,uid,left(p_build_id,100),left(p_user_agent,300)) RETURNING * INTO f;
 -- Serialize reservations: sliding hourly throttle and Pacific calendar-day cap.
 PERFORM pg_advisory_xact_lock(320032);
 IF EXISTS(SELECT 1 FROM public.failure_alerts WHERE step=p_step AND business_id IS NOT DISTINCT FROM bid AND sent_at>now()-interval '1 hour') THEN RETURN true; END IF;
 SELECT count(*) INTO daily FROM public.failure_alerts WHERE (sent_at AT TIME ZONE 'America/Los_Angeles')::date=(now() AT TIME ZONE 'America/Los_Angeles')::date;
 IF daily>=20 THEN RETURN true; END IF;
 SELECT count(*) INTO repeats FROM public.app_failures WHERE step=p_step AND business_id IS NOT DISTINCT FROM bid AND created_at>now()-interval '24 hours';
 business_name:=coalesce(b.name,'signed-out visitor');
 IF b.user_id IS NOT NULL THEN SELECT email INTO owner_email FROM auth.users WHERE id=b.user_id; END IF;
 subject:='Revvin failure: '||p_step||' for '||left(regexp_replace(business_name,'[\r\n]',' ','g'),120);
 body:='Step: '||p_step||E'\nError: '||f.message||E'\nCode: '||coalesce(f.code,'')||E'\nBusiness: '||business_name||E'\nOwner email: '||coalesce(owner_email,'unknown')||E'\nRoute: '||f.route||E'\nTime (Pacific): '||to_char(now() AT TIME ZONE 'America/Los_Angeles','YYYY-MM-DD HH24:MI:SS')||E'\nSame failure in last 24 hours: '||repeats||E'\nFailures list: https://revvin.co/__sa?tab=failures';
 IF daily=19 THEN body:=body||E'\nAlerts paused until midnight Pacific, check the failures list'; END IF;
 SELECT t.token INTO token FROM public.email_unsubscribe_tokens t WHERE lower(t.email)='info@revvin.co' LIMIT 1;
 IF token IS NULL THEN
   token:=replace(gen_random_uuid()::text,'-','');
   INSERT INTO public.email_unsubscribe_tokens(token,email) VALUES(token,'info@revvin.co');
 END IF;
 PERFORM public.enqueue_email('transactional_emails',jsonb_build_object(
   'to','info@revvin.co','from','Revvin <info@revvin.co>','reply_to','info@revvin.co',
   'sender_domain','notify.revvin.co','subject',subject,'text',body,
   'purpose','transactional','label','failure_alert','unsubscribe_token',token,
   'queued_at',to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   'idempotency_key','failure_alert:'||f.id::text,'message_id',mid::text));
 INSERT INTO public.failure_alerts(step,business_id,message_id) VALUES(p_step,bid,mid);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.fn_report_failure(text,text,text,text,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_report_failure(text,text,text,text,uuid,text,text) TO anon,authenticated,service_role;

CREATE FUNCTION public.fn_admin_failures() RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM (
   SELECT f.id,f.created_at,f.step,f.message,coalesce(b.name,'signed-out visitor') AS business
   FROM public.app_failures f LEFT JOIN public.businesses b ON b.id=f.business_id
   ORDER BY f.created_at DESC LIMIT 100) r),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.fn_admin_failures() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_failures() TO authenticated;

CREATE FUNCTION public.fn_failure_retention() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
BEGIN
 DELETE FROM public.app_failures WHERE created_at<now()-interval '90 days';
 DELETE FROM public.failure_alerts WHERE sent_at<now()-interval '90 days';
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fn_failure_retention() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER trg_failure_retention AFTER INSERT ON public.audit_log
 FOR EACH ROW WHEN (NEW.event_type='data_retention') EXECUTE FUNCTION public.fn_failure_retention();

/* Rollback (archive the private failure records first):
DROP TRIGGER trg_failure_retention ON public.audit_log;
DROP FUNCTION public.fn_failure_retention();
DROP FUNCTION public.fn_admin_failures();
DROP FUNCTION public.fn_report_failure(text,text,text,text,uuid,text,text);
DROP FUNCTION public.fn_failure_scrub(text);
DROP TABLE public.failure_alerts;
DROP TABLE public.app_failures;
Queued emails are not canceled by rollback. Existing queue and retention functions are unchanged.
*/