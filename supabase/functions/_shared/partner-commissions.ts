// Commission recording for the partner program.
//
// These handlers are additive: they are called from stripe-business-webhook
// alongside the existing billing handling and never change how an existing
// event is handled. The database is an injected adapter so the production
// handlers can be exercised without Stripe, Supabase or network access.
//
// Double counting is prevented in two ways:
//   1. Subscription revenue is only ever recorded from invoice.paid. A
//      checkout session in subscription mode records nothing.
//   2. stripe_object_id is UNIQUE, so a webhook retry inserts nothing.

import {
  commissionCents,
  invoiceChargeId,
  invoiceCollectedCents,
  invoicePaymentIntentId,
  payableAtIso,
  productFromInvoice,
  productFromPriceId,
  reversalPlan,
  withinCommissionWindow,
} from "./partner-rules.ts";
import type { PartnerProduct } from "./partner-config.ts";

type Database = any;

export type CommissionOutcome =
  | { created: true; commissionCents: number; product: PartnerProduct }
  | { created: false; reason: string };

interface RecordInput {
  businessId: string;
  partnerId: string;
  sourceType: "invoice" | "checkout";
  stripeObjectId: string;
  stripeChargeId: string | null;
  product: PartnerProduct;
  amountCollectedCents: number;
  currency: string;
  paidAtIso: string;
}

/** Insert one commission. The UNIQUE stripe_object_id makes retries no-ops. */
export async function recordCommission(
  db: Database,
  input: RecordInput,
): Promise<CommissionOutcome> {
  const amount = Math.max(0, Math.round(Number(input.amountCollectedCents || 0)));
  if (amount <= 0) return { created: false, reason: "zero_amount" };
  const earned = commissionCents(amount);
  if (earned <= 0) return { created: false, reason: "zero_commission" };

  const { error } = await db.from("partner_commissions").insert({
    partner_id: input.partnerId,
    business_id: input.businessId,
    source_type: input.sourceType,
    stripe_object_id: input.stripeObjectId,
    stripe_charge_id: input.stripeChargeId,
    product: input.product,
    amount_collected_cents: amount,
    commission_cents: earned,
    currency: (input.currency || "USD").toUpperCase(),
    paid_at: input.paidAtIso,
    payable_at: payableAtIso(input.paidAtIso),
    status: "pending",
  });

  if (error) {
    const message = String(error.message ?? error);
    if (/duplicate key|unique constraint/i.test(message)) {
      return { created: false, reason: "duplicate" };
    }
    throw new Error(`Partner commission insert failed: ${message}`);
  }
  return { created: true, commissionCents: earned, product: input.product };
}

interface AttributedBusiness {
  id: string;
  partner_id: string;
  partner: { id: string; status: string };
}

/** The attributed business behind a Stripe customer, when its partner is approved. */
export async function attributedBusinessForCustomer(
  db: Database,
  customerId: string | null,
  fallbackUserId?: string | null,
): Promise<AttributedBusiness | null> {
  const load = async (column: string, value: string) => {
    const { data } = await db
      .from("businesses")
      .select("id, partner_id, is_demo")
      .eq(column, value)
      .limit(1);
    return data?.[0] ?? null;
  };

  let biz = customerId ? await load("stripe_customer_id", customerId) : null;
  if (!biz && fallbackUserId) biz = await load("user_id", fallbackUserId);
  if (!biz || !biz.partner_id || biz.is_demo === true) return null;

  const { data: partners } = await db
    .from("partners")
    .select("id, status")
    .eq("id", biz.partner_id)
    .limit(1);
  const partner = partners?.[0];
  if (!partner || partner.status !== "approved") return null;
  return { id: biz.id, partner_id: biz.partner_id, partner };
}

/** Earliest recorded commission for a business, used by COMMISSION_MONTHS. */
async function firstPaidAt(db: Database, businessId: string): Promise<string | null> {
  const { data } = await db
    .from("partner_commissions")
    .select("paid_at")
    .eq("business_id", businessId)
    .order("paid_at", { ascending: true })
    .limit(1);
  return data?.[0]?.paid_at ?? null;
}

/**
 * invoice.paid: every subscription payment, monthly or yearly. $0 invoices and
 * invoices that are all tax record nothing.
 */
