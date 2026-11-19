# Dashboard miles and Advanced

## Investigation
- `businesses.service_radius_km` is an integer column storing kilometres, default 50. The original migration explicitly documents the unit. No schema change is required or made.
- Browse already calculates search distances in miles and converts the business's kilometre radius for its comparison. That filtering remains unchanged.
- Saved offers still displayed kilometres or metres; those labels now display miles.
- Settings, Billing and the legacy `?tab=integrations` route shared the same content, including integrations. No API-key or webhook anchor links were found.

## Changes
- Added `src/lib/distanceUnits.ts`: exact 1 mile = 1.609344 kilometres, whole-mile radius display, integer-kilometre persistence and mile distance labels.
- Updated `FinishPageCard.tsx` and `PageBrandingEditor.tsx`: radius input/slider uses miles; saves convert to the existing integer kilometre column. Existing maximum kilometre limits stay intact. Saving without changing the displayed radius preserves the original stored value to avoid rounding drift.
- Updated `SavedOffers.tsx`: distance labels use miles; sorting still uses the original distances.
- Added `AdvancedSettings.tsx` and updated `BusinessDashboard.tsx`: Settings has a collapsed Advanced section containing the unchanged integrations panel. Legacy `?tab=integrations` opens it. Billing renders subscription and payment history only; all existing payment handlers are unchanged.
- Added `distance-units.test.ts` and expanded `dashboard-auth-refresh.test.tsx` with conversion, rounding, radius save/preservation, placement and legacy-link regressions.
- Updated `roadmap.md`. Root AGENTS.md has no remaining rule budget, so no architecture rule was added there.

## Verification
- Full suite: 1259 passed, 3 skipped, no failures (`vitest run --testTimeout=15000`).
- Application typecheck: passed (`oj typecheck -b --noEmit`). Preview build: OK.
- Browser with simulated authenticated owner responses: Billing excludes integrations; Advanced starts closed and reveals API keys/webhooks; entering 25 miles saves 40 kilometres and reads back 25 miles after reload; 390px viewport has no horizontal overflow; no page errors.
- Live authenticated verification was not available: requester has no matching app account, and temporary test-user approval is unavailable. No real customer records were changed.
- No migration, payment behavior, security policy or other copy changes. Not published.