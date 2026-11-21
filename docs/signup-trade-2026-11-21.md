# Signup trade qualification, November 21, 2026

## Changes
- Required trade selector between business name and personal name, with the 16 requested options in the requested order and the supplied muted note.
- Matching instant previews preselect the corresponding choice. Auto detailing preselects the non-home-service option; unspecified "other" previews require a choice rather than assuming eligibility.
- Signup stores the exact selected label as `signup_trade`. The mapped category travels in the existing `preview_trade` metadata field so the existing business insert trigger seeds category before onboarding. No client update races or migrations. A later existing category is not overwritten.
- Home-service choices retain `signup_completed` with the deterministic `reg_<uuid>` ID and consent-gated CAPI. Non-home-service signups keep internal started/submitted/succeeded events and notification/navigation behavior, but emit no Meta registration or replacement event and do not request CAPI consent identifiers.
- Server eligibility independently requires a recognized home-service `signup_trade` in authenticated user metadata, retaining signup-age and demo gates. Missing/unknown/non-home-service trades fail closed. No trade label is added to a Meta payload.
- Existing advertising permission, withdrawal, event ID deduplication, disabled hashed-email matching and transport are unchanged.

## Verification
- Targeted tests: 73 passed, including actual signup-form to pixel-bridge dispatch, CAPI handoff and shared server payload event ID, excluded trade, missing trade, changed preview choice and all existing preview/category mappings.
- Full suite: 1340 passed, 3 skipped. Server function checks passed; preview typecheck and build passed.
- Isolated PostgreSQL executes the unchanged category insert trigger for all 16 mapped signup choices. No production database writes.
- Playwright at 320, 390 and 1280 pixels verifies required-trade toast, successful simulated email-confirmation signup, metadata, no overflow or page errors, qualified CompleteRegistration requests and no excluded registration requests. Preview landscaping preselection verified. Meta SDK/requests and signup responses were intercepted, not sent to Meta or production Auth.
- Immediate-session signup and CAPI handoff are covered by component tests. Real account creation, live endpoint receipt and Meta receipt/attribution remain unverified. Already reported conversions are not retracted. Self-reported trade is a qualification proxy, not independent business verification.

## Release
Not published. `meta-capi` has not been redeployed: deploy it with the reviewed frontend so the server and form qualification agree. Until frontend publication, live signup behavior remains unchanged. No Stripe, pricing, billing, RLS or migrations changed.

## Changelog
- `src/components/signup/SignupForm.tsx`: trade field, validation, metadata/category handoff and qualified-only conversion calls.
- `src/lib/signupTrade.ts`: preview preselection and category mapping.
- `supabase/functions/_shared/signup-trade.ts`: shared recognized trade and home-service predicates.
- `supabase/functions/_shared/meta-registration.ts`: independent server trade gate.
- `src/test/signup-trade.test.tsx`: signup flow, bridge/CAPI, defaults and qualification regressions.
- `src/test/signup-trade-category.test.ts`: existing category trigger persistence tests.
- `src/test/meta-capi.test.ts`: server eligibility regressions.
- `src/components/signup/AGENTS.md`: shared qualification/category handoff rule.
- `AGENTS.md`: updated server eligibility rule.
- `roadmap.md`: completion and review-held release step.
- `docs/signup-trade-2026-11-21.md`: changelog and verification limits.

Meta compliance reminder: retain consent evidence, check Events Manager dataset restrictions, accept Meta Business Tools Terms, disclose Meta sharing, and keep advertising withdrawal available through the existing privacy controls.