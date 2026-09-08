import { hasAccess, subscriptionPeriodEnd, type ProviderStatus } from "./stripe-subscription.ts";

// Provider objects and database adapters stay injected so the actual production
// handlers can be exercised without Stripe, Supabase, or network access.
type Database = any;
type StripeClient = any;
type ProviderObject = any;

export function invoiceSubscriptionId(invoice: ProviderObject): string | null {
  const value = invoice.parent?.subscription_details?.subscription ?? invoice.subscription;
  return typeof value === "string" ? value : value?.id ?? null;
}

export async function updateBusinessBilling(
  db: Database,
  column: "id" | "user_id" | "stripe_subscription_id",
  value: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { account_status: requestedApproval, ...billingPatch } = patch;
  const { data, error } = await db.from("businesses").update(billingPatch).eq(column, value).select("id");
  if (error) throw new Error(`Business billing update failed: ${error.message ?? error}`);
  if (data?.length !== 1) throw new Error("Business billing update did not match exactly one account");
  if (requestedApproval === "approved") {
    // Payment may approve a pending account, but cannot undo an administrative
    // suspension/rejection or a distinct abuse disable. The predicate is atomic
    // so a moderation change racing this webhook also remains protected.
    const { error: approvalError } = await db.from("businesses")
      .update({ account_status: "approved" }).eq("id", data[0].id)
      .eq("account_status", "pending_approval").eq("is_disabled", false).select("id");
    if (approvalError) throw new Error(`Business approval update failed: ${approvalError.message ?? approvalError}`);
  }
}

export async function handlePaidInvoice(db: Database, stripe: StripeClient, invoice: ProviderObject) {
  // This handler is called only for a signature-verified
  // invoice.payment_succeeded event. A paid marker alone (invoice.paid) also
  // covers manual/out-of-band settlement and is not our provider cash signal.
  if (invoice.status !== "paid") throw new Error("Successful invoice event did not contain a paid invoice");
  if (invoice.paid_out_of_band === true) return null;
  const subId = invoiceSubscriptionId(invoice);
  // One-off invoices are outside the subscription payment ledger.
  if (!subId) return null;
  const sub = await stripe.subscriptions.retrieve(subId);
  const { data: businesses, error: lookupError } = await db.from("businesses")
    .select("id").eq("stripe_subscription_id", subId).limit(2);
  if (lookupError) throw new Error(`Business lookup failed: ${lookupError.message ?? lookupError}`);
  if (businesses?.length !== 1) {
    // Subscription and checkout webhooks may arrive out of order. Retry once the
    // owner linkage exists; never acknowledge an orphaned payment as recorded.
    throw new Error("Paid invoice has no unique linked business; retry after subscription linkage");
  }
  const businessId = businesses[0].id;
  const amountCents = Number(invoice.amount_paid);
  const paidSeconds = invoice.status_transitions?.paid_at ?? invoice.created;
  if (!invoice.id || !Number.isSafeInteger(amountCents) || amountCents < 0 ||
      !Number.isFinite(paidSeconds) || paidSeconds <= 0) {
    throw new Error("Paid invoice contains invalid payment facts");
  }
  // A replay of an older invoice must not turn a canceled or trialing
  // subscription into active. Fetch the current provider status every time.
  await updateBusinessBilling(db, "id", businessId, {
    subscription_status: sub.status,
    current_period_end: subscriptionPeriodEnd(sub),
    ...(hasAccess(sub.status) ? { account_status: "approved" } : {}),
    ...(sub.status === "active" || sub.status === "trialing" ? { dunning_notified_at: null } : {}),
  });
  const { data, error } = await db.rpc("fn_record_stripe_payment", {
    p_invoice_id: invoice.id,
    p_subscription_id: subId,
    p_customer_id: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null,
    p_business_id: businessId,
    p_amount_paid_cents: amountCents,
    p_currency: String(invoice.currency ?? "usd").toUpperCase(),
    p_billing_reason: invoice.billing_reason ?? null,
    p_paid_at: new Date(paidSeconds * 1000).toISOString(),
  });
  if (error) throw new Error(`Payment persist failed: ${error.message ?? error}`);
  if (!data?.id || typeof data.duplicate !== "boolean" || typeof data.collected !== "boolean") {
    throw new Error("Payment persistence did not confirm the invoice");
  }
  return { ...data, business_id: businessId, invoice: invoice.id };
}

const NONE: ProviderStatus = {
  subscription_status: "none", has_access: false, collected_payment: false,
  current_period_end: null, subscription_id: null, customer_id: null,
};

export async function synchronizeOwnerSubscription(
  db: Database,
  stripe: StripeClient,
  user: { id: string; email?: string },
): Promise<ProviderStatus> {
  const { data: rows, error: businessError } = await db.from("businesses")
    .select("id, stripe_subscription_id, stripe_customer_id").eq("user_id", user.id).limit(2);
  if (businessError) throw new Error(`Business lookup failed: ${businessError.message ?? businessError}`);
  if (rows?.length !== 1) throw new Error("No unique business account found");
  const biz = rows[0];
  let sub: ProviderObject = null;
  let customerId: string | null = biz.stripe_customer_id ?? null;
  if (biz.stripe_subscription_id) {
    sub = await stripe.subscriptions.retrieve(biz.stripe_subscription_id);
    const providerCustomer = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (customerId && providerCustomer !== customerId) throw new Error("Billing customer mismatch");
    customerId = providerCustomer ?? customerId;
  } else if (customerId) {
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    sub = subscriptions.data.find((s: ProviderObject) => hasAccess(s.status)) ?? subscriptions.data[0] ?? null;
  } else if (user.email) {
    // Email is only a discovery hint during an out-of-order checkout return.
    // Require trusted subscription metadata before linking an unlinked account.
    const customers = await stripe.customers.list({ email: user.email, limit: 100 });
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 100 });
      const owned = subscriptions.data.filter((s: ProviderObject) => s.metadata?.user_id === user.id);
      const candidate = owned.find((s: ProviderObject) => hasAccess(s.status)) ?? owned[0];
      if (candidate) { sub = candidate; customerId = customer.id; break; }
    }
  }
  if (!sub) {
    await updateBusinessBilling(db, "id", biz.id, {
      subscription_status: "none", stripe_subscription_id: null,
      stripe_customer_id: customerId, current_period_end: null,
    });
    return { ...NONE, customer_id: customerId };
  }
  const { data: paidRows, error: paidError } = await db.from("stripe_payments")
    .select("id").eq("stripe_subscription_id", sub.id).eq("collected", true).limit(1);
  if (paidError) throw new Error(`Payment lookup failed: ${paidError.message ?? paidError}`);
  const result: ProviderStatus = {
    subscription_status: sub.status, has_access: hasAccess(sub.status),
    collected_payment: !!paidRows?.length, current_period_end: subscriptionPeriodEnd(sub),
    subscription_id: sub.id, customer_id: customerId,
  };
  await updateBusinessBilling(db, "id", biz.id, {
    subscription_status: result.subscription_status, stripe_subscription_id: sub.id,
    stripe_customer_id: customerId, current_period_end: result.current_period_end,
  });
  return result;
}
