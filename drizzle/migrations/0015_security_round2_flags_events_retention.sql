-- Security round 2: kill switches, security event recording, data retention.

-- 1. Platform flags (kill switches). Read and written only through the
-- sa-data admin function with the service role; no client access at all.
CREATE TABLE public.platform_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT ALL ON public.platform_flags TO service_role;
ALTER TABLE public.platform_flags ENABLE ROW LEVEL SECURITY;
INSERT INTO public.platform_flags (key, enabled) VALUES ('signups_paused', false), ('outbound_email_paused', false);

CREATE OR REPLACE FUNCTION public.fn_platform_flag(p_key text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT coalesce((SELECT enabled FROM public.platform_flags WHERE key = p_key), false)
$$;
REVOKE ALL ON FUNCTION public.fn_platform_flag(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_platform_flag(text) TO service_role;

-- 2. Signup kill switch, enforced server side at account creation.
CREATE OR REPLACE FUNCTION public.fn_guard_signups_paused() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF public.fn_platform_flag('signups_paused') THEN
    RAISE EXCEPTION 'signups_paused';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_signups_paused BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_signups_paused();

-- 3. Security events: rate-limit rejections and role changes, service only.
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_user_roles_security_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  INSERT INTO public.security_events (event_type, details) VALUES (
    'user_roles_change',
    jsonb_build_object(
      'action', TG_OP,
      'user_id', coalesce(NEW.user_id, OLD.user_id),
      'role', coalesce(NEW.role, OLD.role),
      'actor', auth.uid()
    )
  );
  RETURN coalesce(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_user_roles_security_audit AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.fn_user_roles_security_audit();

-- 4. Rate-limit rejections are recorded so the monitor can alert on spikes.
-- Same bucket logic as before; the only change is the security_events insert
-- when a caller goes over budget.
CREATE OR REPLACE FUNCTION public.fn_rate_bucket_hit(
  p_key      text,
  p_window   interval,
  p_max_hits integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _start timestamptz := to_timestamp(floor(extract(epoch FROM now()) / extract(epoch FROM p_window)) * extract(epoch FROM p_window));
  _hits  integer;
BEGIN
  INSERT INTO public.referral_rate_buckets (bucket_key, window_start, hits)
  VALUES (left(p_key, 200), _start, 1)
  ON CONFLICT (bucket_key, window_start)
    DO UPDATE SET hits = public.referral_rate_buckets.hits + 1
  RETURNING hits INTO _hits;

  DELETE FROM public.referral_rate_buckets
   WHERE (bucket_key, window_start) IN (
     SELECT bucket_key, window_start FROM public.referral_rate_buckets
      WHERE window_start < now() - interval '2 days' LIMIT 200);

  IF _hits > p_max_hits THEN
    INSERT INTO public.security_events (event_type, details)
    VALUES ('rate_limited', jsonb_build_object('bucket', left(p_key, 200), 'hits', _hits, 'max', p_max_hits));
  END IF;

  RETURN _hits <= p_max_hits;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_rate_bucket_hit(text, interval, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_rate_bucket_hit(text, interval, integer) TO service_role;

-- 5. Alerts the security monitor has sent, for throttling and the CRM panel.
CREATE TABLE public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  summary text NOT NULL,
  details jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.security_alerts TO service_role;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- 6. Data retention. Runs daily from pg_cron; counts are written to audit_log.
-- Only data older than the thresholds is touched. Open leads and customer
-- lists (referral_contacts) are never touched.
CREATE OR REPLACE FUNCTION public.fn_data_retention() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  n_leads integer;
  n_triggers integer;
  n_notifications integer;
  n_email_log integer;
  n_funnel integer;
  counts jsonb;
BEGIN
  -- Closed leads untouched for 24 months: anonymize the referred person,
  -- keep the row, status, reward and dates.
  UPDATE public.leads
     SET lead_name = 'Removed', lead_phone = NULL, lead_email = NULL, lead_need = 'Removed'
   WHERE status IN ('closed_won', 'closed_lost', 'invalid')
     AND coalesce(closed_at, updated_at) < now() - interval '24 months'
     AND (lead_name IS DISTINCT FROM 'Removed' OR lead_phone IS NOT NULL OR lead_email IS NOT NULL OR lead_need IS DISTINCT FROM 'Removed');
  GET DIAGNOSTICS n_leads = ROW_COUNT;

  -- Processed job-done asks older than 90 days: drop customer contact details.
  UPDATE public.referral_triggers
     SET customer_email = NULL, customer_phone = NULL
   WHERE (sent_at IS NOT NULL OR status IN ('sent', 'failed', 'canceled'))
     AND coalesce(sent_at, created_at) < now() - interval '90 days'
     AND (customer_email IS NOT NULL OR customer_phone IS NOT NULL);
  GET DIAGNOSTICS n_triggers = ROW_COUNT;

  DELETE FROM public.notifications_log WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS n_notifications = ROW_COUNT;

  DELETE FROM public.email_send_log WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS n_email_log = ROW_COUNT;

  DELETE FROM public.funnel_events WHERE created_at < now() - interval '13 months';
  GET DIAGNOSTICS n_funnel = ROW_COUNT;

  counts := jsonb_build_object(
    'leads_anonymized', n_leads,
    'referral_triggers_scrubbed', n_triggers,
    'notifications_log_deleted', n_notifications,
    'email_send_log_deleted', n_email_log,
    'funnel_events_deleted', n_funnel
  );
  INSERT INTO public.audit_log (referral_id, actor_id, event_type, payload)
  VALUES (NULL, '00000000-0000-0000-0000-000000000000'::uuid, 'data_retention', counts);
  RETURN counts;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_data_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_data_retention() TO service_role;