# Early Black Friday presentation changelog

## Changes
- Centralized the dark-green, yellow-accent sale bar above navigation on marketing and owner dashboard pages. Server-derived countdown, yellow CTA and session dismissal.
- Added a lazy first-visit dialog with shared regular/sale prices, persistent dismissal, storage fallback, bot exclusion and accessible focus/Escape/backdrop handling. Paid owners and referrer audiences do not receive the dialog.
- Removed duplicate inline banners. Live upgrade pickers default to Yearly and use "Upgrade at the Black Friday price".
- The offer parameter was NOT previously preserved by signup. It now passes through the instant-signup destination, confirmation link, existing-user redirect and setup completion to the existing billing tab. It does not create checkout intent or charge anyone.
- Mobile bar uses two compact rows; the subscription-lock sentence stays in the accessible markup and is displayed on desktop and in the dialog, but is visually hidden in the compact mobile bar.

## Files changed
- `src/lib/salePresentation.ts`: route eligibility, CTA destinations, countdown, allowlisted offer continuity and storage keys.
- `src/lib/useSale.ts`: expose server state for presentation while retaining the existing boolean hook and fail-closed expiry behavior.
- `src/components/billing/SaleBanner.tsx`: prominent shared bar.
- `src/components/billing/SalePromotion.tsx`: shared eligibility, dismissal, paid-owner check and lazy dialog timing.
- `src/components/billing/SalePopup.tsx`: accessible first-visit offer dialog.
- `src/components/Layout.tsx`: placement above navigation.
- `src/index.css`: token-based sale styles, narrow-screen fit and sale-only scroll-container fix for sticky placement.
- `src/components/billing/PlanPicker.tsx`: sale Yearly best-value label.
- `src/components/billing/ProCheckoutCard.tsx`: live-sale default and button label; remove nested banner.
- `src/pages/dashboard/BusinessDashboard.tsx`: same live upgrade presentation; remove nested banner.
- `src/pages/Index.tsx`, `src/pages/Pricing.tsx`: remove duplicate banners without changing pricing data.
- `src/components/signup/SignupForm.tsx`, `src/pages/Signup.tsx`, `src/pages/Onboarding.tsx`: preserve offer intent through setup.
- `src/test/sale-presentation.test.tsx`: 31 new eligibility, countdown, continuity, CTA, dismissal, once-only, expiry, paid-owner, bot and storage-fallback regressions.
- `AGENTS.md`, `roadmap.md`, this document: architecture note, task completion and changelog.

## Verification
- Full Vitest: **1049 passed, 3 skipped**, 83 passing files and 1 skipped file.
- `oj typecheck -b --noEmit`: passed. Latest preview build: OK.
- Live preview, desktop 1280x1800: deployed server state enabled sale; dialog appeared once; navigation and reload did not repeat it; session-dismissed banner remained hidden.
- Live preview, 390x844 and 320x844: dialog/card and yellow CTA fit without horizontal overflow. CTA reached `/signup?offer=bf2026`.
- Referral, referral-status, Earn and print routes: neither sale bar nor dialog rendered.
- Mocked expired server response: banner, dialog and struck-through prices disappeared.
- Escape and backdrop dismissal worked. Focus moved into the dialog and returned to the previously focused navigation link. Bar remained at viewport y=0 after scrolling.
- Browser run recorded no runtime errors.

## Not verified / unchanged
- Real signed-in owner billing screen and full account creation/setup read-back could not be exercised: no matching requester account and temporary-user approval unavailable. Owner destination/paid-owner exclusion and offer continuity are covered by tests; no real signup or charge was performed.
- Natural November 30 expiration remains future; expiry is covered with server-clock tests and intercepted server state.
- No publish, function deployment, Stripe operation, coupon/promo logic change, RLS change or migration. Structured pricing and the homepage ROI worksheet are unchanged.
- An unrelated pre-existing modification in `supabase/functions/mcp/index.ts` was left untouched and excluded from this commit.