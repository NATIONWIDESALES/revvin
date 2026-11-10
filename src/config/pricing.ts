// Single source of truth for the published pricing figures. Every page that
// shows a price, a saving, or a percentage must derive it from here so the
// numbers can never drift between the homepage, pricing page, dashboard and
// checkout.

export const MONTHLY_PRICE = 97;
export const ANNUAL_PRICE = 970;
export const MONTHS_PER_YEAR = 12;

export const ANNUAL_LIST_PRICE = MONTHLY_PRICE * MONTHS_PER_YEAR;
export const ANNUAL_SAVING = ANNUAL_LIST_PRICE - ANNUAL_PRICE;
export const ANNUAL_DISCOUNT_PCT = Math.round((ANNUAL_SAVING / ANNUAL_LIST_PRICE) * 100);
export const ANNUAL_EFFECTIVE_MONTHLY = ANNUAL_PRICE / MONTHS_PER_YEAR;

export type BillingPlan = "monthly" | "annual";

const money = (n: number) =>
  n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;

export const PRICE_TEXT = {
  monthly: money(MONTHLY_PRICE),
  monthlyPerMonth: `${money(MONTHLY_PRICE)}/month`,
  annual: money(ANNUAL_PRICE),
  annualPerYear: `${money(ANNUAL_PRICE)}/year`,
  annualListPrice: money(ANNUAL_LIST_PRICE),
  saving: money(ANNUAL_SAVING),
  discount: `${ANNUAL_DISCOUNT_PCT}%`, // two months free
  effectiveMonthly: `${money(ANNUAL_EFFECTIVE_MONTHLY)}/month`,
} as const;

// Reusable, factual cancellation copy for the annual plan. Two separate facts,
// stated separately: Pro access runs to the end of the term you paid for, and
// the referral page is free, so it stays live after Pro ends.
export const ANNUAL_TERMS_COPY =
  `Billed once at ${PRICE_TEXT.annual} for the year. Cancel anytime and Pro keeps working to the end of the year you paid for. After that your referral page stays live and keeps taking referrals, because publishing is free. No partial refunds.`;



export const CHECKOUT_PRICE_VERSION = "2026-11";
// The one full statement of the done-for-you launch guarantee. Wherever the
// guarantee is stated in full it must be this exact sentence; the parity test
// in src/test/pricing-rollout.test.ts checks every surface against it.
export const LAUNCH_GUARANTEE = "If no referral arrives within 60 days of your first asks, we refund the $297 in full, provided you asked at least 50 customers and email info@revvin.co within 90 days of purchase. Refunds are issued manually.";
