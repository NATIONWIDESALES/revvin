# Paid-ad sale popup suppression, November 18, 2026

## Files changed
- `src/lib/salePresentation.ts`: identify paid visits by `utm_medium=paid_social`, `utm_source=meta|facebook|instagram`, or presence of `fbclid`, `gclid`, or `msclkid`. Persist only `1` under `revvin_bf2026_paid_ad` in sessionStorage, with an in-memory fallback. No campaign values or click IDs are stored by this logic.
- `src/components/billing/SalePromotion.tsx`: suppress popup scheduling for paid sessions and cancel pending popup timers on query changes. Banner behavior is unchanged.
- `src/test/sale-presentation.test.tsx`: add paid marker, navigation, fresh mount, unavailable storage, pending-timer and organic regressions. Return a fresh mocked sale response for each request.
- `AGENTS.md`: record independent session suppression and banner eligibility.
- `roadmap.md`: record completed work and validation.
- `docs/paid-ad-popup-2026-11-18.md`: this changelog.

## Validation
- Full suite: `bunx vitest run --testTimeout=15000`, 1203 passed, 3 skipped, 0 failed.
- Typecheck: `bunx --package @typescript/native-preview tsgo -b --noEmit`, passed.
- Preview build log: build OK.
- Mobile browser at 390px with controlled live server sale response: paid-ad homepage has no popup and retains banner; visible Pricing link navigates to `/pricing` with no popup and banner retained; fresh organic browser shows the existing popup. Screenshots inspected.

Signup, its offer note, payment code, prices, coupons, database and security policies were not changed. Not published.