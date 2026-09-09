import type { BillingPlan } from "@/config/pricing";

/**
 * When a visitor picks a Pro plan on a public page such as a toolkit page
 * they are not signed in yet, so we cannot open Stripe Checkout for them. We
 * remember only which plan they chose, for this browser session, and preselect
 * it once they land in their dashboard. No card, no charge, no personal data.
 */
const PENDING_PLAN_KEY = "revvin_pending_plan";

export const setPendingPlan = (plan: BillingPlan) => {
  try {
    window.sessionStorage.setItem(PENDING_PLAN_KEY, plan);
  } catch {
    /* private browsing: the plan simply is not remembered */
  }
};

/** Reads and clears the remembered plan. Returns null when there is none. */
export const takePendingPlan = (): BillingPlan | null => {
  try {
    const value = window.sessionStorage.getItem(PENDING_PLAN_KEY);
    if (value !== "monthly" && value !== "annual") return null;
    window.sessionStorage.removeItem(PENDING_PLAN_KEY);
    return value;
  } catch {
    return null;
  }
};
