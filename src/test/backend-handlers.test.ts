import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNotificationWorker } from "../../supabase/functions/_shared/owner-notification-worker";
import { handlePaidInvoice, invoiceSubscriptionId, synchronizeOwnerSubscription } from "../../supabase/functions/_shared/billing-handlers";

// These exercise the imported production worker and billing handlers. Persistence
// and providers are adapters only; SQL role and ledger behavior is tested separately
// in PGlite. Truly overlapping database transactions are not verified here.
const ok = (data: unknown) => ({ data, error: null });
const failed = (message = "database unavailable") => ({ data: null, error: { message } });
type Query = { table: string; op: string; value?: unknown; filters: Record<string, unknown>; columns?: string };
function database(resolve: (query: Query) => unknown) {
  const queries: Query[] = [];
  return {
    queries,
    from: vi.fn((table: string) => {
      const q: Query = { table, op: "select", filters: {} };
      queries.push(q);
      const chain: any = {
        select: (columns: string) => { q.columns = columns; return chain; },
        update: (value: unknown) => { q.op = "update"; q.value = value; return chain; },
        insert: (value: unknown) => { q.op = "insert"; q.value = value; return chain; },
        eq: (key: string, value: unknown) => { q.filters[key] = value; return chain; },
        limit: () => chain,
        then: (yes: any, no: any) => Promise.resolve().then(() => resolve(q)).then(yes, no),
      };
      return chain;
    }),
    rpc: vi.fn(),
    auth: { admin: { getUserById: vi.fn() } },
  };
}
const job = { id: "job-1", business_id: "biz-1", lead_id: "lead-1", event: "new_lead", attempts: 1, claim_token: "lease-1" };
const credentials = { cronSecret: "fixture-cron-secret", serviceRoleKey: "fixture-service-key" };
const request = (headers: Record<string, string> = { "x-cron-secret": credentials.cronSecret }, method = "POST") =>
  new Request("https://example.test/notify-new-lead", { method, headers });
