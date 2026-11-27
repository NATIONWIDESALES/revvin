# Static Google tag installation changelog

## Files touched
- `index.html`: denied-consent bootstrap immediately after head opens, followed by the single GTM-TX7W9QD3 script. Preserved automatic form/history/other event suppression before the file loads.
- `src/lib/googleAds.ts`: removed dynamic tag injection and duplicate bootstrap commands. Requires the existing static script before permitted initialization. Existing regional, route, signup, welcome and withdrawal rules remain unchanged; withdrawal also explicitly denies analytics storage.
- `src/content/legal.ts` and `public/llms.txt`: disclose the every-page file request separately from permission-gated events. `Privacy.tsx`, prerender and generated llms-full consume the shared notice without additional edits.
- `src/test/google-ads-tag.test.tsx`: static bootstrap fixtures, no fallback injection, denied defaults, allowed-only config/events, public/private prerender retention and legal parity assertions.
- `roadmap.md` and this changelog: verification record.

## Tested
- All 255 tests across the 10 requested Google, Meta, OpenAI, signup-trade, prerendered-html and legal suites passed.
- Preview build monitor reports build OK; whitespace diff check passed.
- Browser with a stubbed Google file: denied defaults existed before the container executed, exactly one tag loaded with stored refusal and with allowed US permission, refused visitors queued no config/events, allowed visitors queued page_view, and the existing advertising-choice event immediately cleared queued measurements and denied consent.
- No account creation, live signup or Google measurement transmission.

## Not verified
- Google installation checker on revvin.co, provider receipt, conversions or attribution. Production remains unchanged until Claude publishes.
- Actual remote GTM behavior, including denied-mode vendor requests and automatic-collection suppression. Browser checks used a stub and intercepted transport, not the real container.
- Privacy opt-out button click was not browser-verified this turn; withdrawal used its existing advertising-choice event. Real signup was not performed. Production build artifacts were not independently generated; tests exercised the real prerender functions and source template.

No publication, Stripe/billing, database, RLS, migration, function, auth, Meta/OpenAI behavior or signup form changes.