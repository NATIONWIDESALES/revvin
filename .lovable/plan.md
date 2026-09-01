# Complete reactivation campaigns

## Goal
Finish the campaign email pipeline and reconcile all customer-facing copy with the shipped reactivation campaign behavior, without changing the database.

## Implementation
- Align the server/shared and browser segment helpers with the deployed `fn_contact_segments()` keys and semantics, including the `unknown` bucket.
- Update the campaign queue consumer to process `campaign_emails` only after auth and transactional queues, while preserving existing retry, DLQ, TTL, cooldown, and priority behavior. Update `campaign_sends` and campaign counters for success, failure, suppression, expiry, and duplicate paths.
- Make campaign email rendering consistent and compliant: preserve per-recipient idempotency, business reply-to/from name, complete business address, and unsubscribe handling. Ensure unsubscribe also marks the source contact opted out when present.
- Correct dashboard gating and readiness behavior so Campaigns is a Pro feature, readiness is collected before composition, and sending does not rely on stale client counts.
- Fix customer import/date editing edge cases and copy, including date parsing and preserving real unknown dates.
- Update industries, guides, pricing, and `llms.txt` so referral asks remain device-native while reactivation campaigns are sent by Revvin from the business name with replies to the business.

## Verification
Run the project typecheck and `bun run test`; review the diff to ensure no migrations or unrelated database changes were added.