function workerFixture(options: { resolve?: (q: Query) => unknown; rpc?: (name: string, args: any) => unknown } = {}) {
  const db = database(options.resolve ?? ((q) => {
    if (q.table === "leads") return ok([{ id: "lead-1", business_id: "biz-1", lead_name: "Pat", lead_phone: "+16045550100", lead_need: "A roof", referrer_name: "Sam" }]);
    if (q.table === "businesses") return ok([{ id: "biz-1", name: "Test Business", user_id: "owner-1", business_email: "owner@example.test", is_demo: false }]);
    if (q.table === "notification_settings") return ok([]);
    if (q.table === "email_send_log" && q.op === "insert") return ok(null);
    throw new Error(`Unexpected query ${JSON.stringify(q)}`);
  }));
  db.rpc.mockImplementation(options.rpc ?? ((name) => {
    if (name === "fn_claim_notification_jobs") return ok([job]);
    if (name === "fn_ensure_lead_notification" || name === "fn_finish_notification_job") return ok(true);
    throw new Error(`Unexpected RPC ${name}`);
  }));
  const sendEmail = vi.fn().mockResolvedValue({ success: true, id: "provider-1" });
  const createClient = vi.fn(() => db);
  const handler = createNotificationWorker({ credentials, createClient, sendEmail, dashboardUrl: "https://example.test/dashboard", fromAddress: "notify@example.test", replyTo: "support@example.test" });
  return { db, sendEmail, createClient, handler };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network is forbidden in regression tests"); }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("actual notification HTTP worker", () => {
  it("rejects an unsigned forged service_role JWT before creating an admin client", async () => {
    const f = workerFixture();
    const forged = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from('{"role":"service_role"}').toString("base64url")}.forged`;
    expect((await f.handler(request({ Authorization: `Bearer ${forged}` }))).status).toBe(403);
    expect(f.createClient).not.toHaveBeenCalled();
  });
  it.each([{}, { "x-cron-secret": "wrong" }, { Authorization: "Bearer wrong" }])("rejects absent or wrong credentials: %j", async (headers) => {
    const f = workerFixture();
    expect((await f.handler(request(headers))).status).toBe(403);
    expect(f.db.rpc).not.toHaveBeenCalled();
  });
  it.each([{ "x-cron-secret": credentials.cronSecret }, { Authorization: `Bearer ${credentials.serviceRoleKey}` }])("accepts the configured credential and commits the exact claim token: %j", async (headers) => {
    const f = workerFixture();
    const response = await f.handler(request(headers));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ sent: 1, retry: 0, stale: 0 });
    expect(f.db.rpc).toHaveBeenCalledWith("fn_ensure_lead_notification", { p_job_id: "job-1", p_claim_token: "lease-1" });
    expect(f.db.rpc).toHaveBeenCalledWith("fn_finish_notification_job", { p_job_id: "job-1", p_claim_token: "lease-1", p_outcome: "sent", p_provider_message_id: "provider-1", p_error: null });
    expect(f.db.queries.some((q) => q.table === "notifications")).toBe(false);
    expect(f.db.queries.some((q) => q.table === "leads" && q.op === "update")).toBe(false);
  });
  it("fails closed when credentials are unconfigured", async () => {
    const createClient = vi.fn();
    const handler = createNotificationWorker({ credentials: { cronSecret: "", serviceRoleKey: "" }, createClient, sendEmail: vi.fn(), dashboardUrl: "", fromAddress: "", replyTo: "" });
    expect((await handler(request())).status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
  });
  it("rejects non-POST requests", async () => {
    const f = workerFixture();
    expect((await f.handler(request({}, "GET"))).status).toBe(405);
    expect(f.createClient).not.toHaveBeenCalled();
  });
  it("returns a retryable error when claims cannot be read", async () => {
    const f = workerFixture({ rpc: () => failed() });
    expect((await f.handler(request())).status).toBe(500);
    expect(f.sendEmail).not.toHaveBeenCalled();
  });
  it("rejects the old unfenced claim contract before delivery", async () => {
    const f = workerFixture({ rpc: () => ok([{ ...job, claim_token: null }]) });
    expect((await f.handler(request())).status).toBe(500);
    expect(f.sendEmail).not.toHaveBeenCalled();
  });
  it("does not send when the in-app transaction rejects a stale claim", async () => {
    const f = workerFixture({ rpc: (name) => name === "fn_claim_notification_jobs" ? ok([job]) : ok(false) });
    expect(await (await f.handler(request())).json()).toMatchObject({ sent: 0, stale: 1 });
    expect(f.sendEmail).not.toHaveBeenCalled();
    expect(f.db.rpc.mock.calls.some(([name]) => name === "fn_finish_notification_job")).toBe(false);
  });
  it.each([{ success: false, error: "provider unavailable" }, { success: true }, { success: true, id: "   " }])("retries a provider result without delivery evidence: %j", async (providerResult) => {
    const f = workerFixture(); f.sendEmail.mockResolvedValue(providerResult);
    expect(await (await f.handler(request())).json()).toMatchObject({ sent: 0, retry: 1 });
    expect(f.db.rpc).toHaveBeenCalledWith("fn_finish_notification_job", expect.objectContaining({ p_claim_token: "lease-1", p_outcome: "retry", p_provider_message_id: null }));
  });
  it("uses the same provider idempotency key after failure and a new lease", async () => {
    const f = workerFixture();
    f.sendEmail.mockResolvedValueOnce({ success: false, error: "provider unavailable" });
    await f.handler(request());
    f.db.rpc.mockImplementation((name) => name === "fn_claim_notification_jobs" ? ok([{ ...job, attempts: 2, claim_token: "lease-2" }]) : ok(true));
    await f.handler(request());
    expect(f.sendEmail).toHaveBeenCalledTimes(2);
    expect(f.sendEmail.mock.calls.map(([params]) => params.idempotencyKey)).toEqual(["new-lead-lead-1", "new-lead-lead-1"]);
    expect(f.db.rpc).toHaveBeenCalledWith("fn_ensure_lead_notification", { p_job_id: "job-1", p_claim_token: "lease-2" });
  });
  it("does not send if settings could not be read", async () => {
    const resolve = (q: Query) => q.table === "notification_settings" ? failed("settings unavailable") :
      q.table === "leads" ? ok([{ id: "lead-1" }]) : q.table === "businesses" ? ok([{ id: "biz-1", business_email: "owner@example.test" }]) : ok(null);
    const f = workerFixture({ resolve });
    expect(await (await f.handler(request())).json()).toMatchObject({ retry: 1, sent: 0 });
    expect(f.sendEmail).not.toHaveBeenCalled();
  });
  it("does not claim a send succeeded after a stale finish result", async () => {
    const f = workerFixture({ rpc: (name) => name === "fn_claim_notification_jobs" ? ok([job]) : ok(name !== "fn_finish_notification_job") });
    expect(await (await f.handler(request())).json()).toMatchObject({ sent: 0, stale: 1 });
  });
  it("returns 500 when the delivery result could not be persisted", async () => {
    const f = workerFixture({ rpc: (name) => name === "fn_claim_notification_jobs" ? ok([job]) : name === "fn_finish_notification_job" ? failed() : ok(true) });
    const response = await f.handler(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ sent: 0, finish_errors: 1 });
  });
});

const invoice = { status: "paid", id: "in_1", parent: { subscription_details: { subscription: "sub_1" } }, customer: "cus_1", amount_paid: 4900, currency: "usd", billing_reason: "subscription_cycle", status_transitions: { paid_at: 1788800000 }, created: 1788799990 };
const subscription = { id: "sub_1", customer: "cus_1", status: "active", items: { data: [{ current_period_end: 1791400000 }] }, metadata: { user_id: "owner-1" } };
function billingFixture(overrides: { status?: string; business?: unknown; paid?: unknown; update?: unknown; rpc?: unknown } = {}) {
  const db = database((q) => {
    if (q.table === "businesses" && q.op === "select") return overrides.business ?? ok([{ id: "biz-1", stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1" }]);
    if (q.table === "businesses" && q.op === "update") return overrides.update ?? ok([{ id: "biz-1" }]);
    if (q.table === "stripe_payments") return overrides.paid ?? ok([]);
    throw new Error(`Unexpected query ${JSON.stringify(q)}`);
  });
  db.rpc.mockResolvedValue(overrides.rpc ?? ok({ id: "payment-1", duplicate: false, collected: true, kind: "first_payment" }));
  const stripe = { subscriptions: { retrieve: vi.fn().mockResolvedValue({ ...subscription, status: overrides.status ?? "active" }), list: vi.fn() }, customers: { list: vi.fn() } };
  return { db, stripe };
}

describe("actual paid-invoice handler", () => {
  it("supports current and legacy subscription references", () => {
    expect(invoiceSubscriptionId(invoice)).toBe("sub_1");
    expect(invoiceSubscriptionId({ subscription: { id: "sub_old" } })).toBe("sub_old");
    expect(invoiceSubscriptionId({ subscription: "sub_old" })).toBe("sub_old");
    expect(invoiceSubscriptionId({})).toBeNull();
  });
  it("records authoritative facts through the atomic SQL contract without a prior-payment SELECT", async () => {
    const f = billingFixture();
    expect(await handlePaidInvoice(f.db, f.stripe, invoice)).toMatchObject({ kind: "first_payment", duplicate: false });
    expect(f.db.rpc).toHaveBeenCalledWith("fn_record_stripe_payment", { p_invoice_id: "in_1", p_subscription_id: "sub_1", p_customer_id: "cus_1", p_business_id: "biz-1", p_amount_paid_cents: 4900, p_currency: "USD", p_billing_reason: "subscription_cycle", p_paid_at: new Date(1788800000 * 1000).toISOString() });
    expect(f.db.queries.some((q) => q.table === "stripe_payments")).toBe(false);
  });
  it("keeps a zero-charge trial trialing and uses the ledger's neutral no_charge classification", async () => {
    const f = billingFixture({ status: "trialing", rpc: ok({ id: "payment-1", duplicate: false, collected: false, kind: "no_charge" }) });
    expect(await handlePaidInvoice(f.db, f.stripe, { ...invoice, amount_paid: 0 })).toMatchObject({ collected: false, kind: "no_charge" });
    expect(f.db.queries.find((q) => q.op === "update")?.value).toMatchObject({ subscription_status: "trialing" });
    expect(f.db.rpc.mock.calls[0][1]).toMatchObject({ p_amount_paid_cents: 0 });
  });
  it("does not reactivate a canceled subscription when an old paid invoice is replayed", async () => {
    const f = billingFixture({ status: "canceled", rpc: ok({ id: "payment-1", duplicate: true, collected: true, kind: "first_payment" }) });
    expect(await handlePaidInvoice(f.db, f.stripe, invoice)).toMatchObject({ duplicate: true });
    const patch = f.db.queries.find((q) => q.op === "update")?.value;
    expect(patch).toMatchObject({ subscription_status: "canceled" });
    expect(patch).not.toHaveProperty("account_status");
    expect(patch).not.toHaveProperty("dunning_notified_at");
  });
  it.each([failed(), ok([]), ok([{ id: "one" }, { id: "two" }])])("requires an unambiguous persisted business link: %j", async (business) => {
    const f = billingFixture({ business });
    await expect(handlePaidInvoice(f.db, f.stripe, invoice)).rejects.toThrow();
    expect(f.db.rpc).not.toHaveBeenCalled();
  });
  it.each([failed(), ok([])])("fails for a required business write failure: %j", async (update) => {
    const f = billingFixture({ update });
    await expect(handlePaidInvoice(f.db, f.stripe, invoice)).rejects.toThrow(/billing update/i);
    expect(f.db.rpc).not.toHaveBeenCalled();
  });
  it.each([failed(), ok(null)])("fails if the payment transaction is not confirmed: %j", async (rpc) => {
    const f = billingFixture({ rpc });
    await expect(handlePaidInvoice(f.db, f.stripe, invoice)).rejects.toThrow(/Payment/);
  });
  it("ignores a one-off invoice without creating billing state", async () => {
    const f = billingFixture();
    expect(await handlePaidInvoice(f.db, f.stripe, { id: "one-off", status: "paid" })).toBeNull();
    expect(f.db.from).not.toHaveBeenCalled();
    expect(f.stripe.subscriptions.retrieve).not.toHaveBeenCalled();
  });
  it("requires a paid invoice and excludes out-of-band settlement", async () => {
    const f = billingFixture();
    await expect(handlePaidInvoice(f.db, f.stripe, { ...invoice, status: "open" })).rejects.toThrow(/paid invoice/);
    expect(await handlePaidInvoice(f.db, f.stripe, { ...invoice, paid_out_of_band: true })).toBeNull();
    expect(f.db.rpc).not.toHaveBeenCalled();
  });
  it.each([
    { account_status: "suspended", is_disabled: false },
    { account_status: "rejected", is_disabled: false },
    { account_status: "pending_approval", is_disabled: true },
  ])("preserves administrative account controls during payment: %j", async (account) => {
    const state = { id: "biz-1", ...account };
    const db = database((q) => {
      if (q.op === "select") return ok([state]);
      if (q.op === "update") {
        if (Object.entries(q.filters).every(([key, value]) => state[key as keyof typeof state] === value)) {
          Object.assign(state, q.value); return ok([{ id: state.id }]);
        }
        return ok([]);
      }
      throw new Error("Unexpected query");
    });
    db.rpc.mockResolvedValue(ok({ id: "payment-1", duplicate: false, collected: true, kind: "first_payment" }));
    const { stripe } = billingFixture();
    await handlePaidInvoice(db, stripe, invoice);
    expect(state).toMatchObject(account);
    expect(state).toHaveProperty("subscription_status", "active");
  });
  it("only approves a pending, non-disabled account", async () => {
    const f = billingFixture();
    await handlePaidInvoice(f.db, f.stripe, invoice);
    const approval = f.db.queries.find((q) => q.op === "update" && (q.value as any).account_status);
    expect(approval?.filters).toEqual({ id: "biz-1", account_status: "pending_approval", is_disabled: false });
    expect(f.db.queries.find((q) => q.op === "update")?.value).not.toHaveProperty("account_status");
  });
  it("does not write malformed invoice money", async () => {
    const f = billingFixture();
    await expect(handlePaidInvoice(f.db, f.stripe, { ...invoice, amount_paid: 1.5 })).rejects.toThrow(/invalid/);
    expect(f.db.rpc).not.toHaveBeenCalled();
  });
});

describe("actual owner billing synchronization", () => {
  it("uses the stored subscription, returns trial access separately from money, and updates period end", async () => {
    const f = billingFixture({ status: "trialing" });
    const status = await synchronizeOwnerSubscription(f.db, f.stripe, { id: "owner-1", email: "owner@example.test" });
    expect(status).toMatchObject({ subscription_status: "trialing", has_access: true, collected_payment: false, subscription_id: "sub_1", current_period_end: new Date(1791400000 * 1000).toISOString() });
    expect(f.stripe.customers.list).not.toHaveBeenCalled();
    expect(f.db.queries.find((q) => q.op === "update")?.value).toMatchObject({ current_period_end: status.current_period_end });
  });
  it("reports collected money only when the ledger says so", async () => {
    const f = billingFixture({ status: "canceled", paid: ok([{ id: "payment-1" }]) });
    expect(await synchronizeOwnerSubscription(f.db, f.stripe, { id: "owner-1" })).toMatchObject({ has_access: false, collected_payment: true, subscription_status: "canceled" });
  });
  it.each(["business", "paid", "update"] as const)("does not turn a %s database error into a success/zero report", async (key) => {
    const f = billingFixture({ [key]: failed() });
    await expect(synchronizeOwnerSubscription(f.db, f.stripe, { id: "owner-1" })).rejects.toThrow();
  });
  it("rejects a linked customer mismatch", async () => {
    const f = billingFixture();
    f.stripe.subscriptions.retrieve.mockResolvedValue({ ...subscription, customer: "cus_other" });
    await expect(synchronizeOwnerSubscription(f.db, f.stripe, { id: "owner-1" })).rejects.toThrow(/mismatch/);
    expect(f.db.queries.some((q) => q.op === "update")).toBe(false);
  });
  it("does not link someone else's subscription based only on a matching email", async () => {
    const f = billingFixture({ business: ok([{ id: "biz-1" }]) });
    f.stripe.customers.list.mockResolvedValue({ data: [{ id: "cus_other" }] });
    f.stripe.subscriptions.list.mockResolvedValue({ data: [{ ...subscription, metadata: { user_id: "other-owner" } }] });
    expect(await synchronizeOwnerSubscription(f.db, f.stripe, { id: "owner-1", email: "shared@example.test" })).toMatchObject({ subscription_status: "none", subscription_id: null, has_access: false });
  });
  it("recovers an unlinked checkout only when provider metadata names the authenticated owner", async () => {
    const f = billingFixture({ business: ok([{ id: "biz-1" }]) });
    f.stripe.customers.list.mockResolvedValue({ data: [{ id: "cus_1" }] });
    f.stripe.subscriptions.list.mockResolvedValue({ data: [subscription] });
    expect(await synchronizeOwnerSubscription(f.db, f.stripe, { id: "owner-1", email: "owner@example.test" })).toMatchObject({ subscription_id: "sub_1", customer_id: "cus_1" });
  });
});
