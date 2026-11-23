# Slug validation and trustworthy alerts

## Changes and rollout

- Applied migrations 0037 and 0038, replacing only `fn_slug_rejection`, `fn_smoke_customer_journey`, and `fn_report_failure`. No table, access-policy, grant, or manual customer-data changes.
- Brand variants retain flattened substring protection. `revin` and `rewin` use whole segments. Phishing words match normalized segments, rejecting standalone terms and combinations of two blocked segments.
- Random `partner-` suggestions are validated and regenerated when rejected.
- Failure reports retain existing ownership checks, rate limits, logging, queue delivery, and throttles. Bot reports and first automatic-recovery notices are recorded without email. A second correlated failure within 60 seconds is eligible for the existing throttle.
- The bounded existing build field carries a session-only random identifier and a referrer-present boolean, never a referrer URL. Client publication is required for anonymous same-session correlation. Legacy first-recovery notices are suppressed without combining unrelated visitors.
- Failure emails identify a real visitor and include the business and owner email when known. Smoke, HTTP, and monitor alerts and recovery notices carry the automated-test subject tag and first line.
- The hourly journey's existing privileged scheduled caller immediately reruns a failed journey once. Every original journey step and rollback remains intact. Separate result timestamps prevent a successful retry from being hidden by the initial failed result. The monitor confirms two immediate failed runs before emailing a journey failure; missing-run warnings retain their separate automated-test meaning.
- Deployed only `security-monitor`, source SHA-256 `bf3c68901b8d8d9363ca13e2c55c0a6ae40cfe1fbf2907e96c4a80f77f6bdc8b`. Frontend not published.

## Verification

- Full Vitest run: 1477 passed, 3 skipped, one existing permissions test exceeded its five-second timeout. Both tests in that file passed in an isolated rerun with a longer timeout.
- SQL/client table-driven parity tests cover all supplied examples, brand variants, phishing combinations, leet forms, profanity and format rules. Ten thousand generated smoke candidates passed the current SQL validator.
- Isolated PostgreSQL tests exercised the actual bounded smoke failure retry: exactly two run records, simulated signup rows rolled back, retry guard reset.
- Alert tests verify logging without email for first recovery and bots, second-failure email eligibility, cross-session isolation, the 60-second boundary, ownership checks, and unchanged private-table access.
- Monitoring function Deno check and preview build passed.
- Live read-only validation accepts every supplied legitimate contractor example and rejects the supplied phishing combinations. The automatic 15:17 UTC journey passed signup, onboarding, publishing, public page access, referral submission, lead work, import, plan, unpublish, and guardrails after the suffix replacement.
- No manual live signup, onboarding save, referral submission, alert email, or inbox-receipt check was performed. The next naturally failing scheduled journey is needed to observe the deployed retry on live data.

## Additional findings

- The preexisting SQL normalization mapped `8` differently and did not normalize `9` like the client. The replacement rejection function now uses the client's leet mapping locally, without modifying the unauthorized normalization helper.
- The HTTP monitoring role cannot insert Auth users or switch into the real customer roles. A direct HTTP retry would generate a permission failure rather than test a customer journey. Keeping retry execution inside the existing privileged SQL runner avoids extra functions or weakened permissions.
- No additional signup, onboarding, publish, or referral blocker was established in the reviewed paths. Inbox delivery remains unverified.

## File changelog

- `src/lib/slugRules.ts`: segment-aware checks and validated fallback.
- `src/lib/reportFailure.ts`: bounded session/referrer context for correlation.
- `supabase/functions/security-monitor/index.ts`: confirmed smoke failure checks and affected-audience labels.
- `supabase/functions/security-monitor/smoke-confirmation.ts`: confirmation predicate.
- `drizzle/migrations/0037_slug_rules_and_trustworthy_failure_alerts.sql`: the three authorized replacements.
- `drizzle/migrations/0038_confirm_hourly_smoke_failure.sql`: bounded retry in the authorized smoke function.
- Migration snapshots and journal: generated migration bookkeeping.
- `src/test/slug-rules.test.ts`, `src/test/slug-rules-sql.test.ts`: contractor, phishing, fallback, parity, and smoke suffix regressions.
- `src/test/report-failure.test.ts`, `src/test/failure-alerts-sql.test.ts`: session context and alert filtering regressions.
- `src/test/security-monitor-smoke.test.ts`: confirmation and real SQL failure-retry tests.
- `src/test/sql-email-payloads.test.ts`: include the now-replaced failure writer in the existing delivery contract check.
- `AGENTS.md`, monitoring `AGENTS.md`, `roadmap.md`: implementation conventions and verification status.