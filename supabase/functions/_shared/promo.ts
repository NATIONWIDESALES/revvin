// Server-side source of truth for the launch promotion.
//
// The deadline is checked against the SERVER clock. A client that lies about
// the date, or a stale cached bundle, cannot claim the discount after it ends.
//
// Two Stripe coupons, both live, both duration: forever. They are NOT
// interchangeable: the monthly coupon is a flat $32 off ($49 -> $17) and the
// annual coupon is a flat $246 off ($450 -> $204). Applying the monthly coupon
// to the annual price would charge $418, which is not the promotion.
export const PROMO_COUPON_MONTHLY = "fnl3ojLm"; // $32.00 off USD
export const PROMO_COUPON_ANNUAL = "IriZexoc"; // $246.00 off USD

// Back-compat alias for the monthly coupon.
export const PROMO_COUPON_ID = PROMO_COUPON_MONTHLY;

export type PromoPlan = "monthly" | "annual";

// 2026-08-17 23:59 America/Vancouver (PDT, UTC-7).
export const PROMO_END_ISO = "2026-08-18T06:59:00.000Z";

export function isPromoLive(now: Date = new Date()): boolean {
  return now.getTime() < new Date(PROMO_END_ISO).getTime();
}

// Returns the coupon for the given plan, or null when the promo is not live.
export function promoCouponFor(plan: PromoPlan, now: Date = new Date()): string | null {
  if (!isPromoLive(now)) return null;
  return plan === "annual" ? PROMO_COUPON_ANNUAL : PROMO_COUPON_MONTHLY;
}

// Metadata tag so the two promos are distinguishable in Stripe later.
export function promoMetadataFor(plan: PromoPlan, now: Date = new Date()): string {
  if (!isPromoLive(now)) return "none";
  return plan === "annual" ? "launch_17_annual" : "launch_17_monthly";
}
