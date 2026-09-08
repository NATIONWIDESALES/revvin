# Pending database changes

Preview and production share one database, so nothing in this folder is applied
by the agent. Review the SQL, then apply it in the order below.

**A user-facing release must not be described as ready while this SQL is
unapplied.** Until it runs, guest referral submission fails (the RPC signature
changed), the scoreboard reports through the old ROI function, and the
notification worker has no queue to drain.

## Files

- `20260908_release_1.sql` — release 1. Replaces the earlier unsafe draft.

## Deployment order

1. **Apply `20260908_release_1.sql`.** It is one transaction (plus one optional,
   commented-out cron block at the end) and is written to be re-runnable.
2. **Deploy the edge functions**, after the SQL, in any order:
   - `notify-new-lead` (now a service-role-only worker over `notification_jobs`)
   - `stripe-business-webhook` (writes `stripe_payments`)
   - `check-subscription` (new typed response)
   - `monthly-roi-recap` (aggregates through `fn_get_business_roi`)
   - `process-email-queue` is unchanged by this release.
3. **Ship the frontend.** The client sends `p_request_id` to the submit RPC, so
   it must go out after step 1.
4. **Schedule the notification drain.** Either uncomment the cron block at the
   end of the SQL file (fill in the project host and confirm the vault secret
   name) or point the existing operator cron at `notify-new-lead` with a
   service-role token and `{"drain":true}`. Jobs are durable either way: nothing
   is lost while the schedule is missing, delivery is simply delayed.

## Rollback

Rollback preserves every lead and every receipt. Nothing in this release deletes
or rewrites lead data.

1. Pause the notification schedule before changing worker versions. A worker
   rollback must remain compatible with the claim-token completion contract.
2. Keep corrected guest/reporting access controls. Never restore contact-based
   receipt lookup, public lead reads, anonymous ROI or the paid-only Free-page
   gate. If a rolled-back client cannot use the safe submission contract, show
   a clear temporary unavailable state until a compatible client is restored.
3. Any reporting rollback must retain NULL-safe authorization; `leads.closed_at`,
   `referrals.won_at`, `referral_submissions`, `referral_rate_buckets`,
   `notification_jobs` and `stripe_payments` are additive and safe to leave in
   place. Leaving them avoids losing idempotency and notification history.
4. Do not drop `notification_jobs` while jobs are pending or restore the old
   unauthenticated browser-triggered sender. Undelivered emails and retry history
   remain in the queue.

## Verification status (read this before claiming anything is proven)

- This SQL has **not been applied to Lovable Cloud**. The separate
  `Research/backend-regression` harness executes the exact candidate in an
  in-memory PostgreSQL engine using a focused synthetic schema. It passes 38
  SQL checks covering role/tenant privacy, Free/canceled eligibility, request
  replay, historical totals, notification leases and invoice ordering. This does
  not prove every production trigger, overlapping transactions or provider
  integration. Those require an isolated integration environment. Client,
  rendering and modeled tests in `src/test/` remain separate evidence.
- Edge functions are type-checked individually. Pre-existing gap: several
  unrelated functions in this project do not pass `deno check` today, so the
  check is scoped to the functions this release touches.
- Meta Purchase forwarding is **not implemented**. Paid conversions are reported
  from the first-party `stripe_payments` record only.
- Hosting-level 404 for unknown routes is a separate, still-open item.

## Deployment-only items (not verifiable here)

- **Pending SQL is unapplied.** Guest receipt privacy, the Free/canceled
  referral-page read rule, ROI authorisation and close-date attribution, the
  durable owner-notification job, the server-only payment record, and the
  funnel event policy all live in the pending migration. Local tests do not
  prove any of that SQL behaviour.
- **`fn_suppressed_emails_for_business`** ships with the pending SQL. Until it
  is applied, the Customers tab reports the global bounce/complaint list as
  unchecked and says so in the UI; per-business suppression already works.
- **Edge functions are not deployed** in this pass, including the rewritten
  `notify-new-lead` worker and its scheduler.
- **HTTP 404 status.** The build now writes `dist/404.html`, a real noindex
  not-found document. Serving it with a 404 status for unknown paths is hosting
  configuration and is NOT done: today unknown paths still get the SPA fallback
  with a 200 status and a client-side noindex tag. Dynamic routes (`/r/*`,
  `/i/*`, `/guides/*`, `/dashboard`) must keep receiving the SPA fallback.
- **Live billing, real message delivery and Meta purchase forwarding** remain
  unverified. Meta purchase forwarding is not implemented.

## Notification scheduler (prepared, unapplied)

Read-only inspection of the current scheduler, taken from `cron.job` and
`vault.secrets` (names only; no secret value is reproduced here):

| job | schedule | active |
| --- | --- | --- |
| monthly-roi-recap | `0 14 1 * *` | yes |
| process-referral-triggers | `*/15 * * * *` | yes |
| nudge-stale-leads | `*/15 * * * *` | yes |
| process-campaign-sends | `*/5 * * * *` | yes |
| dispatch-webhooks | `* * * * *` | yes |

There is **no** job for the notification worker, so once the browser stops
invoking `notify-new-lead` (this release), queued owner emails would sit
undelivered until a schedule exists. `db/pending/20260908_release_2_notification_schedule.sql`
adds `drain-notification-jobs` every two minutes.

Credential facts observed: the existing jobs authenticate with an inline
`x-cron-secret` header, which is the pattern `_shared/cron-auth.ts` expects. The
vault holds exactly one entry, `email_queue_service_role_key`, used by the email
queue dispatcher. The new file therefore follows the `x-cron-secret` pattern and
requires the operator to substitute the existing shared secret before running
it; the value is deliberately not stored in this repository.

Deployment order for this piece: apply `20260908_release_1.sql`, deploy
`notify-new-lead`, confirm one manual authenticated invocation drains cleanly,
then apply the schedule file. Rollback is
`SELECT cron.unschedule('drain-notification-jobs');`, which stops attempts
without discarding queued jobs.
