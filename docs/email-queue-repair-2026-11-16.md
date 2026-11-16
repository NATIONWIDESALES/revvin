# Email queue repair, November 16, 2026

## Diagnosis

- The live dispatcher sent its Vault service credential as Bearer without the old `x-cron-secret` header described in the runbook. The worker used `checkCronAuth`, which requires an exact match to its runtime service credential or cron secret. Function configuration retained `verify_jwt = true`.
- The canonical managed service credential succeeded against the database API and Auth admin endpoint but received the worker's own `401 {"error":"Unauthorized"}` response, not a gateway JWT rejection. Rebinding the managed credential and redeploying the unchanged worker did not resolve it.
- Refreshed the queue credential with the supported email infrastructure setup tool. It also regenerated the default worker locally; those default changes were discarded before deployment so campaign handling, suppression, pause switches, retry accounting and existing sender behavior stayed intact.
- Exact credential matching was incompatible with the managed request/runtime credential path. The repair preserves exact-match cron/service authorization, then validates alternate Bearer credentials with this project's Auth admin endpoint. It never trusts a decoded role claim, never reads the returned user list, rejects redirects, times out after five seconds and fails closed.
- After authorization recovered, the provider returned 400 for the alert's missing `html` parameter. The queued alert contained plain `text` only, as does the failure-alert SQL writer. The same worker now supplies escaped HTML for text-only messages, preserving existing HTML unchanged. No queue payload was altered or manually resent.

No credential values or credential-derived hashes were output, logged or committed.

## Live verification

- At 16:42:39.765903 UTC, `net._http_response` recorded HTTP 200 with `{"processed":1}` for the queue worker.
- At 16:42:40.705720 UTC, `email_send_log` recorded label `failure_alert`, status `sent`, with the expected `info@revvin.co` destination confirmed by a boolean-only query.
- The queued failure alert left `pgmq.q_transactional_emails`: remaining count 0. It was not moved to the transactional DLQ.
- From 16:40:33 UTC through the final dispatch read-back, 26 queue-worker responses were 200 and none were 401. The queue subsequently became idle.
- The canonical credential passed live Auth admin verification; invalid credentials were rejected. No secret comparison output was exposed.

`sent` establishes successful provider acceptance through the existing worker, not a human-observed inbox receipt. Inbox placement and recipient opening remain unverified.

## Last 14 days: unsent audit

Checked all three active queues, their archives, all three DLQs and their archives, and distinct message IDs in `email_send_log`, excluding IDs with any successful send.

- Confirmed queued and never sent: **1**, label **prospect_first_view**, in the transactional DLQ. Reason category: exhausted retry budget. It remains untouched; no automatic resend was attempted.
- Auth DLQ: **0**. Campaign DLQ: **0**. Other queued or archived unsent messages: **0**.
- Expiry handling moves messages to DLQ and records `dlq`, rather than silently deleting them. Expired unsent messages in the 14-day log: **0**. Auth TTL defaults to 15 minutes, transactional to 60 minutes, campaigns to 24 hours.
- Additional unsuccessful log-only message: **1**, label **referrer-reward-owed**, absent from all queues and DLQs and without a matching successful message ID. Its writer uses the existing direct gateway path, not this queue, so this is not evidence of a lost queued message; whether a later different-ID attempt delivered the same notification is unverified.
- The latest pre-incident successful email log was at 16:07:05.980697 UTC on November 16. Empty queue archives do not prove non-delivery: successful messages are deleted by the worker. Email-log retention is 180 days, outside this audit window.

## Changelog

Files changed:

- `supabase/functions/process-email-queue/index.ts`: authorization helper and text-only HTML fallback only.
- `supabase/functions/process-email-queue/queue-auth.ts`: project-server-verified service authorization with bounded timeout and fail-closed behavior.
- `supabase/functions/process-email-queue/queue-body.ts`: escaped HTML fallback for plain-text payloads.
- `src/test/email-queue-auth.test.ts`: six authorization tests covering exact credentials, alternate service verification, forged/user rejection, missing credentials and network failure.
- `src/test/email-queue-body.test.ts`: two plain-text delivery tests covering escaping and unchanged existing HTML.
- `docs/incident-runbook.md`: one diagnostic line for repeated queue-worker 401s.
- `AGENTS.md`: service-verification rule.
- `roadmap.md`: completed queue repair and clarified remaining inbox/admin verification.
- `docs/email-queue-repair-2026-11-16.md`: this changelog and live evidence.

Deployment: only `process-email-queue` redeployed. The existing `verify_jwt = true` setting was unchanged. The supported setup tool refreshed managed queue infrastructure/credential; no new numbered migration was authored, no Stripe change or manual RLS change was made, and the frontend was not published.

Validation: 21 targeted tests passed; full Vitest suite **996 passed, 3 skipped**; Deno checks passed for both new helpers; current preview build reports **build OK**.

Rollback: revert the two worker helper integrations and remove their helper files, then redeploy only this worker. That restores the former exact-match behavior and text-only delivery limitation, and may recreate this incident. No policy rollback is required.

Not verified: actual inbox placement, live authenticated admin Failures screen, a full live send for every email label, and the ultimate outcome of the log-only reward notification. No dead letters were replayed.