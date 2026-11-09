# Sales-path incident verification and fixes

## Root causes and timing

- First view: the dead-lettered payload is for `Test Peak Roofing`, addressed to the team inbox. It has `purpose=transactional` but no idempotency key, and an epoch-number `queued_at`. It came from the original 0017 function. The logged provider error is explained by the missing key, not by missing purpose. Migration 0021, applied November 6 at 00:12:22 UTC, already repaired both first-view recipients with UTC ISO timestamps and prospect/day keys.
- Claim and Earn: migration 0023, applied November 6 at 00:22:57 UTC, already repaired their timestamps and keys. Claim keys are prospect/type plus a caller suffix. They intentionally omit the day because a prospect can be claimed only once. Earn keys are referrer/day. Current live definitions match those migrations. No current SQL writer with the same defect was found.
- Publishing: the November 5 attempts preceded migration 0020, applied November 6 at 00:02:33 UTC. The old privileged-update trigger rejects the publication change even when the owner session and saved fields are present. The isolated test reproduces its exact guard exception. The current 0020 owner-toggle exception passes on the first attempt with RLS and trial/verification/status guards active. Five latest live hourly smoke runs also pass.
- Old events contain no reason, so their exact exception cannot be retroactively recovered. Trigger reproduction and deployment timing explain the reported pattern. There is no evidence of a current trial-guard rejection or a save-before-publish race: the existing onboarding already awaited the save. Its remaining weakness was accepting an error-free zero-row update as success.

## Changes

- `src/lib/publishFailure.ts`: fixed reason-code classifier and exact allowlist of safe server messages. No arbitrary server text is displayed or measured.
- `src/lib/publishPage.ts`: emits reason on failed RPC/exception and preserves exact known safe server wording.
- `src/lib/analyticsPrivacy.ts`: accepts only the fixed reason values on product `publish_failed` events. Existing narrow capture RPC admits the event and preserves meta; no policy or function change needed.
- `src/pages/Onboarding.tsx`: waits for auth readiness; prevents overlapping submits; awaits owner update with required-field readback; refuses zero-row or incomplete saves; classifies save exceptions before RPC.
- `src/test/helpers/migrationFunctions.ts`: latest-function resolver across archived and numbered migrations.
- `src/test/helpers/derivePlanFixture.sql`: unchanged live plan derivation copied into the isolated fixture because that definition is absent from migration history.
- `src/test/sales-publish-sql.test.ts`: historical rejection and current real 0020 first-attempt fresh signup/owner update/publish sequence, with protected-field negative checks.
- `src/test/sql-email-payloads.test.ts`: old payload failure, all latest SQL writer contracts, and rollback-only execution of view/team/caller, claim/team/caller and Earn emails. Stable distinct keys and repeat throttling verified.
- `src/test/publish-diagnostics.test.ts`: fixed codes, safe wording, unsafe-error non-disclosure and privacy filtering.
- `src/test/onboarding-one-screen.test.tsx`: updated save return mock; delayed-save ordering and zero-row rejection regressions.
- `AGENTS.md`: documents diagnostic and SQL regression-test boundaries.
- `roadmap.md`: requested tasks and verification status.
- This changelog.

## Verification

- Before frontend changes: 10 diagnostic tests failed; zero-row onboarding regression failed. Historical SQL rejection and missing-key contract reproduced.
- After: 885 tests passed, 3 skipped, 66 test files passed and one skipped. No unhandled errors in full suite. Function checks passed. Latest automatic frontend build/typecheck: build OK.
- SQL payload capture runs in isolated PGlite PostgreSQL; rollback leaves zero captured emails. Rate-limit, Earn eligibility and request-bucket dependencies are fixture substitutes, not tests of those unchanged services.
- Signup test executes actual signup, owner guards, trial and normalization function bodies from migrations; fixture schema and role machinery are isolated. It does not replay the whole historical schema. Slug rejection is substituted; unrelated notification creation/audit triggers are not exercised.
- No live account creation, live email send, database mutation, deletion, migration, edge deployment, pricing, Stripe, rate-limit, guard, RLS or session-storage change occurred. No frontend publication.
- No authenticated real-owner browser publish was performed, to avoid changing a live page. Local UI sequencing is covered through the component tests; actual production delivery of a new alert remains unverified because no alert was sent.

## Dead letter

The single first-view dead letter has a test-named subject, was exhausted after five attempts, and is already outside the active queue. It can be removed without affecting the prospect or active delivery. Leaving it in place is also harmless. It was not deleted or replayed; historical send logs should remain for audit. A test name alone does not independently prove who created it, so confirm it is your test before deleting if that matters operationally.