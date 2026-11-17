-- 0034: every transactional enqueue carries an unsubscribe token; Earn never promises an email it cannot queue.
-- Rollback:
--   CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $f$ BEGIN RETURN pgmq.send(queue_name, payload); EXCEPTION WHEN undefined_table THEN PERFORM pgmq.create(queue_name); RETURN pgmq.send(queue_name, payload); END; $f$;
--   Restore public.fn_earn_get_link from drizzle/migrations (definition before 0034);
--   DROP FUNCTION public.fn_email_unsubscribe_token(text);

CREATE OR REPLACE FUNCTION public.fn_email_unsubscribe_token(p_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE e text := lower(btrim(coalesce(p_email, ''))); t text;
BEGIN
  IF e = '' THEN RETURN NULL; END IF;
  SELECT x.token INTO t FROM public.email_unsubscribe_tokens x WHERE x.email = e LIMIT 1;
  IF t IS NULL THEN
    INSERT INTO public.email_unsubscribe_tokens(token, email)
    VALUES (replace(gen_random_uuid()::text, '-', ''), e)
    ON CONFLICT (email) DO NOTHING;
    SELECT x.token INTO t FROM public.email_unsubscribe_tokens x WHERE x.email = e LIMIT 1;
  END IF;
  RETURN t;
END;
$function$;
REVOKE ALL ON FUNCTION public.fn_email_unsubscribe_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_email_unsubscribe_token(text) TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE p jsonb := payload;
BEGIN
  IF queue_name = 'transactional_emails' AND coalesce(p->>'to', '') <> '' THEN
    IF coalesce(p->>'unsubscribe_token', '') = '' THEN
      p := p || jsonb_build_object('unsubscribe_token', public.fn_email_unsubscribe_token(p->>'to'));
    END IF;
    IF coalesce(p->>'message_id', '') = '' THEN
      p := p || jsonb_build_object('message_id', gen_random_uuid()::text);
    END IF;
    IF coalesce(p->>'idempotency_key', '') = '' THEN
      p := p || jsonb_build_object('idempotency_key', p->>'message_id');
    END IF;
  END IF;
  RETURN pgmq.send(queue_name, p);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, p);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_earn_get_link(p_business_slug text, p_name text, p_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ DECLARE b public.businesses%ROWTYPE; r public.referrers%ROWTYPE; e text; n text:=btrim(coalesce(p_name,'')); created boolean:=false; BEGIN SELECT x.* INTO b FROM public.businesses x WHERE x.slug=lower(btrim(p_business_slug)) AND EXISTS(SELECT 1 FROM public.metros m WHERE m.is_live AND public.fn_earn_eligible(x,m)) LIMIT 1; IF b.id IS NULL THEN RAISE EXCEPTION 'not_on_earn'; END IF; IF NOT public.fn_rate_bucket_hit('earn_ip:'||public.fn_request_bucket(),interval '1 hour',10) OR NOT public.fn_rate_bucket_hit('earn_global',interval '1 hour',100) THEN RAISE EXCEPTION 'rate_limited'; END IF; IF public.fn_email_owned() THEN SELECT lower(email) INTO e FROM auth.users WHERE id=auth.uid(); ELSE e:=lower(btrim(coalesce(p_email,''))); END IF; IF e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' OR length(e)>254 THEN RAISE EXCEPTION 'invalid_email'; END IF; SELECT * INTO r FROM public.referrers WHERE business_id=b.id AND lower(email)=e LIMIT 1; IF r.id IS NULL THEN IF length(n) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'invalid_name'; END IF; r:=public.fn_upsert_referrer(b.id,n,e,NULL); created:=true; END IF; IF public.fn_email_owned() THEN RETURN r.token; END IF; BEGIN IF EXISTS(SELECT 1 FROM public.suppressed_emails WHERE email=e) THEN RAISE EXCEPTION 'email_suppressed'; END IF; PERFORM public.enqueue_email('transactional_emails',jsonb_build_object('to',e,'from','Revvin <info@revvin.co>','reply_to','info@revvin.co','subject','Your Revvin referral link','text','Your personal referral link: https://revvin.co/r/'||b.slug||'?ref='||r.token,'html','<p>Your personal referral link: <a href="https://revvin.co/r/'||b.slug||'?ref='||r.token||'">Open your link</a></p>','purpose','transactional','label','earn_link','queued_at',to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'idempotency_key','earn_link:'||r.id::text||':'||to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD'),'message_id',gen_random_uuid()::text)); EXCEPTION WHEN OTHERS THEN IF created THEN RETURN r.token; END IF; RAISE EXCEPTION 'email_unavailable'; END; RETURN NULL; END $function$;