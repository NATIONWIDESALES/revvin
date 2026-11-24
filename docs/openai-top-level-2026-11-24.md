# OpenAI top-level attribution and registration correction

November 24, 2026. Follow-up to `91b4e9bf`. Not published. No accounts created, backend deployments, billing changes, permission changes or migrations.

## Required vendor setting

OpenAI's public configuration for this pixel currently returns `automatic_advanced_matching_enabled: true` (HTTP 200 with cross-origin access allowed). The official documentation says this feature automatically detects and hashes customer fields from the website. Omitting a `user` object does not disable it.

Because customer data is not authorized, the top-level loader first requires this configuration to explicitly return false. Enabled, unknown, failed or malformed configurations fail closed before the SDK loads. OpenAI's documented initialization API provides no matching-disable option. The account owner must turn off Automatic advanced matching for this pixel in OpenAI Ads Manager before real SDK loading is enabled. No vendor-account settings were changed here.

## Changelog

- `src/lib/openAiAds.ts`: top-level vendor bootstrap, explicit consent grant after eligibility, one init per document, immediate `consent(false)` on withdrawal, late-queue denial, and exact typed `registration_completed` transport. Payloads are rebuilt from the fixed customer-action type and validated deterministic event ID; no `user` object or other customer fields are passed. Duplicate IDs are suppressed. Matching-configuration preflight enforces the no-customer-data requirement.
- `src/components/OpenAiPixel.tsx`: existing regional/refusal/GPC/DNT/bot/demo/signed-in/private-route boundary, delayed activation and eligible marketing/signup routes. The latest account and route state is rechecked for events. New loads and events remain blocked while account state is unresolved; a transient anonymous session check does not treat that as withdrawal and delete a previously captured click cookie. Actual signed-in/private/demo/opt-out transitions revoke immediately. No SPA re-init or blocked-event replay.
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