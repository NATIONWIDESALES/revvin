-- Private request correlation only: never persist URLs, headers or bodies here.
CREATE TABLE public.scheduled_http_requests (
  request_id bigint PRIMARY KEY,
  job_key text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.scheduled_http_requests TO service_role;
ALTER TABLE public.scheduled_http_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.scheduled_http_requests FROM anon, authenticated;
CREATE INDEX scheduled_http_requests_time_idx ON public.scheduled_http_requests(requested_at);

-- Original definitions contain existing credentials. Keep rollback data private.
CREATE TABLE public.scheduled_http_rollback_20261124 (
  object_key text PRIMARY KEY,
  original_definition text NOT NULL,
  applied_definition text NOT NULL,
  timeout_changed boolean NOT NULL
);
GRANT ALL ON public.scheduled_http_rollback_20261124 TO service_role;
ALTER TABLE public.scheduled_http_rollback_20261124 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.scheduled_http_rollback_20261124 FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_scheduled_http_post(
  url text, body jsonb DEFAULT '{}'::jsonb, params jsonb DEFAULT '{}'::jsonb,
  headers jsonb DEFAULT '{"Content-Type":"application/json"}'::jsonb,
  timeout_milliseconds integer DEFAULT 15000, _job_key text DEFAULT 'unknown'
) RETURNS bigint LANGUAGE plpgsql SET search_path = '' AS $fn$
DECLARE request_id bigint;
BEGIN
  request_id := net.http_post(url := url, body := body, params := params, headers := headers, timeout_milliseconds := timeout_milliseconds);
  INSERT INTO public.scheduled_http_requests(request_id,job_key) VALUES(request_id,_job_key);
  RETURN request_id;
END $fn$;
CREATE OR REPLACE FUNCTION public.fn_scheduled_http_get(
  url text, params jsonb DEFAULT '{}'::jsonb, headers jsonb DEFAULT '{}'::jsonb,
  timeout_milliseconds integer DEFAULT 15000, _job_key text DEFAULT 'unknown'
) RETURNS bigint LANGUAGE plpgsql SET search_path = '' AS $fn$
DECLARE request_id bigint;
BEGIN
  request_id := net.http_get(url := url, params := params, headers := headers, timeout_milliseconds := timeout_milliseconds);
  INSERT INTO public.scheduled_http_requests(request_id,job_key) VALUES(request_id,_job_key);
  RETURN request_id;
END $fn$;
REVOKE ALL ON FUNCTION public.fn_scheduled_http_post(text,jsonb,jsonb,jsonb,integer,text), public.fn_scheduled_http_get(text,jsonb,jsonb,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_scheduled_http_post(text,jsonb,jsonb,jsonb,integer,text), public.fn_scheduled_http_get(text,jsonb,jsonb,integer,text) TO service_role;

-- Transform only named HTTP arguments. Balanced parsing preserves nested JSON,
-- quoted credentials, existing timeout choices and every other request argument.
CREATE OR REPLACE FUNCTION public.fn_rewrite_scheduled_http(source text, job_key text)
RETURNS text LANGUAGE plpgsql SET search_path = '' AS $fn$
DECLARE result text := ''; remaining text := source; match text[]; pos integer; opening integer;
  i integer; depth integer; quoted boolean; ch text; args text; prefix text;
BEGIN
  LOOP
    match := regexp_match(remaining, 'net\.(http_post|http_get)\s*\(', 'i');
    EXIT WHEN match IS NULL;
    -- The match array includes only the captured function name.
    pos := strpos(lower(remaining), 'net.' || lower(match[1]));
    opening := pos + strpos(substr(remaining,pos), '(') - 1;
    i := opening + 1; depth := 1; quoted := false;
    WHILE i <= length(remaining) LOOP
      ch := substr(remaining,i,1);
      IF ch = '''' THEN
        IF quoted AND substr(remaining,i+1,1) = '''' THEN i := i+2; CONTINUE; END IF;
        quoted := NOT quoted;
      ELSIF NOT quoted THEN
        IF ch = '(' THEN depth := depth+1;
        ELSIF ch = ')' THEN depth := depth-1; EXIT WHEN depth = 0;
        END IF;
      END IF;
      i := i+1;
    END LOOP;
    IF depth <> 0 THEN RAISE EXCEPTION 'Unbalanced scheduled HTTP call for %',job_key; END IF;
    args := substr(remaining,opening+1,i-opening-1);
    IF args !~* '^\s*\w+\s*(:=|=>)' THEN RAISE EXCEPTION 'Non-named HTTP arguments require review for %',job_key; END IF;
    prefix := format('_job_key := %L, ',job_key);
    IF args !~* '\mtimeout_milliseconds\M\s*(:=|=>)' THEN prefix := prefix || 'timeout_milliseconds := 15000, '; END IF;
    result := result || substr(remaining,1,pos-1) || 'public.fn_scheduled_' || lower(match[1]) || '(' || prefix || args || ')';
    remaining := substr(remaining,i+1);
  END LOOP;
  RETURN result || remaining;
END $fn$;
REVOKE ALL ON FUNCTION public.fn_rewrite_scheduled_http(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_rewrite_scheduled_http(text,text) TO service_role;

DO $migration$
DECLARE fn record; rewritten text;
BEGIN
  FOR fn IN SELECT format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature, pg_get_functiondef(p.oid) definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f' AND p.prosrc ~* 'net\.(http_post|http_get)\s*\('
      AND p.proname NOT IN ('fn_scheduled_http_post','fn_scheduled_http_get','fn_rewrite_scheduled_http') LOOP
    rewritten := public.fn_rewrite_scheduled_http(fn.definition,'function:' || fn.signature);
    INSERT INTO public.scheduled_http_rollback_20261124 VALUES('function:' || fn.signature,fn.definition,rewritten,fn.definition !~* '\mtimeout_milliseconds\M\s*(:=|=>)');
    EXECUTE rewritten;
    UPDATE public.scheduled_http_rollback_20261124 SET applied_definition=pg_get_functiondef(to_regprocedure(fn.signature)) WHERE object_key='function:' || fn.signature;
  END LOOP;
END $migration$;

-- Read raw responses unchanged, including isolated DNS errors. Correlation starts
-- at deployment; never infer a job from response timestamps or request ordering.
CREATE OR REPLACE FUNCTION public.fn_monitor_scheduled_http()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $fn$
  WITH recent AS (
    SELECT r.* FROM net._http_response r WHERE r.created > now()-interval '1 hour'
  ), totals AS (
    SELECT count(*) total,
      count(*) FILTER (WHERE status_code IS NULL OR status_code >=400 OR coalesce(timed_out,false) OR error_msg IS NOT NULL) failures,
      count(*) FILTER (WHERE status_code BETWEEN 400 AND 599) real_errors
    FROM recent
  ), ranked AS (
    SELECT q.job_key, r.status_code,
      (r.status_code IS NULL OR r.status_code >=400 OR coalesce(r.timed_out,false) OR r.error_msg IS NOT NULL) failed,
      row_number() OVER(PARTITION BY q.job_key ORDER BY q.requested_at DESC,q.request_id DESC) position
    FROM public.scheduled_http_requests q JOIN net._http_response r ON r.id=q.request_id
    WHERE q.requested_at>now()-interval '6 hours'
  ), streaks AS (
    SELECT job_key FROM ranked WHERE position <=3 GROUP BY job_key HAVING count(*)=3 AND bool_and(failed)
  ) SELECT jsonb_build_object('total',total,'failures',failures,'real_errors',real_errors,
      'consecutive_jobs',coalesce((SELECT jsonb_agg(job_key ORDER BY job_key) FROM streaks),'[]'::jsonb),
      'by_status',coalesce((SELECT jsonb_object_agg(status,c) FROM (
        SELECT coalesce(status_code::text,'error') status,count(*) c FROM recent
        WHERE status_code IS NULL OR status_code>=400 OR coalesce(timed_out,false) OR error_msg IS NOT NULL GROUP BY 1
      ) s),'{}'::jsonb)) FROM totals
$fn$;
REVOKE ALL ON FUNCTION public.fn_monitor_scheduled_http() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_monitor_scheduled_http() TO service_role;

-- Explicit service-only rollback, never auto-executed. Refuse to overwrite newer
-- function/job edits; keep all request and alert history for diagnosis.
CREATE OR REPLACE FUNCTION public.fn_rollback_scheduled_http_20261124()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE saved record; current_definition text;
BEGIN
  FOR saved IN SELECT * FROM public.scheduled_http_rollback_20261124 LOOP
      SELECT pg_get_functiondef(to_regprocedure(substr(saved.object_key,10))) INTO current_definition;
      IF current_definition IS DISTINCT FROM saved.applied_definition THEN RAISE EXCEPTION 'Function changed since migration: %',saved.object_key; END IF;
      EXECUTE saved.original_definition;
  END LOOP;
END $fn$;
REVOKE ALL ON FUNCTION public.fn_rollback_scheduled_http_20261124() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_rollback_scheduled_http_20261124() TO service_role;
