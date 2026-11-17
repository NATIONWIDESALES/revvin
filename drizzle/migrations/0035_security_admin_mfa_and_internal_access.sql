-- Rollback SQL (operator-reviewed only):
-- CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public, pg_catalog AS $old$ SELECT (coalesce(auth.role(),'')='service_role' OR _user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin')) AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $old$;
-- ALTER FUNCTION public.fn_business_derive_plan() RESET search_path;
-- GRANT ALL ON TABLE public.partners, public.partner_payouts, public.partner_commissions, public.partner_adjustments, public.partner_clicks, public.platform_flags, public.push_send_log, public.security_alerts, public.security_events, public.business_lifecycle_emails, public.business_trial_history, public.job_ask_delay_rollback_20261113 TO anon, authenticated;
-- DO $rollback$ DECLARE f record; BEGIN FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('create_default_notification_settings','enforce_business_slug_rules','fn_autocreate_reward_on_won','fn_contact_assign_referrer','fn_enforce_free_contact_limit','fn_enforce_single_active_seasonal','fn_freeze_lead_identity','fn_guard_contact_ask_limit','fn_guard_first_trial','fn_guard_is_verified','fn_guard_signups_paused','fn_job_daily_cap','fn_metro_guard','fn_new_business_acquisition_trial','fn_security_business_audit','fn_security_dispute_audit','fn_user_roles_security_audit','handle_new_user','prevent_business_privileged_updates','prevent_consent_timestamp_rollback','prevent_offer_privileged_updates','prevent_referrer_privileged_updates','prevent_status_self_approval') AND p.prorettype='trigger'::regtype LOOP EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC, anon, authenticated', f.signature); END LOOP; END $rollback$;

DO $hardening$
DECLARE f record;
BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND p.prorettype='trigger'::regtype
 LOOP EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature); END LOOP;
END $hardening$;
REVOKE ALL ON TABLE public.partners, public.partner_payouts, public.partner_commissions, public.partner_adjustments, public.partner_clicks, public.platform_flags, public.push_send_log, public.security_alerts, public.security_events, public.business_lifecycle_emails, public.business_trial_history, public.job_ask_delay_rollback_20261113, public.app_failures, public.failure_alerts, public.notification_jobs, public.referral_rate_buckets, public.referral_submissions FROM anon, authenticated;
ALTER FUNCTION public.fn_business_derive_plan() SET search_path TO public, pg_catalog;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public, pg_catalog
AS $$
 SELECT
  (coalesce(auth.role(),'')='service_role' OR _user_id=auth.uid() OR
   (EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin') AND
    (coalesce(auth.jwt()->>'aal','')='aal2' OR NOT EXISTS(
      SELECT 1 FROM auth.mfa_factors WHERE user_id=auth.uid() AND factor_type='totp' AND status='verified'))))
  AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
  AND (_role<>'admin' OR coalesce(auth.role(),'')='service_role' OR
    (_user_id=auth.uid() AND (coalesce(auth.jwt()->>'aal','')='aal2' OR NOT EXISTS(
      SELECT 1 FROM auth.mfa_factors WHERE user_id=auth.uid() AND factor_type='totp' AND status='verified'))));
$$;