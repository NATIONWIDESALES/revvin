# Failure alerts, November 16, 2026

## Status

Migration `0032_failure_alerts.sql` is applied. Frontend changes are saved but not published. No Stripe request, price, webhook, email function or existing policy was changed. No edge function was deployed. No test alert was sent or resent.

**Remaining permissions constraint:** live read-back showed this database automatically grants `anon` and `authenticated` table privileges on newly created tables. The migration explicitly grants only service-role access, but those inherited grants still exist. Both new tables have RLS enabled with zero policies, so ordinary clients cannot read or insert any rows. Nevertheless, the literal requirement of no anon/authenticated SELECT grant is not met. Tightening those new grants requires `REVOKE ALL ON public.app_failures, public.failure_alerts FROM PUBLIC, anon, authenticated;`. This was not applied through an unrecorded command or a second migration because only migration 0032 was authorized. Existing policies remain unchanged. Do not call this rollout fully complete until this grant discrepancy is resolved.

## Implementation and scope

- One helper, `reportFailure(step, detail)`, returns immediately, catches all reporting errors, and skips ordinary tests and demo accounts. It reads only error message/code, not an arbitrary object or form. It scrubs quoted/parenthesized error values, emails, URLs, common secret patterns and bearer/JWT tokens, and bounds message/code to 300 characters. Route excludes query/hash and redacts preview/claim/status tokens.
- Server derives user ID from authentication, validates business association and demo status, allowlists steps and reuses the existing request bucket and rate-limit functions. Signed-out business association is permitted only for live public referral submissions.
- Private records remain separate from `funnel_events`: its existing allowed event names and privacy filtering do not support all requested operational moments or customer-linked error details. The migration does not change that table, its policies, `fn_submit_public_capture`, the smoke journey or monitor health.
- Alerts reuse `enqueue_email('transactional_emails', ...)` and the existing queue worker, including the verified sender domain, unsubscribe token, ISO `queued_at`, stable per-event idempotency key and message ID. `send-notification` was inspected but not modified: its authenticated template path cannot accept a signed-out failure, and its arbitrary email path is admin-only.
- PostgreSQL advisory locking serializes alert reservations. The sliding-hour step/business throttle and Pacific calendar-day cap apply to queued emails, including retries via one message ID. The twentieth email contains the final pause notice rather than sending a twenty-first email. Failure records continue when alerts are throttled.
- Existing daily retention is reused by an audit-log trigger after its `data_retention` entry. It removes only failure events/reservations older than 90 days. Existing retention job/functions and customer records are untouched.
- `/__sa?tab=failures` opens the latest-100 list. Server RPC checks admin role; sales users do not get the tab or records.

## Coverage and limitations

Added reporting at image decode/storage failure, logo URL save failure, non-validation signup failure, business-create failure, missing business/incomplete wizard save, setup-save error/catch, publish RPC error/catch, public referral submit error/missing receipt, lead/referral status and Closed Won saves, reward mark-paid, customer import, job-done ask scheduling and checkout creation failures, and ErrorBoundary catches. Checkout additions only observe existing failures; requests, fallback branches and destinations are unchanged.

No existing frontend unpublish handler exists in the current codebase. The server accepts the `unpublish` step, but no new unpublish UI/flow was invented. Job-done reporting covers the existing scheduling failure seen by the owner, not a later worker delivery failure. A fully offline client cannot deliver its report, and there is no new offline retry system. Raw unknown error strings can contain unanticipated sensitive fragments despite conservative scrubbing; no file/form payload is deliberately collected.

Actual queue-to-inbox delivery, minutes-to-alert timing, a real owner upload failure, and the authenticated admin screen remain unverified. The sender-domain check reported an active domain and a healthy queue with 23 sends over the previous seven days and one prior dead-lettered email. Queue health does not prove this new alert reaches an inbox. Requester-session minting found no matching app account; temporary-user approval was unavailable. No real customer was used and no live failure was injected.

## Tests and verification

