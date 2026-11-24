# OpenAI top-level attribution and registration correction

November 24, 2026. Follow-up to `91b4e9bf`. Not published. No accounts created, backend deployments, billing changes, permission changes or migrations.

## Required vendor setting

OpenAI's public configuration for this pixel currently returns `automatic_advanced_matching_enabled: true` (HTTP 200 with cross-origin access allowed). The official documentation says this feature automatically detects and hashes customer fields from the website. Omitting a `user` object does not disable it.

Because customer data is not authorized, the top-level loader first requires this configuration to explicitly return false. Enabled, unknown, failed or malformed configurations fail closed before the SDK loads. OpenAI's documented initialization API provides no matching-disable option. The account owner must turn off Automatic advanced matching for this pixel in OpenAI Ads Manager before real SDK loading is enabled. No vendor-account settings were changed here.

## Changelog

- `src/lib/openAiAds.ts`: top-level vendor bootstrap, explicit consent grant after eligibility, one init per document, immediate `consent(false)` on withdrawal, late-queue denial, and exact typed `registration_completed` transport. Payloads are rebuilt from the fixed customer-action type and validated deterministic event ID; no `user` object or other customer fields are passed. Duplicate IDs are suppressed. Matching-configuration preflight enforces the no-customer-data requirement.
- `src/components/OpenAiPixel.tsx`: existing regional/refusal/GPC/DNT/bot/demo/signed-in/private-route boundary, delayed activation and eligible marketing/signup routes. The latest account and route state is rechecked for events. New loads and ordinary sends remain blocked while account state is unresolved or signed in, and on excluded routes. These transitions pause sends without deleting click attribution. Demo/bot exclusions and real opt-outs still revoke immediately. No SPA re-init or blocked-event replay.
- `src/lib/metaPixelLoader.ts`, `public/ad-events.html`: remove the OpenAI frame/receiver; retain Meta's fixed-event bridge, source/origin guards and delivery behavior.
- `src/lib/metaPermission.ts`: admit `oppref` as a campaign key without capturing or forwarding its value to Meta. Unknown/private query fields remain blocked.
- `src/components/signup/SignupForm.tsx`: at the existing home-service-qualified Meta registration point, call the reserved helper with `registration_completed`, `{ type: "customer_action" }`, and the same `reg_<uuid>` event ID. Non-home-service signups do not call it.
- `src/config/brand.ts`: retain the existing pixel ID and single `debug: true` flag; update the obsolete init-only comment.
- `src/content/legal.ts`, `public/llms.txt`: update OpenAI-only wording for home-service signup completion, page/browser/ad-attribution information, its `__oppref` 30-day and `__obref` 365-day first-party cookies, disabled customer matching, and vendor cookie removal after opt-out. Meta's existing measurement/account-creation wording is unchanged. The Privacy page and generated full text already reuse this shared notice.
- `src/test/openai-pixel.test.tsx`, `src/test/openai-legal.test.ts`, `src/test/signup-trade.test.tsx`: top-level eligibility, one init, matching safety, opt-out races, vendor denial, private/signed-in/demo exclusions, qualified and refused signup behavior, deterministic ID/deduplication, sanitized payloads, preserved URL parameter and legal parity.
- `roadmap.md`: completion evidence and the outstanding external matching-setting requirement.

## URL and cookie handling

`cleanPreviewAddress` removes only validated personal preview fields, leaving `oppref` intact before and after OpenAI initialization. `captureFirstTouch`, preview acquisition and existing attribution capture use fixed whitelists that do not store `oppref`. No application storage for this value was added. The SDK owns its capture and cookies. The parameter is not removed from the address bar by this integration.

The existing static CSP has no script, connection or image source restrictions, so the documented SDK/config/event/image endpoints are already permitted. No CSP/head change was needed.

## Verification

- 351 tests passed across 12 related suites: OpenAI pixel/legal, signup trade, Meta pixel/delivery/CAPI, first touch, acquisition, public facts, sitemap/robots, analytics routing and prerendered HTML. Preview diagnostics reported `build OK`.
- Signed-out Playwright executed the actual downloaded SDK, with a simulated disabled-matching configuration and intercepted provider transport. No account-creation request was made.
- An allowed landing URL retained `oppref`, loaded one top-level SDK, and received vendor `__oppref` and `__obref` cookies with observed 30-day and 365-day expiry periods. Marketing-to-signup SPA navigation retained one SDK/init and did not discard attribution during the anonymous session check.
- A signed-out helper invocation produced exactly one registration request with the specified event ID; a duplicate returned false. Provider payloads contained no customer `user` data. This is a synthetic helper check, not a real signup.
- The existing Privacy opt-out button invoked vendor denial, removed both vendor cookies, and blocked subsequent measurement. The updated disclosure screenshot was reviewed.
- Refusal, GPC, DNT, bot, referral/private/admin/demo/preview/partner paths and enabled automatic matching made no SDK request.
- Unit signup tests used isolated mocked account-creation responses to verify the exact successful qualified-signup point, non-home-service exclusion, and refusal. No test users or real account records were created.

