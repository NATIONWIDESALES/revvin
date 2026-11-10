// Prices and Pro feature copy used by lifecycle email.
//
// Edge functions cannot import from src/, so these values are mirrored from
// src/config/pricing.ts and src/config/planFeatures.ts. The parity test in
// src/test/lifecycle-emails.test.ts fails if the two ever drift, the same
// pattern used for firstAskMessage.
//
// No Deno globals live in this file on purpose so vitest can import it.

export const MONTHLY_PRICE = 97;
export const ANNUAL_PRICE = 970;
export const LAUNCH_PACKAGE_PRICE = 297;

export const PRICE_MONTHLY_TEXT = `$${MONTHLY_PRICE}/month USD`;
export const PRICE_ANNUAL_TEXT = `$${ANNUAL_PRICE}/year`;
export const LAUNCH_PACKAGE_TEXT = `$${LAUNCH_PACKAGE_PRICE} one-time`;

/** The standard offer sentence. Keep existing subscriber terms separate from the standard offer. */
export const PRO_PRICE_LINE =
  `Revvin Pro is ${PRICE_MONTHLY_TEXT} or ${PRICE_ANNUAL_TEXT} USD billed once, two months free. Cancel anytime and your referral page stays live and free.`;

/** How the pricing page describes the done-for-you launch today. The
 *  guarantee sentence must stay identical to LAUNCH_GUARANTEE in
 *  src/config/pricing.ts; the pricing-rollout parity test checks it. */
export const LAUNCH_PACKAGE_LINE =
  `Optional done-for-you launch. We load your customer list, set up your page and reward with you, and send the first asks with you. ${LAUNCH_PACKAGE_TEXT}. If no referral arrives within 60 days of your first asks, we refund the $297 in full, provided you asked at least 50 customers and email info@revvin.co within 90 days of purchase. Refunds are issued manually.`;

/** Mirrors PRO_FEATURES in src/config/planFeatures.ts (labels only). */
export const PRO_FEATURE_LABELS: string[] = [
  "Unlimited customers, imported and asked",
  "Automatic ask after each job",
  "API and Zapier connection",
  "Send your ask to the whole list",
  "Reactivation email campaigns",
  "ROI reporting and monthly recap",
  "Custom page branding",
];
