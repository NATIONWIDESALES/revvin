// Pure partner-program logic. No Deno globals and no remote imports, so the
// app's vitest suite imports this file directly and the arithmetic, attribution
// rules and refund handling are covered by tests.

import {
  ATTRIBUTION_WINDOW_DAYS,
  COMMISSION_MONTHS,
  COMMISSION_RATE,
  HOLD_DAYS,
  MIN_PAYOUT_USD,
  type CommissionStatus,
  type PartnerProduct,
} from "./partner-config.ts";
import {
  PRICE_ANNUAL_450,
  PRICE_LAUNCH_PACKAGE_297,
  PRICE_MONTHLY_49,
} from "./stripe-prices.ts";

const DAY = 86_400_000;

/* -------------------------------------------------------------------------- */
/* Codes                                                                      */
/* -------------------------------------------------------------------------- */

/** Lowercase, 3 to 24 characters, letters, numbers and hyphens. */
export function normalizePartnerCode(raw: unknown): string | null {
  const code = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .replace(/-+$/g, "");
  if (code.length < 3) return null;
  return code;
}

/** A first suggestion for a code, taken from the applicant's name. */
export function codeFromName(name: unknown): string | null {
  return normalizePartnerCode(name);
}

/* -------------------------------------------------------------------------- */
/* Money                                                                      */
/* -------------------------------------------------------------------------- */

export function commissionCents(amountCollectedCents: number): number {
  if (!Number.isFinite(amountCollectedCents) || amountCollectedCents <= 0) return 0;
  return Math.round(amountCollectedCents * COMMISSION_RATE);
}

export function payableAtIso(paidAtIso: string, holdDays: number = HOLD_DAYS): string {
  const t = Date.parse(paidAtIso);
  const base = Number.isFinite(t) ? t : Date.now();
  return new Date(base + holdDays * DAY).toISOString();
}

export function isMature(
  commission: { status: string; payable_at: string },
  now: number = Date.now(),
): boolean {
  if (commission.status !== "pending") return false;
  const t = Date.parse(commission.payable_at);
  return Number.isFinite(t) && t <= now;
}

/** COMMISSION_MONTHS = null means every payment earns, forever. */
export function withinCommissionWindow(
  firstPaidAtIso: string | null | undefined,
  paidAtIso: string,
  months: number | null = COMMISSION_MONTHS,
): boolean {
  if (months === null || months === undefined) return true;
  if (!firstPaidAtIso) return true;
  const first = Date.parse(firstPaidAtIso);
  const paid = Date.parse(paidAtIso);
  if (!Number.isFinite(first) || !Number.isFinite(paid)) return true;
  const cutoff = new Date(first);
  cutoff.setUTCMonth(cutoff.getUTCMonth() + months);
  return paid <= cutoff.getTime();
}

/** Payable balance: payable commissions plus unapplied adjustments, never below zero. */
export function payableBalanceCents(
  payableCommissions: { commission_cents: number }[],
  unappliedAdjustments: { amount_cents: number }[] = [],
): number {
  const earned = payableCommissions.reduce((sum, c) => sum + Number(c.commission_cents || 0), 0);
  const adjusted = unappliedAdjustments.reduce((sum, a) => sum + Number(a.amount_cents || 0), 0);
  return Math.max(0, earned + adjusted);
}

export function meetsPayoutMinimum(balanceCents: number): boolean {
  return balanceCents >= MIN_PAYOUT_USD * 100;
}

/* -------------------------------------------------------------------------- */
/* Stripe object reading                                                      */
/* -------------------------------------------------------------------------- */

export function productFromPriceId(priceId: unknown): PartnerProduct | null {
  switch (String(priceId ?? "")) {
    case PRICE_MONTHLY_49:
      return "pro_monthly";
    case PRICE_ANNUAL_450:
      return "pro_yearly";
    case PRICE_LAUNCH_PACKAGE_297:
      return "launch_package";
    default:
      return null;
  }
}

/** Product for an invoice, read from its line items. Interval is the fallback. */
export function productFromInvoice(invoice: any): PartnerProduct | null {
  const lines: any[] = invoice?.lines?.data ?? [];
  for (const line of lines) {
    const priceId = line?.price?.id ?? line?.pricing?.price_details?.price ?? line?.plan?.id;
    const matched = productFromPriceId(priceId);
    if (matched) return matched;
  }
  for (const line of lines) {
    const interval = line?.price?.recurring?.interval ?? line?.plan?.interval;
    if (interval === "year") return "pro_yearly";
    if (interval === "month") return "pro_monthly";
  }
  return null;
}

/** Tax on an invoice, across both the legacy and current Stripe shapes. */
export function invoiceTaxCents(invoice: any): number {
  if (Number.isFinite(invoice?.tax)) return Number(invoice.tax);
  const taxes: any[] = invoice?.total_taxes ?? [];
  return taxes.reduce((sum, t) => sum + Number(t?.amount ?? 0), 0);
}

/** Cash actually collected, after discounts and excluding tax. */
export function invoiceCollectedCents(invoice: any): number {
  const paid = Number(invoice?.amount_paid ?? 0);
  return Math.max(0, paid - invoiceTaxCents(invoice));
}