- Full Vitest: **988 passed, 3 skipped**, across **78 passing test files and one skipped file**.
- `oj typecheck -b --noEmit`: **passed**, exit 0, no output.
- Latest preview build log: **build OK**. No manual production build or publish was run.
- Isolated PostgreSQL tests execute migration 0032 against fixture schemas: hourly throttle, sliding-hour reset, twenty-email cap/pause notice, next-day recovery, record continuation, demo/rate-limit/identity rejection, no direct client reads, admin-only list, error scrubbing, ISO/idempotent queue payload and 90-day retention.
- Helper tests: test-mode exclusion, explicit and owner-row demo exclusion, rejected network promises never escape, bounded scrubbed data.
- Image tests: storage and unreadable-image call sites fire reporting while preserving existing return messages.
- Referral component test: submit failure fires reporting without passing form values and leaves the form intact.
- Browser check at `http://localhost:8080/r/fixture`: intercepted referral RPC failure plus intercepted failure-report RPC, existing error toast shown, input retained, exactly one report with step `referral_submit`, code `503`, route `/r/fixture`. Screenshot `/tmp/browser/failure-alerts/referral-failure.png`. Signed-out `/__sa` did not show Failures. This was an intercepted fixture, not authenticated live delivery.
- Live reads confirmed both tables exist with RLS on, zero new read policies, three SECURITY DEFINER entry points, and the retention trigger. Live ACL reads revealed the permissions discrepancy above.

## Changelog: every changed file

- `src/lib/reportFailure.ts`: one non-blocking scrubbed operational reporter.
- `vite.config.ts`: compile-time app build identifier, using hosted commit reference or build timestamp.
- `src/lib/imageUpload.ts`: report failed decode and storage upload branches.
- `src/components/BusinessLogoUpload.tsx`: report logo URL save failure.
- `src/components/signup/SignupForm.tsx`: report non-validation signup failures only.
- `src/pages/dashboard/DashboardRouter.tsx`: report failed business creation.
- `src/pages/Onboarding.tsx`: report missing business and failed/incomplete owner saves.
- `src/lib/publishPage.ts`: report failed publish RPC and catch branches.
- `src/pages/PublicReferralPage.tsx`: report failed submission without passing referral fields.
- `src/pages/dashboard/BusinessDashboard.tsx`: report status/won/reward saves and existing checkout failure.
- `src/pages/dashboard/PayoutsPage.tsx`: report reward mark-paid failure.
- `src/components/dashboard/CustomersTab.tsx`: report existing import failure.
- `src/components/dashboard/AutoAskTab.tsx`: report failed job-done ask scheduling.
- `src/lib/proCheckoutIntent.ts`: observe held-checkout failure without changing requests or fallback.
- `src/components/billing/ProCheckoutCard.tsx`: observe checkout failure without changing its flow.
- `src/components/ErrorBoundary.tsx`: report caught render crashes without changing fallback.
- `src/components/admin/FailuresPanel.tsx`: latest-100 private list and refresh control.
- `src/pages/SuperAdminCRM.tsx`: admin-only Failures tab and alert-link selection.
- `drizzle/migrations/0032_failure_alerts.sql`: reversible private records, guarded RPCs, queue reservations, admin list and retention trigger; rollback SQL in comment.
- `drizzle/migrations/meta/_journal.json`: tool-generated migration registration.
- `drizzle/migrations/meta/0032_snapshot.json`: tool-generated migration snapshot.
- `src/integrations/supabase/types.ts`: tool-generated types for the applied schema.
- `src/test/failure-alerts-sql.test.ts`: isolated PostgreSQL alert/access/retention regressions.
- `src/test/report-failure.test.ts`: non-throwing, demo, test-mode and privacy regressions.
- `src/test/image-upload.test.ts`: upload failure call-site assertions.
- `src/test/failure-referral-component.test.tsx`: referral failure and preserved form regression.
- `docs/incident-runbook.md`: triggers, limits, investigation and rollback instructions.
- `docs/failure-alerts-2026-11-16.md`: this changelog and remaining limitations.
- `AGENTS.md`: reuse/privacy architecture rule.
- `roadmap.md`: preserved existing work and recorded this task's completed items and blockers.