/**
 * Shared subscription helpers. One definition, used by both the webhook and the
 * status endpoint, so they can never disagree about what "active" or "period
 * end" means.
 */

/** Statuses that grant Pro access. Trialing counts; it is NOT collected money. */
export const ACCESS_STATUSES = ["active", "trialing", "past_due", "paid"] as const;

export type ProviderStatus = {
  /** Raw provider status, or "none" when the customer has no subscription. */
  subscription_status: string;
  /** Access, not payment: true for active, trialing, past_due, paid. */
  has_access: boolean;
  /** Never inferred from status. Only a paid invoice proves money moved. */
  collected_payment: boolean;
  current_period_end: string | null;
  subscription_id: string | null;
  customer_id: string | null;
};

export function hasAccess(status: string | null | undefined): boolean {
  return (ACCESS_STATUSES as readonly string[]).includes(String(status ?? "").toLowerCase());
}

/**
 * Resolve the end of the current billing period.
 *
 * Stripe API 2025-08-27.basil moved `current_period_end` off the Subscription
 * object and onto each subscription item, so the top-level field is now
 * undefined and `new Date(undefined * 1000).toISOString()` THREW, aborting whole
 * webhook handlers. Read the item value first, fall back to `trial_end`, then to
 * the legacy top-level field, and return null rather than an invalid date.
 */
type SubscriptionPeriodSource = {
  items?: { data?: Array<{ current_period_end?: number | null }> };
  trial_end?: number | null;
  current_period_end?: number | null;
};

export function subscriptionPeriodEnd(sub: SubscriptionPeriodSource): string | null {
  const seconds =
    sub.items?.data?.[0]?.current_period_end ??
    sub.trial_end ??
    sub.current_period_end ??
    null;
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}