export async function handlePartnerInvoicePaid(
  db: Database,
  invoice: any,
): Promise<CommissionOutcome> {
  const customerId = typeof invoice?.customer === "string"
    ? invoice.customer
    : invoice?.customer?.id ?? null;
  const biz = await attributedBusinessForCustomer(db, customerId);
  if (!biz) return { created: false, reason: "not_attributed" };

  const amount = invoiceCollectedCents(invoice);
  if (amount <= 0) return { created: false, reason: "zero_amount" };

  const product = productFromInvoice(invoice);
  if (!product) return { created: false, reason: "unknown_product" };

  const paidAtSeconds = Number(invoice?.status_transitions?.paid_at ?? invoice?.created ?? 0);
  const paidAtIso = paidAtSeconds > 0
    ? new Date(paidAtSeconds * 1000).toISOString()
    : new Date().toISOString();

  if (!withinCommissionWindow(await firstPaidAt(db, biz.id), paidAtIso)) {
    return { created: false, reason: "outside_commission_window" };
  }

  return await recordCommission(db, {
    businessId: biz.id,
    partnerId: biz.partner_id,
    sourceType: "invoice",
    stripeObjectId: String(invoice.id),
    stripeChargeId: invoiceChargeId(invoice) ?? invoicePaymentIntentId(invoice),
    product,
    amountCollectedCents: amount,
    currency: String(invoice?.currency ?? "usd"),
    paidAtIso,
  });
}

/**
 * checkout.session.completed in payment mode: the Launch Package only.
 * Subscription-mode sessions record nothing, because invoice.paid covers them.
 */
export async function handlePartnerCheckoutCompleted(
  db: Database,
  session: any,
  lineItemPriceIds: string[] = [],
): Promise<CommissionOutcome> {
  if (session?.mode !== "payment") return { created: false, reason: "not_payment_mode" };
  if (session?.payment_status && session.payment_status !== "paid") {
    return { created: false, reason: "not_paid" };
  }

  const customerId = typeof session?.customer === "string"
    ? session.customer
    : session?.customer?.id ?? null;
  const biz = await attributedBusinessForCustomer(
    db,
    customerId,
    (session?.metadata?.user_id as string) || null,
  );
  if (!biz) return { created: false, reason: "not_attributed" };

  const matched = lineItemPriceIds.map(productFromPriceId).filter(Boolean) as PartnerProduct[];
  if (matched.length && !matched.includes("launch_package")) {
    return { created: false, reason: "unknown_product" };
  }

  const tax = Number(session?.total_details?.amount_tax ?? 0);
  const amount = Math.max(0, Number(session?.amount_total ?? 0) - tax);
  if (amount <= 0) return { created: false, reason: "zero_amount" };

  const createdSeconds = Number(session?.created ?? 0);
  const paidAtIso = createdSeconds > 0
    ? new Date(createdSeconds * 1000).toISOString()
    : new Date().toISOString();

  const paymentIntent = typeof session?.payment_intent === "string"
    ? session.payment_intent
    : session?.payment_intent?.id ?? null;

  return await recordCommission(db, {
    businessId: biz.id,
    partnerId: biz.partner_id,
    sourceType: "checkout",
    stripeObjectId: String(session.id),
    stripeChargeId: paymentIntent,
    product: "launch_package",
    amountCollectedCents: amount,
    currency: String(session?.currency ?? "usd"),
    paidAtIso,
  });
}

export interface ReversalSummary {
  reversed: number;
  reduced: number;
  adjusted: number;
}

/**
 * charge.refunded and charge.dispute.created. Commissions are found by charge
 * id, and by payment intent id for rows recorded before a charge existed.
 */
export async function handlePartnerChargeReversal(
  db: Database,
  input: {
    chargeIds: (string | null | undefined)[];
    refundedCents: number;
    chargeAmountCents?: number | null;
    reason: string;
  },
): Promise<ReversalSummary> {
  const summary: ReversalSummary = { reversed: 0, reduced: 0, adjusted: 0 };
  const ids = input.chargeIds.filter(Boolean).map(String);
  if (!ids.length) return summary;

  const seen = new Set<string>();
  const rows: any[] = [];
  for (const id of ids) {
    const { data } = await db
      .from("partner_commissions")
      .select("id, partner_id, status, commission_cents, amount_collected_cents")
      .eq("stripe_charge_id", id);
    for (const row of data ?? []) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
  }

  for (const row of rows) {
    const plan = reversalPlan({
      commission: row,
      refundedCents: input.refundedCents,
      chargeAmountCents: input.chargeAmountCents ?? row.amount_collected_cents,
      reason: input.reason,
    });
    if (plan.action === "reverse") {
      await db
        .from("partner_commissions")
        .update({ status: "reversed", reversal_reason: plan.reversalReason })
        .eq("id", row.id);
      summary.reversed++;
    } else if (plan.action === "reduce") {
      await db
        .from("partner_commissions")
        .update({ commission_cents: plan.commissionCents, reversal_reason: plan.note })
        .eq("id", row.id);
      summary.reduced++;
    } else if (plan.action === "adjust") {
      await db.from("partner_adjustments").insert({
        partner_id: row.partner_id,
        amount_cents: plan.amountCents,
        commission_id: row.id,
        reason: plan.reason,
      });
      summary.adjusted++;
    }
  }
  return summary;
}
