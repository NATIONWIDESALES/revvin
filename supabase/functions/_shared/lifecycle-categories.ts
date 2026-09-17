// Category of every lifecycle email, and the single source of truth for it.
//
// "setup" email helps someone use the account they created. It can send now.
// "promo" email exists to promote Revvin Pro, the Launch Package or a win back.
// That is commercial email under CAN-SPAM and CASL, so it carries Revvin's
// postal address and its own opt-out link, and it is skipped entirely while
// REVVIN_POSTAL_ADDRESS is empty.
//
// No Deno globals and no remote imports live here on purpose, so the app's
// vitest suite can cover the rules.

export type LifecycleCategory = "setup" | "promo";

export const LIFECYCLE_CATEGORIES: Record<string, LifecycleCategory> = {
  welcome: "setup",
  not_published_d1: "setup",
  not_published_d3: "setup",
  no_share_d3: "setup",
  no_leads_d7: "setup",
  no_leads_d30: "setup",
  pro_welcome: "setup",
  pro_no_import_d2: "setup",
  pro_no_ask_d7: "setup",
  cancel_feedback: "setup",
  free_d5: "promo",
  free_d10: "promo",
  free_d14: "promo",
  free_d21: "promo",
  first_lead_next_day: "promo",
  winback_d30: "promo",
  // Partner Program mail answers an application, an approval or a payout, so it
  // is setup email, never promotional.
  partner_application_received: "setup",
  partner_approved: "setup",
  partner_payout_sent: "setup",
  partner_admin_new_application: "setup",
};

export function templateCategory(name: string): LifecycleCategory {
  return LIFECYCLE_CATEGORIES[name] ?? "setup";
}
