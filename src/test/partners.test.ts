import { describe, expect, it, vi } from "vitest";
import {
  attributionDecision,
  commissionCents,
  isMature,
  meetsPayoutMinimum,
  normalizePartnerCode,
  payableBalanceCents,
  payableAtIso,
  preferredCode,
  reversalPlan,
} from "../../supabase/functions/_shared/partner-rules";
import * as backendConfig from "../../supabase/functions/_shared/partner-config";
import {
  handlePartnerChargeReversal,
  handlePartnerCheckoutCompleted,
  handlePartnerInvoicePaid,
} from "../../supabase/functions/_shared/partner-commissions";
import { attributeBusinessToPartner } from "../../supabase/functions/_shared/partner-attribution";
import * as frontConfig from "@/config/partners";
import {
  PRICE_ANNUAL_450,
  PRICE_LAUNCH_PACKAGE_297,
  PRICE_MONTHLY_49,
} from "../../supabase/functions/_shared/stripe-prices";

/* -------------------------------------------------------------------------- */
/* Fake database                                                              */
/* -------------------------------------------------------------------------- */

type Row = Record<string, any>;

function fakeDb(tables: Record<string, Row[]>) {
  const inserted: Record<string, Row[]> = {};
  const updated: { table: string; patch: Row; filters: Row }[] = [];
  const unique = new Set<string>();
  for (const row of tables.partner_commissions ?? []) {
    if (row.stripe_object_id) unique.add(row.stripe_object_id);
  }

  const db = {
    inserted,
    updated,
    from(table: string) {
      const state: { op: string; patch?: Row; value?: Row; filters: Row; nulls: string[]; notNulls: string[] } = {
        op: "select",
        filters: {},
        nulls: [],
        notNulls: [],
      };
      const rows = () => {
        let out = [...(tables[table] ?? [])];
        for (const [key, value] of Object.entries(state.filters)) {
          if (Array.isArray(value)) out = out.filter((r) => value.includes(r[key]));
          else out = out.filter((r) => r[key] === value);
        }
        for (const key of state.nulls) out = out.filter((r) => r[key] === null || r[key] === undefined);
        for (const key of state.notNulls) out = out.filter((r) => r[key] !== null && r[key] !== undefined);
        return out;
      };
      const settle = () => {
        if (state.op === "insert") {
          const row = state.value as Row;
          if (table === "partner_commissions") {
            if (unique.has(row.stripe_object_id)) {
              return { data: null, error: { message: "duplicate key value violates unique constraint" } };
            }
            unique.add(row.stripe_object_id);
          }
          (inserted[table] ??= []).push(row);
          (tables[table] ??= []).push(row);
          return { data: [row], error: null };
        }
        if (state.op === "update") {
          const affected = rows();
          for (const row of affected) Object.assign(row, state.patch);
          updated.push({ table, patch: state.patch as Row, filters: { ...state.filters } });
          return { data: affected, error: null };
        }
        return { data: rows(), error: null };
      };
      const chain: any = {
        select: () => chain,
        insert: (value: Row) => {
          state.op = "insert";
          state.value = value;
          return chain;
        },
        update: (patch: Row) => {
          state.op = "update";
          state.patch = patch;
          return chain;
        },
        eq: (key: string, value: unknown) => {
          state.filters[key] = value;
          return chain;
        },
        in: (key: string, values: unknown[]) => {
          state.filters[key] = values;
          return chain;
        },
        is: (key: string, value: null) => {
          if (value === null) state.nulls.push(key);
          return chain;
        },
        not: (key: string) => {
          state.notNulls.push(key);
          return chain;
        },
        order: () => chain,
        limit: () => chain,
        then: (yes: any, no: any) => Promise.resolve().then(settle).then(yes, no),
      };
      return chain;
    },
  };
  return db as any;
}

const partner = { id: "partner-1", status: "approved", email: "creator@example.test", name: "Creator", code: "creator" };
const business = { id: "biz-1", user_id: "user-1", partner_id: partner.id, is_demo: false, stripe_customer_id: "cus_1" };

const world = (overrides: Record<string, Row[]> = {}) =>
  fakeDb({
    partners: [{ ...partner }],
    businesses: [{ ...business }],
    partner_commissions: [],
    partner_adjustments: [],
    ...overrides,
  });

const invoice = (over: Row = {}): Row => ({
  id: "in_1",
  customer: "cus_1",
  currency: "usd",
  amount_paid: 4900,
  total_taxes: [],
  charge: "ch_1",
  status_transitions: { paid_at: 1_760_000_000 },
  lines: { data: [{ price: { id: PRICE_MONTHLY_49, recurring: { interval: "month" } } }] },
  ...over,
});

/* -------------------------------------------------------------------------- */

