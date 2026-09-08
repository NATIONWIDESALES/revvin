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

1. Redeploy the previous edge function versions.
2. Restore the previous `fn_submit_public_referral` and re-create the old
   `leads` insert policy only if the previous frontend is also restored.
3. `fn_get_business_roi` can be reverted on its own; `leads.closed_at`,
   `referrals.won_at`, `referral_submissions`, `referral_rate_buckets`,
   `notification_jobs` and `stripe_payments` are additive and safe to leave in
   place. Leaving them avoids losing idempotency and notification history.
4. Do not drop `notification_jobs` while jobs are pending: undelivered owner
   emails live there.

## Verification status (read this before claiming anything is proven)

- The SQL in this folder has **not been executed**. There is no isolated
  database available here, so the tests in `src/test/` model the intended
  behaviour of the SQL against mocks. They do not prove SQL behaviour. The
  matrix that still needs a real run: same-request replay, mismatched payload,
  another person submitting the same prospect contact, owner/other-owner/anon
  ROI authorization, Free and canceled versus disabled eligibility for both read
  and submit, all-time versus dated revenue with unknown close dates, an
  unrelated note edit keeping the close month, notification retry after a
  provider failure, and a concurrent invoice replay.
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
