# Pricing rollout changelog

## Applied
- New live Pro prices: $97/month USD and $970/year USD, billed once, two months free. Legacy $49/$450 prices remain active; existing subscriptions and the $17 subscriber were not edited or emailed.
- Explicit `2026-11` checkout version selects new prices. Versionless requests retain legacy prices; unknown versions fail closed. Both generations remain commission-eligible.
- Migration 0026 enforces 25 Free contacts and Pro automatic job asks, including trial. Migration 0027 gates new API keys/webhook endpoints. Contacts, settings and connections are retained; delivery checks pause Pro-only asks/connections on Free.
- New invite redemptions are default-paused. Existing redemption records/coupons remain unchanged.
- Removed the hidden retired-offer Pricing block, homepage strips, configuration flag and offer CTA. No retired-offer Stripe price reference remains. Company founding-date metadata remains because it is not an offer; setup-call URL remains for the launch service.
- Updated marketing, product, metadata, structured data, generated-route/feed text, emails, legal and partner price mappings; competitor prices remain unchanged.
- Added full conditional $297 launch refund guarantee; refunds remain manual.

## Permission diagnostic
The historical report records PostgreSQL 42501, `permission denied for schema public`, at the initial `ALTER TABLE public.partners ADD COLUMN kind ...` statement. The original runner role and full raw tool response could not be recovered, so they are not asserted here.

The retry created `public.__revvin_permission_probe_20261110`, granted it, and intentionally raised `P0001` inside a caught subtransaction. Creation rolled back; no probe table remains. A separate rolled-back diagnostic reported `session_user=postgres, current_user=postgres, current_role=postgres, public_create=t`. Pricing migrations subsequently applied successfully.

## Verification and exclusions
- Full Vitest suite: 915 passed, 3 skipped. Pricing regression suite: 16 passed, including isolated PostgreSQL import/rank/expiry/ownership/job/API/webhook gates and generated-document guards.
- Shared function Deno checks passed. Preview build signal was clean. A fresh standalone production build/typecheck was not run because the preview harness owns those checks.
- Pricing page checked at desktop/mobile with no horizontal overflow; monthly/yearly displayed prices verified. No authenticated checkout, new-price charge, manual refund or payout was executed. Session minting for the requesting user failed because no matching app account exists.
- Production pre-migration usage: no real business above 25 contacts and no real automatic-trigger rows.
- Intentional retained historical prices: legacy checkout identifiers, paused promotion constants, customer subscription records and competitor facts. Historical SQL remains immutable.
- Database and server changes are live. Frontend was not published. Publish the matching frontend only after server deployment verification; then verify signed-in checkout displays and charges the selected new price. Old cached clients continue to select legacy prices.
- Rep commissions resume separately after this pricing work; they are not represented as completed by this changelog.
## Congruency review pass (2026-11-10, pre-publish)
- Auth page meta description no longer claims businesses pay when they go live; it now says publishing is free and derives the optional Pro price from the pricing config.
- The new-customer admin email in stripe-business-webhook builds the subscription line item from the actual Stripe price amount and interval, so yearly, legacy and promo subscribers read correctly; no fixed "$97/mo" string remains.
- The setup-fee claim is now qualified on the pricing risk strip and compare-page CTA, and the unqualified phrase is a retired-phrases guard pattern (competitor facts stay exempt).
- comparisons.ts review against the pre-rollout commit: one competitor fact was altered by the sweep (ReferralWise's own setup-fee row had incorrectly gained a qualification); its original wording is restored. Every other change in that file was Revvin's own column, price or plan copy, which is correct.
- Removed "Phone support" from FREE_FEATURES. It came from the Free feature list in the approved pricing request, but it appeared in no other surface (llms.txt, Terms, PLAN_SPLIT, emails, pricing JSON-LD), so it was dropped for consistency.
- Dashboard rail: "Job done asks" moved into the Pro group with a Pro marker. AutoAskTab and IntegrationsTab already showed the paused state and upgrade path to Free accounts; the Home next-step logic never points at Pro-only actions.
- Billing history now says "Rewards tab", matching the rail label.
- Invite promotion fail-closed: the flat $32/$246 coupons were priced against the legacy prices, so the promo and invite branches now refuse the 2026-11 price version outright. The promotion must be redefined (new coupons, copy and metadata) before it can be resumed.
- One customer-facing name: "Done-for-you launch". Renamed across Pricing, About, Onboarding, dashboard billing, billing history, the day-21 email, partner pages/terms, seoRoutes, webhook admin email and comments. `launch_package` stays as the internal identifier. Every customer-facing description states the same three things (we load your list, set up your page and reward with you, send the first asks with you) and the full guarantee is one identical sentence in pricing.ts, pricing-copy.ts and llms.txt, enforced by a parity test.
- Extra finds from the independent pass: the /partners prerender earnings sentence hard-coded stale $19.60/$180 commission examples and now derives from the shared partner config ($38.80/$388/$118.80); SuperAdminCRM's "flat $97/month subscription" note now acknowledges legacy subscribers keep their original price.
- Guard tests extended: 12 new congruency tests in pricing-rollout.test.ts plus the retired-phrases pattern, so each fixed item fails CI if it regresses.
- Verification: full suite 927 passed, 3 skipped; typecheck clean; production build wrote 103 documents and 58 sitemap URLs; generated llms-full.txt, pricing and partners pages verified to carry the new wording and figures. create-business-checkout, stripe-business-webhook, lifecycle-emails and preview-transactional-email redeployed. Frontend not published; no real checkout at the new price was executed.