describe("partner config parity", () => {
  it("quotes the same numbers on the pages and in the edge functions", () => {
    expect(frontConfig.COMMISSION_RATE).toBe(backendConfig.COMMISSION_RATE);
    expect(frontConfig.COMMISSION_MONTHS).toBe(backendConfig.COMMISSION_MONTHS);
    expect(frontConfig.HOLD_DAYS).toBe(backendConfig.HOLD_DAYS);
    expect(frontConfig.ATTRIBUTION_WINDOW_DAYS).toBe(backendConfig.ATTRIBUTION_WINDOW_DAYS);
    expect(frontConfig.MIN_PAYOUT_USD).toBe(backendConfig.MIN_PAYOUT_USD);
  });

  it("publishes the exact earnings the program pays", () => {
    const earn = frontConfig.PARTNER_EARNINGS.map((row) => row.earn);
    expect(earn[0]).toContain("$19.60");
    expect(earn[1]).toContain("$180");
    expect(earn[2]).toContain("$118.80");
    expect(commissionCents(4900)).toBe(1960);
    expect(commissionCents(45000)).toBe(18000);
    expect(commissionCents(29700)).toBe(11880);
  });
});

describe("partner codes and balances", () => {
  it("normalizes codes and rejects anything shorter than three characters", () => {
    expect(normalizePartnerCode("  Karm's Channel! ")).toBe("karms-channel");
    expect(normalizePartnerCode("ab")).toBeNull();
    expect(normalizePartnerCode("")).toBeNull();
  });

  it("prefers a typed code over a stored click", () => {
    expect(preferredCode("typed-code", "clicked-code")).toBe("typed-code");
    expect(preferredCode(null, "clicked-code")).toBe("clicked-code");
  });

  it("counts unapplied adjustments against the payable balance", () => {
    expect(payableBalanceCents([{ commission_cents: 5000 }], [{ amount_cents: -1960 }])).toBe(3040);
    expect(payableBalanceCents([{ commission_cents: 1000 }], [{ amount_cents: -5000 }])).toBe(0);
    expect(meetsPayoutMinimum(4999)).toBe(false);
    expect(meetsPayoutMinimum(5000)).toBe(true);
  });
});

describe("attribution", () => {
  const clickedAt = new Date("2026-09-01T00:00:00Z").toISOString();
  const now = Date.parse("2026-09-10T00:00:00Z");

  it("attributes a business referred by an approved partner link", async () => {
    const db = world({ businesses: [{ ...business, partner_id: null }] });
    const result = await attributeBusinessToPartner({
      db,
      business: { id: "biz-1", partner_id: null, is_demo: false },
      ownerEmail: "owner@example.test",
      clickCode: "creator",
      clickedAt,
      now,
    });
    expect(result).toMatchObject({ attributed: true, partnerId: "partner-1", via: "click" });
  });

  it.each([
    ["a demo business", { isDemo: true }, "demo_business"],
    ["a self referral", { ownerEmail: partner.email }, "self_referral"],
    ["an unknown code", { partner: null }, "unknown_code"],
    ["a partner who is not approved", { partner: { ...partner, status: "pending" } }, "partner_not_approved"],
    ["a click older than the window", { clickedAt: new Date("2026-01-01T00:00:00Z").toISOString() }, "click_expired"],
  ])("never attributes %s", (_label, override, reason) => {
    const decision = attributionDecision({
      clickCode: "creator",
      clickedAt,
      partner,
      ownerEmail: "owner@example.test",
      isDemo: false,
      now,
      ...(override as Record<string, unknown>),
    });
    expect(decision).toEqual({ attribute: false, reason });
  });

  it("never moves a business that is already attributed", async () => {
    const db = world();
    const result = await attributeBusinessToPartner({
      db,
      business: { id: "biz-1", partner_id: "partner-9", is_demo: false },
      typedCode: "creator",
      now,
    });
    expect(result).toEqual({ attributed: false, reason: "already_attributed" });
  });
});

