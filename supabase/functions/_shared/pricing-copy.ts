// Prices and Pro feature copy used by lifecycle email.
//
// Edge functions cannot import from src/, so these values are mirrored from
// src/config/pricing.ts and src/config/planFeatures.ts. The parity test in
// src/test/lifecycle-emails.test.ts fails if the two ever drift, the same
// pattern used for firstAskMessage.
//
// No Deno globals live in this file on purpose so vitest can import it.

export const MONTHLY_PRICE = 49;
export const ANNUAL_PRICE = 450;
export const LAUNCH_PACKAGE_PRICE = 297;

export const PRICE_MONTHLY_TEXT = `$${MONTHLY_PRICE}/month USD`;
export const PRICE_ANNUAL_TEXT = `$${ANNUAL_PRICE}/year`;
export const LAUNCH_PACKAGE_TEXT = `$${LAUNCH_PACKAGE_PRICE} one-time`;

/** The standard offer sentence. Never add a trial, discount or founding price. */
export const PRO_PRICE_LINE =
  `Revvin Pro is ${PRICE_MONTHLY_TEXT} or ${PRICE_ANNUAL_TEXT}. Cancel anytime and your referral page stays live and free.`;

/** How the pricing page describes the Launch Package today. */
export const LAUNCH_PACKAGE_LINE =
  `Optional. We set up your offer, page, and launch assets with you. ${LAUNCH_PACKAGE_TEXT}.`;

/** Mirrors PRO_FEATURES in src/config/planFeatures.ts (labels only). */
export const PRO_FEATURE_LABELS: string[] = [
  "Import your past-customer list",
  "Send your ask to the whole list",
  "Reactivation email campaigns",
  "ROI reporting and monthly recap",
  "Custom page branding",
];
