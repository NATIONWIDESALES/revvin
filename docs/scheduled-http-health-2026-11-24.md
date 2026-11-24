# Scheduled HTTP timeout and alert changes

## Rule

Short-lived DNS timeouts must remain queryable without producing failure and recovery emails. Scheduled HTTP requests need a 15-second timeout when none was explicitly configured; serious or sustained failures must still alert.

## Applied

- One additive, reversible migration: `0039_scheduled_http_timeout_and_health.sql`.
- `email_queue_dispatch()` and `email_queue_wake()`: added explicit `timeout_milliseconds := 15000`, preserving URL, body, params, headers, credentials, existing grants and queue scheduling behavior. Both active definitions were read and verified after the migration.
- New private request-ID wrappers correlate these application callers. No request URL, header or body is copied into the correlation table. Original definitions are retained in a service-only, RLS-locked rollback table.
- `fn_monitor_scheduled_http()` reads the existing response log without modifying it: all completed responses are the denominator, null-status/transport failures are counted, 4xx/5xx are serious, and the last three explicitly correlated completed requests identify a streak. A successful request breaks the streak. Correlation begins at migration time, not retroactively.
- `security-monitor/http-health.ts` replaces the fixed failure-count threshold: at least 20% failures in one hour, any HTTP 4xx/5xx, or three consecutive failures for an explicitly correlated caller.
- HTTP recovery and throttling use only successfully sent alert/recovery history. Failed sends cannot open or close an incident. The recovery subject now says failures are below the threshold rather than claiming every call succeeded.
- `security-monitor` deployed successfully. Customer journey smoke and security rules were left unchanged.

## Blocked work, not completed

Cloud refuses SQL access to cron commands, including an attempted migration that would preserve each original command and change only its timeout. That first attempt applied nothing. The successful migration contains no cron reads or command changes.

**Cron jobs changed: none.** Schedule metadata was read for these jobs, but their command bodies could not be inspected or rewritten:

| Job | ID | Status |
| --- | --- | --- |
| monthly-roi-recap | 17 | Command access blocked, unchanged |
| process-referral-triggers | 21 | Command access blocked, unchanged |
| nudge-stale-leads | 22 | Command access blocked, unchanged |
| process-campaign-sends | 23 | Command access blocked, unchanged |
| dispatch-webhooks | 25 | Command access blocked, unchanged |
| drain-notification-jobs | 68 | Command access blocked, unchanged |
| lifecycle-emails | 78 | Command access blocked, unchanged |
| partner-commissions-mature | 84 | Command access blocked, unchanged |
| data-retention-daily | 105 | Command access blocked, unchanged |
| security-monitor | 106 | Command access blocked, unchanged |
| prospect-expiry-daily | 108 | Command access blocked, unchanged |
| smoke-customer-journey | 112 | Command access blocked; smoke rules unchanged |

The event-driven `process-email-queue` job was not present in the schedule listing; its dispatcher/wake SQL functions were read and updated without changing their scheduling logic.

Consequently, the 20% and 4xx/5xx rules cover all existing response rows, but the three-consecutive rule is available only for the two correlated SQL callers. Direct cron HTTP calls remain uncorrelated. No job identity is guessed from timestamps. Completing the direct-job timeout and correlation changes requires a supported Cloud operation that can read and update existing commands while preserving their authentication.

## Verification

- 53 related tests passed, including actual monitor handler dry runs, exact 20% boundary, low-rate DNS suppression, HTTP errors, three-request streaks, sent-only recovery, timeout argument preservation, rollback and private access.
- Existing smoke, role-change, failure-alert and email-queue suites passed.
- Preview build passed.
- Live service-authorized health RPC returned 115 calls, zero failures, zero serious errors and no correlated streaks. No updated SQL caller had naturally issued a request yet, so its post-change failure rate is not measurable. This is a rolling-hour observation, not evidence that the partial timeout change caused an improvement; the preceding full hour already had zero failures.
- Before the change, completed hours showed 4/115 (3.48%), 6/115 (5.22%), 5/115 (4.35%) and 8/115 (6.96%), all without HTTP 4xx/5xx responses.
- A live monitor dry run returned 401 because the available managed service credential does not match that function's existing cron guard. Authentication was not changed. Live inbox behavior remains unverified; isolated actual-handler tests verify the decision and recovery paths.
- No emails sent manually, test users created, site publication, Stripe changes, customer RLS changes or settled-record edits.

## Rollback

Restore the two original SQL callers with the service-only `fn_rollback_scheduled_http_20261124()` function. It refuses to overwrite definitions edited since this migration. Re-deploy the earlier monitor code separately to restore the old alert decisions. Request and alert history remain untouched.