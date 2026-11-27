# Google Ads tag changelog

## Files touched
- `src/config/brand.ts`: supplied GTM-TX7W9QD3 and the AW-18599386401 destination read from that container.
- `src/lib/googleAds.ts`: once-per-document tag loading, cleaned page-view queue, preserved landing gclid/gbraid/wbraid, one-use pre-signup eligibility and per-account signup deduplication. No contact fields or account IDs sent. Enhanced conversions disabled; user-data and personalization consent remain denied. Automatic form/history/other enhanced-measurement events blocked through Google settings.
- `src/components/GoogleAdsTag.tsx`: reuse existing regional exclusions, refusal, GPC, DNT, bot/demo and route boundaries. Immediate withdrawal listeners. Welcome eligibility is tied to the just-created account and its first setup visit, not later setup navigation.
- `src/App.tsx`: mount beside the existing pixels, without an index.html script.
- `src/components/signup/SignupForm.tsx`: Google-only successful new-account handoff beside existing events, including non-home-service trades. Empty identities in existing-account responses do not report creation. No signup validation or auth changes.
- `src/content/legal.ts`, `src/pages/Privacy.tsx`, `public/llms.txt`: shared Google disclosure and existing opt-out coverage. Prerender uses the shared legal source.
- `src/test/google-ads-tag.test.tsx`, `src/test/google-signup-form.test.tsx`: permission, navigation, privacy, deduplication and mocked successful signup tests.
- `roadmap.md` and this changelog: completion and verification limits.

## Tested
- 193 tests passed across Google tag/signup, Meta pixel/delivery, OpenAI pixel/privacy and signup-trade suites.
- Preview build monitor reported build OK; diff whitespace check passed.
- Actual downloaded Google container executed locally with all Google measurement requests intercepted, not delivered. One tag script remained across navigation; cleaned page_view commands queued for home, pricing and signup. Landing click IDs remained intact. Later welcome navigation did not queue a page view. Privacy button cleared queued events and denied consent. No browser page errors observed.
- Synthetic sign_up command was queued with example values and blocked transport. No signup form was submitted, no account created and no live signup performed.

## Not verified
- Google receipt, counted conversions, attribution and production installation. The intercepted container issued an attribution request, but no provider-bound page_view/sign_up request was observed. Application queue checks are not evidence of provider receipt. Claude must review destination routing/container configuration before publishing.
- Real new-account welcome page navigation is covered by mocked tests, not a live signup. Actual provider automatic-collection suppression across all private-page transitions is not established by queue tests. The supplied container enables automatic first-party collection/history settings; app overrides disable enhanced conversions and auto events and keep user-data consent denied. Review those container settings before launch.
- Full repository test suite and production prerender output were not independently rerun. Shared legal/prerender/llms parity tests passed.

No publishing, database migrations, edge-function changes, Stripe/billing changes, auth changes, or changes to Meta/OpenAI behavior.