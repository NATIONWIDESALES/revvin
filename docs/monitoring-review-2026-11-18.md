# Project monitoring review, November 18, 2026

## Findings
1. **Referral-link and page-claimed email rejection: stale.** Migration 0034 already changed the shared `enqueue_email` function to attach recipient unsubscribe tokens. Live function read-back confirms that definition is installed. The current queue worker also repairs missing tokens before sending. Existing isolated PostgreSQL tests cover each template and the signed-out Earn writer. No new database or email changes, and no old failed/DLQ messages resent. Real recipient inbox delivery for Earn and page-claimed remains unverified.
2. **Logged-out sale unavailable: false positive.** The live headerless checkout GET returns HTTP 200 with `sale_live: true`, the expected deadline, and server time. A logged-out preview browser shows the Pricing sale banner and discounted prices. The hypothesis about default gateway verification does not match actual endpoint behavior. No sale-request or gateway changes.
3. **Monthly choice overwritten: fixed.** Both billing pickers now share a selection hook. Pending dashboard choices and explicit clicks are protected from delayed or repeated sale responses. Yearly remains the sale default only when no choice exists. Checkout buttons retain the existing amount-bearing labels and use the selected period's current price.

## Verification
- Full Vitest suite: 1186 passed, 3 skipped.
- Latest preview build signal: build OK.
- Browser: logged-out Pricing displays sale; completed reward-calculator inputs, chose Monthly before releasing a delayed sale response, confirmed $67.90/month CTA, and reached `/signup?plan=monthly`.
- Shared-hook regressions cover pending Monthly dashboard intent, an early Monthly click, untouched Yearly sale default, and later sale refreshes.
- A real authenticated dashboard checkout was not exercised; no charge was initiated.
- No Stripe, RLS, migrations, edge deployments, or frontend publishing.

## Changelog
- `src/lib/useBillingPlan.ts`: shared explicit-choice-preserving sale default hook.
- `src/components/billing/ProCheckoutCard.tsx`: reuse hook and restore selected-price checkout labels during sale.
- `src/pages/dashboard/BusinessDashboard.tsx`: reuse hook with pending-plan restoration and selected-price checkout label.
- `src/test/billing-plan-selection.test.tsx`: four selection regressions.
- `AGENTS.md`: record shared billing-selection rule.
- `roadmap.md`: record review completion and verification limits.
- `docs/monitoring-review-2026-11-18.md`: findings, verification, and changelog.