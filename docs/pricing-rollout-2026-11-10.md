# Pricing rollout changelog

## Applied
- New live Pro prices: $97/month USD and $970/year USD, billed once, two months free. Legacy $49/$450 prices remain active; existing subscriptions and the $17 subscriber were not edited or emailed.
- Explicit `2026-11` checkout version selects new prices. Versionless requests retain legacy prices; unknown versions fail closed. Both generations remain commission-eligible.
- Migration 0026 enforces 25 Free contacts and Pro automatic job asks, including trial. Migration 0027 gates new API keys/webhook endpoints. Contacts, settings and connections are retained; delivery checks pause Pro-only asks/connections on Free.
- New invite redemptions are default-paused. Existing redemption records/coupons remain unchanged.
- Removed hidden founding Pricing block, homepage strips, founding offer flag and offer CTA. No $29 Stripe price reference remains. Company founding-date metadata remains because it is not an offer; setup-call URL remains for the launch service.
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