// Single source of truth for the published pricing figures. Every page that
// shows a price, a saving, or a percentage must derive it from here so the
// numbers can never drift between the homepage, pricing page, dashboard and
// checkout.

export const MONTHLY_PRICE = 49;
export const ANNUAL_PRICE = 450;
export const MONTHS_PER_YEAR = 12;

export const ANNUAL_LIST_PRICE = MONTHLY_PRICE * MONTHS_PER_YEAR; // 588
export const ANNUAL_SAVING = ANNUAL_LIST_PRICE - ANNUAL_PRICE; // 138
export const ANNUAL_DISCOUNT_PCT = Math.round((ANNUAL_SAVING / ANNUAL_LIST_PRICE) * 100); // 23
export const ANNUAL_EFFECTIVE_MONTHLY = ANNUAL_PRICE / MONTHS_PER_YEAR; // 37.5

export type BillingPlan = "monthly" | "annual";

const money = (n: number) =>
  n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;

export const PRICE_TEXT = {
  monthly: money(MONTHLY_PRICE), // $49
  monthlyPerMonth: `${money(MONTHLY_PRICE)}/month`,
  annual: money(ANNUAL_PRICE), // $450
  annualPerYear: `${money(ANNUAL_PRICE)}/year`,
  annualListPrice: money(ANNUAL_LIST_PRICE), // $588
  saving: money(ANNUAL_SAVING), // $138
  discount: `${ANNUAL_DISCOUNT_PCT}%`, // 23%
  effectiveMonthly: `${money(ANNUAL_EFFECTIVE_MONTHLY)}/month`, // $37.50/month
} as const;

// Reusable, factual cancellation copy for the annual plan.
export const ANNUAL_TERMS_COPY =
  `Billed once at ${PRICE_TEXT.annual} for the year. Cancel anytime, your page stays live through the end of the paid year. No partial refunds.`;