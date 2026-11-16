# Early Black Friday sale changelog

## Behavior
- Current version `2026-11` uses the existing monthly 30% coupon or annual 40% coupon: $67.90/month or $582/year.
- The server stops new discounts at `2026-12-01T06:59:00.000Z`. The shared end instant is authoritative; client display starts hidden, reads the server state without caching, refreshes each minute/on focus, and expires using a monotonic timer.
- Invites take precedence over sale selection. The paused launch promo, invite claim/redemption logic, legacy prices, webhook, and launch-package line item remain unchanged. A single coupon is selected; existing product restrictions keep the $297 add-on full price.
- Canceled subscriptions tagged with this sale cannot redeem again. Read-only subscription history is checked by checkout and signed-in pricing-state requests.
- Existing trial-ending templates (3 days and today) gain the requested line only while the server clock says the sale is live. There is no separate trial-ended template in this application; none was added.
- Regular pricing JSON-LD, llms documents, and the homepage ROI worksheet are unchanged.

## Files changed
- `supabase/functions/_shared/promo.ts`: separate sale constants, clock check, coupon selection, derived sale amounts, single promotion selection.
- `supabase/functions/create-business-checkout/index.ts`: read-only sale-state GET, auto-applied coupon and both metadata tags, returning-sale-subscriber guard.
- `supabase/functions/_shared/transactional-email-templates/trial-ending.tsx`: timed sale line in the two existing trial notices.
- `supabase/functions/lifecycle-emails/index.ts`: document render-time server-clock evaluation; selection and delivery are unchanged.
- `src/config/pricing.ts`: shared temporary display prices, existing regular constants untouched.
- `src/lib/useSale.ts`: server-state display and automatic expiry, authenticated eligibility for upgrade screens.
- `src/components/billing/SaleBanner.tsx`: reusable slim banner using existing buttons and Free CTA label.
- `src/components/billing/PlanPicker.tsx`: both discounted options and crossed-out regular prices, annual billing copy derived from the displayed amount.
- `src/components/billing/ProCheckoutCard.tsx`: banner, displayed checkout price congruency, narrow existing user guard.
- `src/pages/Index.tsx`: banner and Pro card sale prices; ROI and structured data untouched.
- `src/pages/Pricing.tsx`: banner and Pro card sale prices, matching annual terms.
- `src/pages/dashboard/BusinessDashboard.tsx`: unpaid-owner upgrade banner, picker and matching CTA price.
- `src/test/black-friday.test.ts`: 18 server, actual-handler, and email-render regression cases.
- `src/test/black-friday-ui.test.tsx`: 4 server-clock display/expiry cases.
- `AGENTS.md`: server-state and single-coupon architecture rule.
- `roadmap.md`: scoped tasks completed.
- `docs/black-friday-sale-2026-11-16.md`: this changelog.

## Verification
- Full Vitest: **1,018 passed, 3 skipped**, 82 passing files and one skipped file.
- Typecheck (`oj typecheck -b --noEmit`): clean.
- Existing shared function checks (`bun run check:functions`): clean.
- Deno checks of both changed function entrypoints: clean.
- Latest preview build signal: build OK.
- Deployed only `create-business-checkout` and `lifecycle-emails` successfully.
- Live deployed GET state enabled the banner and $67.90/$582 prices on localhost Home/Pricing. Both billing options checked in the real pricing page.
- Browser interception of expired server state removed banner/sale prices and restored regular pricing. Tests also exercise expiry within the same open view.
- Desktop 1280x1800 and mobile 390x844 inspected. No horizontal overflow or render errors. Only Pro has a sale strike-through; Free remains $0.
- Pricing page JSON-LD read back at regular 97/970, with no temporary sale figures.
- Actual handler tests capture both session/subscription metadata and coupon discounts, verify post-deadline and legacy requests, full-price add-on item, and canceled-sale return behavior. Applied-invite precedence is tested directly through the shared selector because the real invite path is intentionally paused.

## Limits and release state
- Frontend **not published**. Server discounts and lifecycle sale copy are already live because the two requested functions were deployed. Existing versioned production checkout requests may therefore receive the sale before the new banners are published, as requested by the deployment sequence.
- No real checkout session/subscription was created: doing so would write a Stripe object, prohibited by this task. No charge, cancellation/re-subscription, or coupon product restriction was verified live. Coupon percentage/duration/redeem-by/product restrictions rely on the supplied existing-coupon facts.
- No real lifecycle email was sent for this check; both existing trial notice renders were exercised with mocked server clocks.
- The signed-in owner upgrade screen was not verified with a real account. Its shared picker/banner and checkout handler were exercised in tests; public screens were verified against the live deployed read-only state.
- Natural November 30 expiry has not yet occurred. Boundary behavior is verified with mocked clocks and intercepted server state, not by changing the live server clock.
- No Stripe objects, migrations, RLS policies, legacy coupon values, invite codes, webhook, private payment link, or frontend publishing were changed.