export function invoiceChargeId(invoice: any): string | null {
  const charge = invoice?.charge ?? invoice?.payments?.data?.[0]?.payment?.charge ?? null;
  if (typeof charge === "string") return charge;
  return charge?.id ?? null;
}

export function invoicePaymentIntentId(invoice: any): string | null {
  const pi = invoice?.payment_intent ?? invoice?.payments?.data?.[0]?.payment?.payment_intent ?? null;
  if (typeof pi === "string") return pi;
  return pi?.id ?? null;
}

/* -------------------------------------------------------------------------- */
/* Attribution                                                                */
/* -------------------------------------------------------------------------- */

export interface AttributionInput {
  /** Code typed at signup. Wins over a stored click. */
  typedCode?: string | null;
  /** Code from the stored rv_partner click. */
  clickCode?: string | null;
  clickedAt?: string | null;
  partner?: { id: string; status: string; email: string } | null;
  ownerEmail?: string | null;
  isDemo?: boolean | null;
  /** True when the business row already existed before this call. */
  alreadyAttributed?: boolean | null;
  now?: number;
}

export type AttributionDecision =
  | { attribute: true; partnerId: string; via: "typed" | "click" }
  | { attribute: false; reason: string };

/**
 * A typed code wins over a stored click. A stored click must be inside
 * ATTRIBUTION_WINDOW_DAYS. Demo businesses, self referrals and unknown or
 * non-approved codes are never attributed.
 */
export function attributionDecision(input: AttributionInput): AttributionDecision {
  const now = input.now ?? Date.now();
  if (input.isDemo === true) return { attribute: false, reason: "demo_business" };
  if (input.alreadyAttributed === true) return { attribute: false, reason: "already_attributed" };

  const typed = normalizePartnerCode(input.typedCode);
  const clicked = normalizePartnerCode(input.clickCode);
  const via: "typed" | "click" | null = typed ? "typed" : clicked ? "click" : null;
  if (!via) return { attribute: false, reason: "no_code" };

  if (via === "click") {
    const t = Date.parse(String(input.clickedAt ?? ""));
    if (!Number.isFinite(t)) return { attribute: false, reason: "click_undated" };
    if (now - t > ATTRIBUTION_WINDOW_DAYS * DAY) {
      return { attribute: false, reason: "click_expired" };
    }
  }

  const partner = input.partner;
  if (!partner) return { attribute: false, reason: "unknown_code" };
  if (partner.status !== "approved") return { attribute: false, reason: "partner_not_approved" };

  const owner = String(input.ownerEmail ?? "").trim().toLowerCase();
  if (owner && owner === String(partner.email ?? "").trim().toLowerCase()) {
    return { attribute: false, reason: "self_referral" };
  }

  return { attribute: true, partnerId: partner.id, via };
}

/** The code a signup should use, given a typed code and a stored click. */
export function preferredCode(typed?: string | null, clicked?: string | null): string | null {
  return normalizePartnerCode(typed) ?? normalizePartnerCode(clicked);
}

/* -------------------------------------------------------------------------- */
/* Refunds and disputes                                                       */
/* -------------------------------------------------------------------------- */

export interface ReversalInput {
  commission: {
    id: string;
    partner_id: string;
    status: CommissionStatus | string;
    commission_cents: number;
    amount_collected_cents: number;
  };
  /** Amount refunded or disputed, in cents. */
  refundedCents: number;
  /** Total charge amount in cents, for the proportion. */
  chargeAmountCents?: number | null;
  reason: string;
}

export type ReversalPlan =
  | { action: "none"; reason: string }
  | { action: "reverse"; reversalReason: string }
  | { action: "reduce"; commissionCents: number; note: string }
  | { action: "adjust"; amountCents: number; reason: string };

/**
 * A refund or dispute never leaves a partner paid for money Revvin gave back.
 *
 * pending or payable: the commission is reversed, or reduced proportionally for
 * a partial refund. Already paid: a negative adjustment comes off the next
 * payout. Already reversed: nothing to do.
 */
export function reversalPlan(input: ReversalInput): ReversalPlan {
  const { commission, reason } = input;
  const total = Number(input.chargeAmountCents ?? commission.amount_collected_cents ?? 0);
  const refunded = Math.max(0, Number(input.refundedCents ?? 0));
  if (refunded <= 0) return { action: "none", reason: "nothing_refunded" };
  if (commission.status === "reversed") return { action: "none", reason: "already_reversed" };

  const proportion = total > 0 ? Math.min(1, refunded / total) : 1;
  const full = proportion >= 0.999;
  const earned = Number(commission.commission_cents || 0);
  const clawback = Math.round(earned * proportion);

  if (commission.status === "paid") {
    if (clawback <= 0) return { action: "none", reason: "nothing_to_claw_back" };
    return { action: "adjust", amountCents: -clawback, reason };
  }

  if (full) return { action: "reverse", reversalReason: reason };

  const remaining = Math.max(0, earned - clawback);
  return {
    action: "reduce",
    commissionCents: remaining,
    note: `${reason}: reduced by ${clawback} cents for a partial refund`,
  };
}
