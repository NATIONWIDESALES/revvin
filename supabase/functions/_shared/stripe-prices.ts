// Single source of truth for Stripe price IDs used by Revvin.
// Both create-business-checkout (charges these) and stripe-business-webhook
// (matches against these) import from here so the IDs cannot drift.
//
// IMPORTANT: when rotating prices in Stripe, update BOTH constants here.
export const PRICE_MONTHLY_49 = "price_1TcGruBjSMQJWZ8iZ2T0xv0y"; // $49/mo Pro (USD) — LIVE
export const PRICE_LAUNCH_PACKAGE_297 = "price_1TcGrtBjSMQJWZ8i7KrEoDiR"; // $297 one-time Launch Package (USD) — LIVE