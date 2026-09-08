-- ===========================================================================
-- UNAPPLIED. Scheduled authenticated drain of notification_jobs.
-- ===========================================================================
-- Apply ONLY after 20260908_release_1.sql is applied and the notify-new-lead
-- function is deployed. Applying this first schedules calls to a worker whose
-- tables do not exist yet; every run would fail and retry.
--
-- Why a schedule at all: the browser no longer invokes notify-new-lead. Lead
-- creation persists a notification job, and this job is what drains it. Without
-- it, queued owner emails sit undelivered (nothing is lost, nothing is sent).
--
-- Authentication: notify-new-lead is deployed with verify_jwt = false and
-- authenticates the request itself, in _shared/cron-auth.ts, against either the
-- CRON_SECRET function secret (x-cron-secret header) or an exact service-role
-- key. A decoded JWT is never accepted as authentication.
--
-- OPERATOR STEP, REQUIRED BEFORE RUNNING THIS FILE
-- ------------------------------------------------
-- Substitute the placeholder below with the SAME shared cron secret the
-- existing jobs use, which is the value of the CRON_SECRET function secret.
-- Read it from the current schedule rather than inventing a new one:
--
--     SELECT command FROM cron.job WHERE jobname = 'nudge-stale-leads';
--
-- Do not commit the substituted value back into this repository, do not paste
-- it into chat, and do not log it. The five existing jobs (monthly-roi-recap,
-- process-referral-triggers, nudge-stale-leads, process-campaign-sends,
-- dispatch-webhooks) already carry this header inline, so this file follows the
-- established pattern rather than introducing a second credential scheme.
--
-- The alternative pattern in this project is the vault: the email queue reads
-- 'email_queue_service_role_key' from vault.decrypted_secrets. That is the only
-- secret currently in the vault. If you prefer the vault route, store the cron
-- secret as its own vault entry and swap the header expression for a
-- subselect against vault.decrypted_secrets; do not reuse the service-role key
-- entry for this worker.
--
-- Every two minutes is enough: the job is a durable queue drain, not a
-- real-time delivery path. Claims use leases and a stable provider idempotency
-- key. End-to-end duplicate prevention still depends on provider behavior and
-- retention and requires isolated verification; leases alone are not proof.

SELECT cron.schedule(
  'drain-notification-jobs',
  '*/2 * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://olmpplfgzegzqdcznlrp.supabase.co/functions/v1/notify-new-lead',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', '<<PASTE_CRON_SECRET_BEFORE_RUNNING>>'
      ),
      body := '{"drain":true}'::jsonb
    );
  $cron$
);

-- Rollback: SELECT cron.unschedule('drain-notification-jobs');
-- Rolling this back stops delivery attempts. It does not delete queued jobs, so
-- rescheduling later drains whatever accumulated, subject to each job's own
-- retry and expiry rules.
