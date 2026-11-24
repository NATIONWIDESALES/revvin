# OpenAI (ChatGPT Ads) pixel, November 24, 2026

## Scope and status

Installed and tested in the preview, not published. The previously committed mobile dashboard work was not resumed. No accounts were created, and no billing, database, permission, migration or edge-function changes were made.

The existing no-banner advertising choice is reused: known regions outside the EU/EEA, UK and Switzerland are eligible unless the visitor refuses or signals GPC/DNT. Consent and unresolved regions remain excluded. There is no new banner or consent coverage change.

## Changelog

- `src/config/brand.ts`: public OpenAI pixel ID next to Meta; one `OPENAI_PIXEL_DEBUG = true` flag.
- `src/lib/metaPixelLoader.ts`: reuse frame construction; add init-only OpenAI frame with independent immediate withdrawal listeners. The OpenAI frame has an opaque `allow-scripts` sandbox and never receives Meta click identifiers. Its public ID/debug message requires a wildcard target because the recipient has an opaque origin; the receiving document still verifies the parent window and origin.
- `public/ad-events.html`: validated, once-only vendor base setup. Separate documents prevent Meta events from entering OpenAI's document. No OpenAI event command was invented or wired.
- `src/components/OpenAiPixel.tsx`, `src/App.tsx`: delayed activation and regional permission reuse; bot, opt-out, unresolved/signed-in account, demo and private-route exclusions. Only approved marketing paths and clean `/signup` are eligible. A `/sample` visit excludes the remaining document session. Eligible SPA navigation retains one init; withdrawal or private navigation destroys the document and does not replay initialization.
- `src/lib/openAiAds.ts`: typed, currently inert event helper, returning false until the vendor event API is supplied. No application code calls it.
- `src/components/signup/SignupForm.tsx`: TODO beside the qualified home-service Meta signup event. No signup behavior changed.
- `src/content/legal.ts`, `src/pages/Privacy.tsx`: shared Meta/OpenAI disclosure, accurate distinction between existing Meta account-creation sends and OpenAI's init-only status, vendor recipients and request information, blocked OpenAI storage, and the existing opt-out for both partners.
- `plugins/prerender.ts`, `public/llms.txt`: include the shared privacy policy in generated full text and link its init-only disclosure in the short index. No generated sitemap or full-text output was handwritten.
- `src/test/openai-pixel.test.tsx`, `src/test/openai-legal.test.ts`: initialization, consent/region races, GPC/DNT/bot/demo/private exclusions, immediate withdrawal, isolation, no invented event sends, and legal/prerender/full-text parity.
- `roadmap.md`: scoped completion and verification results.

## CSP

The existing `index.html` CSP restricts objects, base URLs and form destinations only. It has no `default-src`, `script-src` or `connect-src`, so both `https://bzrcdn.openai.com` and the SDK's `https://bzr.openai.com/v1/sdk/events` endpoint are already permitted. No CSP or allowlist change was necessary; the static head is unchanged.

## Verification

- Eleven related suites passed, 335 tests total: OpenAI pixel/legal, Meta pixel/delivery/CAPI, signup trade, acquisition rules, public facts, sitemap/robots, analytics routing and prerendered HTML.
- Latest preview diagnostics reported `build OK`.
- Signed-out Playwright checked allowed marketing and signup pages: exactly one SDK request and one `init` with the supplied ID and `debug: true`; no event commands. Marketing-to-signup SPA navigation preserved the init.
- Advertising refusal, GPC, DNT, bot, `/r/acme`, `/dashboard` (redirecting to `/auth`), `/__sa`, `/sample`, `/preview/x` and `/partners` made no OpenAI SDK request.
- The opaque frame could not read the parent page or site storage. The existing Privacy button removed it immediately. Privacy disclosure screenshot was reviewed.
- A separate signed-out check executed the downloaded vendor SDK with its downloaded public configuration. It initialized without uncaught runtime errors. Expected debug diagnostics reported inaccessible sandbox storage. The vendor itself queued SDK initialization/configuration diagnostics; these are not application conversion calls. Its public configuration enables automatic advanced matching, but the empty opaque document contains no form fields and cannot access the parent page or site storage, and we supply no matching identifiers.
- SDK/config responses and provider telemetry were intercepted in the browser checks. No OpenAI provider receipt, attribution, conversion counting or real account-creation flow is claimed. No live signup was performed, as requested.

## Review follow-up

Claude can review and publish the frontend. The vendor's event snippet is still needed before implementing the reserved helper and qualified signup conversion. Debug remains enabled until explicitly requested otherwise.