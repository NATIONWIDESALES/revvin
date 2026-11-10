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
// New redemptions are paused. Existing redeemed subscriptions and coupons stay intact.
export const INVITE_PROMOTION_PAUSED = true;

// 2026-08-17 23:59 America/Vancouver (PDT, UTC-7).
export const PROMO_END_ISO = "2026-08-18T06:59:00.000Z";

export function isPromoLive(now: Date = new Date()): boolean {
  if (INVITE_PROMOTION_PAUSED) return false;
  return now.getTime() < new Date(PROMO_END_ISO).getTime();
}

// The $17/$204 coupons are FLAT-amount coupons priced against the LEGACY
// $49/$450 prices. Against the 2026-11 prices ($97/$970) the same coupons
// would charge $65/$724, which is not the promotion, so the promo branch
// must refuse the new price version outright. Before this promotion can
// resume it must be redefined for the current prices: new coupons, new
// copy, new metadata tags.
export function promoAllowedForPriceVersion(version: unknown): boolean {
  return version === undefined;
}

// Returns the coupon for the given plan, or null when the promo is not live
// or the request uses a price version the flat coupons were never priced for.
export function promoCouponFor(plan: PromoPlan, now: Date = new Date(), priceVersion?: unknown): string | null {
  if (!isPromoLive(now)) return null;
  if (!promoAllowedForPriceVersion(priceVersion)) return null;
  return plan === "annual" ? PROMO_COUPON_ANNUAL : PROMO_COUPON_MONTHLY;
}

// Metadata tag so the two promos are distinguishable in Stripe later.
export function promoMetadataFor(plan: PromoPlan, now: Date = new Date()): string {
  if (!isPromoLive(now)) return "none";
  return plan === "annual" ? "launch_17_annual" : "launch_17_monthly";
}
