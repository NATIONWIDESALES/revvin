// Single source of truth for Stripe price IDs used by Revvin.
// Both create-business-checkout (charges these) and stripe-business-webhook
// (matches against these) import from here so the IDs cannot drift.
//
// Legacy IDs stay active for existing subscriptions and unversioned checkout.
export const PRICE_MONTHLY_49 = "price_1TcGruBjSMQJWZ8iZ2T0xv0y"; // $49/mo Pro (USD) — LIVE
export const PRICE_ANNUAL_450 = "price_1TyjqzBjSMQJWZ8iJLyTZv16"; // $450/yr Pro (USD), same product as monthly — LIVE
export const PRICE_LAUNCH_PACKAGE_297 = "price_1TcGrtBjSMQJWZ8i7KrEoDiR"; // $297 one-time Launch Package (USD) — LIVE
export const PRICE_MONTHLY_97 = "price_1Ua454BjSMQJWZ8icBw6DLD1";
export const PRICE_ANNUAL_970 = "price_1Ua454BjSMQJWZ8iMl74QvjR";
export const CHECKOUT_PRICE_VERSION = "2026-11";

// Plan identifiers written to Stripe session + subscription metadata.
export type BillingPlan = "monthly" | "annual";
export const PLAN_PRICE: Record<BillingPlan, string> = {
  monthly: PRICE_MONTHLY_49,
  annual: PRICE_ANNUAL_450,
};
export const PLAN_METADATA: Record<BillingPlan, string> = {
  monthly: "pro_monthly_49",
  annual: "pro_annual_450",
};
export function checkoutPricing(plan: BillingPlan, version?: unknown) {
  if (version !== undefined && version !== CHECKOUT_PRICE_VERSION) throw new Error("unsupported_price_version");
  return version === CHECKOUT_PRICE_VERSION
    ? { price: plan === "annual" ? PRICE_ANNUAL_970 : PRICE_MONTHLY_97, metadata: plan === "annual" ? "pro_annual" : "pro_monthly" }
    : { price: PLAN_PRICE[plan], metadata: PLAN_METADATA[plan] };
}