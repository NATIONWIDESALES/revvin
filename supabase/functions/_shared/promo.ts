// Server-side source of truth for the launch promotion.
//
// The deadline is checked against the SERVER clock. A client that lies about
// the date, or a stale cached bundle, cannot claim the discount after it ends.
//
// Stripe coupon: $32.00 off USD, duration: forever, created live.
// Applied only to the monthly plan; the annual plan is excluded.
export const PROMO_COUPON_ID = "fnl3ojLm";

// 2026-08-17 23:59 America/Vancouver (PDT, UTC-7).
export const PROMO_END_ISO = "2026-08-18T06:59:00.000Z";

export function isPromoLive(now: Date = new Date()): boolean {
  return now.getTime() < new Date(PROMO_END_ISO).getTime();
}
