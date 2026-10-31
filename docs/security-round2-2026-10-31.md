# Security round 2: freshness, retention, monitoring, incident readiness

Date: 2026-10-31. Not published; database and edge function changes are live.

## 1. Service worker freshness

- `src/pwa/register.ts`: after registering, the app now asks the browser for a
  new worker immediately, again every time the tab becomes visible, and hourly
  while the tab stays open. Without this the browser could wait up to a day
  before noticing a new deployment. The reload on `controllerchange` no longer
  has a 10-second window: a page served by an old worker reloads exactly once
  whenever the new worker takes over.
- The worker itself (`src/pwa/service-worker.js`) already met the remaining
  requirements and was verified by test: HTML and navigations are network-only
  with `cache: "no-store"`, the offline page is served only when the network
  fails, only content-hashed `/assets/*` and `/fonts/*` are cached, every
  build gets a new cache version, old caches are purged on activate, and the
  worker calls `skipWaiting` plus `clients.claim`.
- Tests: `src/test/pwa-register.test.ts` (update checks, single reload),
  `src/test/service-worker-behavior.test.ts` (worker never caches HTML,
  offline fallback only on network failure, cache purge on activate).

## 2. Data retention

- Migration `drizzle/migrations/0015_security_round2_flags_events_retention.sql`
  adds `public.fn_data_retention()`, scheduled daily at 03:15 UTC as pg_cron
  job `data-retention-daily` (id 105). Each run writes its counts to
  `audit_log` with event type `data_retention`.
- Rules: closed leads (won, lost, invalid) untouched for 24 months are
  anonymized (referred person's name, phone, email and need text removed; row,
  status, reward and dates kept). Processed referral triggers older than 90
  days lose the customer email and phone. `notifications_log` and
  `email_send_log` rows older than 180 days are deleted. `funnel_events` older
  than 13 months are deleted. Open leads and `referral_contacts` (the
  business's own customer list) are never touched.
- The privacy page (`src/content/legal.ts`, section 6) now states these
  periods in plain language.
- Test: `security-round2.test.ts` runs the real function in isolated
  PostgreSQL against old and new rows and checks the audit entry and
  idempotency.

## 3. Monitoring and alerts

- New edge function `supabase/functions/security-monitor/index.ts`, scheduled
  every 15 minutes (pg_cron job `security-monitor`, id 106, 96 runs/day, same
  cadence as the existing trigger and nudge jobs). Requires the cron secret or
  the service-role credential via `checkCronAuth`.
- Alerts email info@revvin.co, throttled to one per type per 6 hours, and are
  recorded in the new `security_alerts` table. Checks: more than 20 signups in
  an hour; more than 300 outbound emails in an hour; more than 50 campaign
  emails to one business's contacts in 10 minutes; more than 100 rate-limit
  rejections in an hour; any `user_roles` change (including new admins); any
  webhook endpoint created; any business in a restricted category publishing.
- On Mondays (UTC) it sends one weekly summary: signups, publishes, emails
  sent, rate-limit hits, role changes, and retention job totals.
- Supporting migration changes: new `security_events` table; a trigger on
  `user_roles` records every role change; `fn_rate_bucket_hit` now records a
  `rate_limited` security event when a caller goes over budget (the allow
  decision is unchanged).
- The CRM has a new Security tab (`src/components/admin/SecurityPanel.tsx`)
  showing recent alerts, served by new `sa-data` actions `get_flags`,
  `set_flag` and `get_security_alerts`.
- Not done: 4xx/5xx and auth-failure spikes from HTTP logs. Edge functions
  cannot query the platform log store, so the monitor covers the
  database-visible signals only.

## 4. Incident readiness

- `docs/incident-runbook.md`: plain-language runbook covering the kill
  switches, pausing signups and email, unpublishing a page, rotating each
  secret (platform keys, Resend, Stripe webhook secret, cron secret, Google
  Maps key), PIPEDA and US state breach notification basics, and a one-page
  checklist.
- Kill switches are server-enforced through the new `platform_flags` table
  (service role only): a `BEFORE INSERT` trigger on `auth.users` refuses new
  accounts while `signups_paused` is on, and every outbound email path checks
  `outbound_email_paused` (`_shared/resend-gateway.ts` for direct sends,
  `process-email-queue` for queued sends; queued messages send after the pause
  lifts). Security monitor alerts still send while email is paused, by design.
- All 19 email-sending edge functions were redeployed so the pause check is
  live everywhere.

## 5. security.txt

- `public/.well-known/security.txt` with Contact (info@revvin.co), Expires
  2027-10-31, Preferred-Languages en, and the canonical URL.

## Files changed

- `drizzle/migrations/0015_security_round2_flags_events_retention.sql` (new)
- `supabase/functions/security-monitor/index.ts` (new)
- `supabase/functions/_shared/resend-gateway.ts` (outbound pause check)
- `supabase/functions/process-email-queue/index.ts` (outbound pause check)
- `supabase/functions/sa-data/index.ts` (flags and alerts admin actions)
- `src/pwa/register.ts` (proactive update checks, single reload)
- `src/components/admin/SecurityPanel.tsx` (new)
- `src/pages/SuperAdminCRM.tsx` (Security tab)
- `src/content/legal.ts` (retention periods)
- `public/.well-known/security.txt` (new)
- `src/test/security-round2.test.ts`, `src/test/pwa-register.test.ts` (new)
- `docs/incident-runbook.md` (new)

## Schedules

- `data-retention-daily`: daily 03:15 UTC, SQL only.
- `security-monitor`: every 15 minutes (96 runs/day), HTTP with the
  vault-stored server credential, same pattern as the existing jobs.

## Verification

- New tests: 14 passed (`security-round2.test.ts`, `pwa-register.test.ts`).
- Full suite and build results: see the final report in the chat.
- The deployed monitor returns 401 to unauthenticated calls (verified live).