describe("commission recording", () => {
  it("records one commission of 1960 cents for a $49 invoice, and nothing on a retry", async () => {
    const db = world();
    const first = await handlePartnerInvoicePaid(db, invoice());
    expect(first).toMatchObject({ created: true, commissionCents: 1960, product: "pro_monthly" });
    const retry = await handlePartnerInvoicePaid(db, invoice());
    expect(retry).toEqual({ created: false, reason: "duplicate" });
    expect(db.inserted.partner_commissions).toHaveLength(1);
    expect(db.inserted.partner_commissions[0]).toMatchObject({
      source_type: "invoice",
      stripe_object_id: "in_1",
      status: "pending",
      amount_collected_cents: 4900,
    });
  });

  it("records 18000 cents for the yearly plan and excludes tax", async () => {
    const db = world();
    const result = await handlePartnerInvoicePaid(
      db,
      invoice({
        id: "in_year",
        amount_paid: 45000,
        lines: { data: [{ price: { id: PRICE_ANNUAL_450, recurring: { interval: "year" } } }] },
      }),
    );
    expect(result).toMatchObject({ created: true, commissionCents: 18000, product: "pro_yearly" });
  });

  it("records nothing for a $0 invoice", async () => {
    const db = world();
    const result = await handlePartnerInvoicePaid(db, invoice({ id: "in_free", amount_paid: 0 }));
    expect(result).toEqual({ created: false, reason: "zero_amount" });
    expect(db.inserted.partner_commissions).toBeUndefined();
  });

  it("records nothing for a business with no partner", async () => {
    const db = world({ businesses: [{ ...business, partner_id: null }] });
    expect(await handlePartnerInvoicePaid(db, invoice())).toEqual({
      created: false,
      reason: "not_attributed",
    });
  });

  it("records nothing for a subscription-mode checkout, so nothing is counted twice", async () => {
    const db = world();
    const result = await handlePartnerCheckoutCompleted(
      db,
      { id: "cs_sub", mode: "subscription", customer: "cus_1", amount_total: 4900, currency: "usd" },
      [PRICE_MONTHLY_49],
    );
    expect(result).toEqual({ created: false, reason: "not_payment_mode" });
    expect(db.inserted.partner_commissions).toBeUndefined();
  });

  it("records 11880 cents for a payment-mode Launch Package checkout", async () => {
    const db = world();
    const result = await handlePartnerCheckoutCompleted(
      db,
      {
        id: "cs_launch",
        mode: "payment",
        payment_status: "paid",
        customer: "cus_1",
        amount_total: 29700,
        currency: "usd",
        payment_intent: "pi_1",
        created: 1_760_000_000,
      },
      [PRICE_LAUNCH_PACKAGE_297],
    );
    expect(result).toMatchObject({ created: true, commissionCents: 11880, product: "launch_package" });
    expect(db.inserted.partner_commissions[0]).toMatchObject({
      source_type: "checkout",
      stripe_object_id: "cs_launch",
    });
  });
});

describe("refunds and disputes", () => {
  const row = (status: string) => ({
    id: "com-1",
    partner_id: partner.id,
    status,
    commission_cents: 1960,
    amount_collected_cents: 4900,
    stripe_charge_id: "ch_1",
  });

  it("reverses a commission that has not been paid out yet", async () => {
    const db = world({ partner_commissions: [row("pending")] });
    const summary = await handlePartnerChargeReversal(db, {
      chargeIds: ["ch_1"],
      refundedCents: 4900,
      chargeAmountCents: 4900,
      reason: "refund",
    });
    expect(summary).toMatchObject({ reversed: 1, adjusted: 0 });
  });

  it("claws back 1960 cents through an adjustment once the commission is paid", async () => {
    const db = world({ partner_commissions: [row("paid")] });
    const summary = await handlePartnerChargeReversal(db, {
      chargeIds: ["ch_1"],
      refundedCents: 4900,
      chargeAmountCents: 4900,
      reason: "refund",
    });
    expect(summary).toMatchObject({ adjusted: 1, reversed: 0 });
    expect(db.inserted.partner_adjustments[0]).toMatchObject({
      partner_id: partner.id,
      amount_cents: -1960,
      commission_id: "com-1",
    });
  });

  it("reduces a payable commission proportionally for a partial refund", () => {
    const plan = reversalPlan({
      commission: row("payable"),
      refundedCents: 2450,
      chargeAmountCents: 4900,
      reason: "refund",
    });
    expect(plan).toMatchObject({ action: "reduce", commissionCents: 980 });
  });
});

describe("maturity", () => {
  it("holds a commission pending for 30 days, then makes it payable", () => {
    const paidAt = "2026-09-01T00:00:00Z";
    const payableAt = payableAtIso(paidAt);
    expect(payableAt).toBe("2026-10-01T00:00:00.000Z");
    const commission = { status: "pending", payable_at: payableAt };
    expect(isMature(commission, Date.parse("2026-09-29T00:00:00Z"))).toBe(false);
    expect(isMature(commission, Date.parse("2026-10-01T00:00:01Z"))).toBe(true);
    expect(isMature({ status: "paid", payable_at: payableAt }, Date.now())).toBe(false);
  });
});

describe("partner page copy", () => {
  const text = [
    JSON.stringify(frontConfig.PARTNER_COPY),
    JSON.stringify(frontConfig.PARTNER_EARNINGS),
    frontConfig.PARTNER_EARNINGS_NOTE,
    JSON.stringify(frontConfig.PARTNER_FAQS),
    JSON.stringify(frontConfig.PARTNER_HOW_IT_WORKS),
  ].join(" ");

  it("never promises income and never uses an em dash", () => {
    expect(text).not.toMatch(/guaranteed income/i);
    expect(text).not.toMatch(/make \$/i);
    expect(text).not.toContain("\u2014");
  });

  it("says plainly that there is no guaranteed income", () => {
    expect(frontConfig.PARTNER_EARNINGS_NOTE).toContain("no guaranteed income");
  });
});