## Remaining limits

Real loading remains deliberately blocked by the vendor's currently enabled automatic-matching setting. Disable it before publication and keep it disabled. Tests do not establish OpenAI provider receipt, attributed conversion counting, or a live successful signup. Publication remains with Claude after review.

## Signup auth race follow-up to 27ce055e

Rule: signing in must not erase an allowed signup's ad attribution; a real opt-out must still stop that signup event and all later sends.

### Changelog

- `src/lib/openAiAds.ts`: separate current send eligibility from live advertising permission. Capture initialized/granted signup eligibility in a one-use, in-memory snapshot, bound to the current document state and consent version. Consume it for the single registration event even after auth/private navigation pauses ordinary sends. Recheck live refusal, GPC/DNT, region and audience exclusions; withdrawal invalidates existing snapshots. Preserve deterministic-ID deduplication and the exact no-user-data payload.
- `src/components/OpenAiPixel.tsx`: sign-in, pending auth and excluded navigation pause sends without vendor denial. Stored refusal, the Privacy opt-out, GPC/DNT and disallowed region still withdraw. Existing bot/demo behavior is retained. Cleanup pauses instead of treating unmount as opt-out.
- `src/components/signup/SignupForm.tsx`: capture eligibility immediately before the account request while still on eligible signed-out signup, then use it at the existing home-service-qualified Meta registration point. No snapshot means no OpenAI event; no new events or signup paths added.
- `src/test/openai-pixel.test.tsx`: reproduce init on signup, then auth flip and private navigation before the helper; assert one queued measure, no consent(false), no later signed-in measures and no snapshot reuse. Cover real refusal before submission and live refusal/GPC/DNT overriding an earlier snapshot.
- `src/test/signup-trade.test.tsx`: render the real pixel boundary with SignupForm and explicitly publish signed-in auth before the deferred account response resolves; assert one successful registration and no withdrawal. Retain non-home-service and pre-submit opt-out regressions.
- `roadmap.md`: record this scoped fix and verification.

### Checked paths

- Global `App` pixel mounting and `AuthContext` urgent SIGNED_IN update: read. One mounted boundary serves marketing, signup and private navigation; auth behavior is unchanged.
- `/signup` (`Signup`) and embedded invite signup (`InviteLanding`): read. Both reuse SignupForm. Only the already-eligible `/signup` can capture OpenAI permission; invite pages remain excluded.
- Marketing/signup loading, signed-in/private/referral navigation, bot/demo sessions, regional permission, GPC/DNT and storage/custom withdrawal listeners (`OpenAiPixel`, `metaPermission`, `openAiAds`): read and covered by related tests. No SDK re-init or new route coverage.
- Privacy opt-out (`Privacy`): read. It persists refusal and dispatches the existing advertising-choice event; vendor cookie deletion still occurs.
- OpenAI vendor calls and conversion entry points: repository-wide search found only `openAiAds` and the single SignupForm caller, with no OpenAI background job, edge function, database function or advertising-frame sender to change. Meta implementation is unchanged and its regression suites passed.

### Verification

- 222 tests passed across nine related OpenAI, signup and Meta suites; preview diagnostics reported build OK.
- Playwright exercised the actual downloaded OpenAI SDK with disabled-matching configuration and intercepted all provider/backend transport. A simulated session triggered the real AuthContext update before the delayed signup response resolved. Before success, ordinary sends were already paused. After success, exactly one registration request was observed, both attribution cookies remained, no consent(false) was called, and later signed-in sends returned false. Final path was `/welcome`, with no page errors.
- A fresh browser repeated the form with a real stored refusal before submission: consent(false), zero measure calls, no later signed-in sends, final `/welcome`, no page errors. Screenshots confirmed the real form remained submitting during the auth-first interval.
- No test users, live account requests, customer records, provider telemetry, Stripe operations, RLS changes, migrations, backend deployments or publishing. The browser used a synthetic local session and intercepted responses, so real signup receipt and attributed conversion counting remain unverified. The existing automatic-matching safety preflight remains unchanged; vendor account settings were not inspected or changed in this follow-up.