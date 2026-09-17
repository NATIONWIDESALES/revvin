// Revvin Partner Program configuration.
//
// The partner program is a separate system from the business referral system
// (/r/{slug}, leads, rewards). Everything here is named "partner" on purpose so
// the two are never confused.
//
// No Deno globals and no remote imports live in this file, so the app's vitest
// suite and src/config/partners.ts can both read the same numbers.

/** Share of collected cash a partner earns. */
export const COMMISSION_RATE = 0.4;

/**
 * When set, only payments within N months of a customer's first payment earn
 * commission. null means no cap: the partner earns for as long as the customer
 * keeps paying.
 */
export const COMMISSION_MONTHS: number | null = null;

/** Days a commission is held before it becomes payable. */
export const HOLD_DAYS = 30;

/** A click counts for this many days. */
export const ATTRIBUTION_WINDOW_DAYS = 60;

/** Minimum payable balance before a payout is made. */
export const MIN_PAYOUT_USD = 50;

export type PartnerProduct = "pro_monthly" | "pro_yearly" | "launch_package";
export type PartnerStatus = "pending" | "approved" | "rejected" | "removed";
export type CommissionStatus = "pending" | "payable" | "paid" | "reversed";

export const PRODUCT_LABELS: Record<PartnerProduct, string> = {
  pro_monthly: "Revvin Pro, monthly",
  pro_yearly: "Revvin Pro, yearly",
  launch_package: "Launch Package",
};
