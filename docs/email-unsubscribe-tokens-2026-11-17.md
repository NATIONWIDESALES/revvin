# Transactional email unsubscribe tokens (2026-11-17)

## Cause
SQL writers (prospect_first_view, prospect_claimed, earn_link) queued transactional
emails without `unsubscribe_token`, so the email API returned 400 missing_unsubscribe.
Retries reused the same idempotency key and got 409 "already failed" until DLQ.
The Nov 16 failure_alert 400 was `missing_parameter: html`, fixed on Nov 16 (queue-body.ts).

## Fix
- `public.enqueue_email` (migration 0034) adds the recipient's token (via new service-only
  `public.fn_email_unsubscribe_token`, reusing email_unsubscribe_tokens) plus message_id and
  idempotency_key when missing, for every transactional payload.
- process-email-queue mints a token for any transactional payload still missing one,
  requeues 409 "already failed" with a new idempotency key (same message_id, so the
  5-attempt budget still applies), and moves permanent 400s to DLQ after one attempt.
- `_shared/email-unsubscribe.ts` is the edge helper; `sendTemplateEmail` now uses it.
- Earn: if the link email cannot be queued (for example a suppressed address), a newly
  created referrer sees the link on screen; an existing referrer gets a clear message.
- Failure alerts are always stored in app_failures first, so a DLQ alert is still visible
  in the super admin Failures list.
- Old failed/dlq rows were not resent.

## Live proof (email_send_log)
- 2026-11-17 17:45:55 UTC failure_alert to info@revvin.co, status sent, message_id bb643cae-3973-4083-bf6c-7c1151f7d2d0
- 2026-11-17 17:45:56 UTC prospect_first_view to info@revvin.co, status sent, message_id d51d7299-1b44-40e9-b7db-cbd7dd2646ff
  (queued without a token through enqueue_email with the real payload shape; the token was added automatically)

## Changelog
- drizzle/migrations/0033_pin_email_queue_search_path.sql (earlier today, security fix)
- drizzle/migrations/0034_transactional_unsubscribe_tokens.sql (rollback in header)
- supabase/functions/_shared/email-unsubscribe.ts (new)
- supabase/functions/process-email-queue/queue-retry.ts (new), index.ts (deployed)
- supabase/functions/_shared/transactional-email-templates/send-email.ts
- src/lib/earn.ts (email_unavailable message)
- src/test/email-unsubscribe-tokens.test.ts (new)

## Not verified live
- page claimed alert: same enqueue path, covered by isolated PostgreSQL tests only.
- Earn email to a real signed-out visitor inbox.
