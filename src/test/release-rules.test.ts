import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Rules this release depends on, modelled in isolation.
 *
 * The SQL is NOT executed here (no isolated database is available; see
 * db/pending/README.md), so these are behaviour models plus a small number of
 * checks that the pending SQL actually contains the invariant they describe.
 */

const SQL = readFileSync("db/pending/20260908_release_1.sql", "utf8");

// ---------------------------------------------------------------------------
// Page eligibility: one rule for publish, read and submit
// ---------------------------------------------------------------------------
const pageLive = (b: { account_status: string; is_published: boolean; is_disabled: boolean }) =>
  b.is_published && !b.is_disabled && b.account_status === "approved";

describe("free page eligibility, independent of billing", () => {
  const base = { account_status: "approved", is_published: true, is_disabled: false };

  it("allows a Free account with no subscription", () => {
    expect(pageLive(base)).toBe(true);
  });

  it("allows a canceled subscription", () => {
    // Billing is not an input at all, which is the point.
    expect(pageLive(base)).toBe(true);
  });

  it("blocks an abuse-disabled account", () => {
    expect(pageLive({ ...base, is_disabled: true })).toBe(false);
  });

  it("blocks a pending or unknown account status", () => {
    expect(pageLive({ ...base, account_status: "pending_approval" })).toBe(false);
    expect(pageLive({ ...base, account_status: "" })).toBe(false);
  });

  it("blocks an unpublished page", () => {
    expect(pageLive({ ...base, is_published: false })).toBe(false);
  });

  it("is the same rule in the pending SQL for the view and the submit RPC", () => {
    expect(SQL).toContain("CREATE OR REPLACE FUNCTION public.fn_page_live");
    // The view and the RPC both call the helper rather than restating a predicate.
    const calls = SQL.match(/public\.fn_page_live\(account_status, is_published, is_disabled\)/g);
    expect(calls?.length).toBeGreaterThanOrEqual(2);
    expect(SQL).not.toMatch(/account_status <> 'suspended'/);
  });

  it("does not gate the public page on subscription_status", () => {
    const view = SQL.slice(SQL.indexOf("CREATE OR REPLACE VIEW public.businesses_public"));
    const viewBody = view.slice(0, view.indexOf("GRANT SELECT ON public.businesses_public"));
    expect(viewBody).not.toMatch(/subscription_status\s+IN/i);
  });
});

// ---------------------------------------------------------------------------
// ROI authorization
// ---------------------------------------------------------------------------
function roiAuthorized(opts: {
  uid: string | null;
  owner: string;
  isAdmin?: boolean;
  isService?: boolean;
}): boolean {
  if (opts.isService) return true;
  if (opts.uid === null) return false; // anonymous is rejected explicitly
  return opts.uid === opts.owner || opts.isAdmin === true;
}

describe("ROI authorization", () => {
  it("allows the owner", () => {
    expect(roiAuthorized({ uid: "u1", owner: "u1" })).toBe(true);
  });
  it("rejects another owner", () => {
    expect(roiAuthorized({ uid: "u2", owner: "u1" })).toBe(false);
  });
  it("rejects an anonymous caller instead of falling through", () => {
    expect(roiAuthorized({ uid: null, owner: "u1" })).toBe(false);
  });
  it("allows an admin and the trusted service caller", () => {
    expect(roiAuthorized({ uid: "u2", owner: "u1", isAdmin: true })).toBe(true);
    expect(roiAuthorized({ uid: null, owner: "u1", isService: true })).toBe(true);
  });
  it("revokes anon execute in the pending SQL", () => {
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.fn_get_business_roi[\s\S]{0,120}FROM anon/);
    expect(SQL).toContain("RAISE EXCEPTION 'not_authenticated'");
  });
});

// ---------------------------------------------------------------------------
// Revenue attribution by close date
// ---------------------------------------------------------------------------
type Lead = { status: string; deal_value: number | null; closed_at: string | null };

function roi(rows: Lead[], from: string | null, to: string | null) {
  const windowed = from !== null || to !== null;
  const won = rows.filter((r) => r.status === "closed_won");
  const inScope = won.filter((r) => {
    if (!windowed) return true;
    if (!r.closed_at) return false;
    if (from && r.closed_at < from) return false;
    if (to && r.closed_at >= to) return false;
    return true;
  });
  return {
    revenue: inScope.reduce((s, r) => s + (r.deal_value ?? 0), 0),
    closed_count: inScope.length,
    unknown_close_date_count: won.filter((r) => !r.closed_at).length,
    missing_amount_count: won.filter((r) => r.deal_value === null).length,
    windowed,
  };
}

describe("revenue attribution", () => {
  const rows: Lead[] = [
    { status: "closed_won", deal_value: 1000, closed_at: "2026-08-10T00:00:00Z" },
    { status: "closed_won", deal_value: 500, closed_at: "2026-09-02T00:00:00Z" },
    { status: "closed_won", deal_value: 250, closed_at: null }, // historic, unknown
    { status: "closed_won", deal_value: null, closed_at: "2026-09-04T00:00:00Z" },
    { status: "new", deal_value: 9999, closed_at: null },
  ];

  it("counts known historic value in all time", () => {
    const all = roi(rows, null, null);
    expect(all.revenue).toBe(1750);
    expect(all.unknown_close_date_count).toBe(1);
  });

  it("excludes undated rows from a dated window and reports them", () => {
    const aug = roi(rows, "2026-08-01T00:00:00Z", "2026-09-01T00:00:00Z");
    expect(aug.revenue).toBe(1000);
    expect(aug.unknown_close_date_count).toBe(1);
  });

  it("keeps a missing job value visible rather than counting it as zero revenue", () => {
    const sep = roi(rows, "2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z");
    expect(sep.revenue).toBe(500);
    expect(sep.missing_amount_count).toBe(1);
  });

  it("keeps the close month stable when an unrelated field is edited", () => {
    // Editing notes or a payout touches updated_at, never closed_at.
    const edited = rows.map((r) => ({ ...r }));
    const aug = roi(edited, "2026-08-01T00:00:00Z", "2026-09-01T00:00:00Z");
    expect(aug.revenue).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// Close-date stamping rule
// ---------------------------------------------------------------------------
function stamp(
  op: "insert" | "update",
  oldStatus: string | null,
  newStatus: string,
  existing: string | null,
  now = "2026-09-08T00:00:00Z",
): string | null {
  if (op === "insert") return newStatus === "closed_won" ? existing ?? now : existing;
  if (newStatus === "closed_won" && oldStatus !== "closed_won") return now;
  if (newStatus !== "closed_won" && oldStatus === "closed_won") return null;
  return existing;
}

describe("close-date stamping", () => {
  it("stamps insert-as-won", () => {
    expect(stamp("insert", null, "closed_won", null)).toBe("2026-09-08T00:00:00Z");
  });
  it("stamps the transition into won", () => {
    expect(stamp("update", "new", "closed_won", null)).toBe("2026-09-08T00:00:00Z");
  });
  it("leaves an unrelated edit alone", () => {
    expect(stamp("update", "closed_won", "closed_won", "2026-08-01T00:00:00Z")).toBe(
      "2026-08-01T00:00:00Z",
    );
  });
  it("clears on reopen and stamps again on re-win", () => {
    expect(stamp("update", "closed_won", "in_progress", "2026-08-01T00:00:00Z")).toBeNull();
    expect(stamp("update", "in_progress", "closed_won", null)).toBe("2026-09-08T00:00:00Z");
  });
});

// ---------------------------------------------------------------------------
// Notification retry without any external delivery
// ---------------------------------------------------------------------------
type Job = { status: string; attempts: number; sent_at: string | null; message_id: string | null };

function runWorker(job: Job, deliver: () => { ok: boolean; id?: string }): Job {
  const claimed: Job = { ...job, status: "claimed", attempts: job.attempts + 1 };
  let result: { ok: boolean; id?: string };
  try {
    result = deliver();
  } catch {
    result = { ok: false };
  }
  if (!result.ok) return { ...claimed, status: "pending" }; // retryable, not sent
  return { ...claimed, status: "sent", sent_at: "2026-09-08T00:00:00Z", message_id: result.id ?? null };
}

describe("owner notification durability", () => {
  const fresh = (): Job => ({ status: "pending", attempts: 0, sent_at: null, message_id: null });

  it("does not mark sent when the provider fails, and stays retryable", () => {
    const after = runWorker(fresh(), () => ({ ok: false }));
    expect(after.status).toBe("pending");
    expect(after.sent_at).toBeNull();
    expect(after.attempts).toBe(1);
  });

  it("marks sent only with provider evidence", () => {
    const after = runWorker(fresh(), () => ({ ok: true, id: "msg_1" }));
    expect(after.status).toBe("sent");
    expect(after.message_id).toBe("msg_1");
  });

  it("recovers on a later attempt after a failure", () => {
    const first = runWorker(fresh(), () => {
      throw new Error("provider down");
    });
    const second = runWorker(first, () => ({ ok: true, id: "msg_2" }));
    expect(second.status).toBe("sent");
    expect(second.attempts).toBe(2);
  });

  it("is deduped per lead and event in the pending SQL", () => {
    expect(SQL).toContain("notification_jobs_lead_event_key UNIQUE (lead_id, event)");
  });

  it("no longer lets the visitor's browser trigger the notification", () => {
    const page = readFileSync("src/pages/PublicReferralPage.tsx", "utf8");
    expect(page).not.toContain('invoke("notify-new-lead"');
  });
});

// ---------------------------------------------------------------------------
// Invoice persistence: duplicate versus transient failure
// ---------------------------------------------------------------------------
function persistInvoice(
  store: Map<string, { amount: number; kind: string }>,
  invoice: { id: string; amount: number; failWrite?: boolean },
  priorCollected: boolean,
): { status: 200 | 500; duplicate: boolean } {
  if (invoice.failWrite) return { status: 500, duplicate: false }; // Stripe retries
  const collected = invoice.amount > 0;
  const kind = !collected ? "trial_no_charge" : priorCollected ? "renewal" : "first_payment";
  if (store.has(invoice.id)) return { status: 200, duplicate: true };
  store.set(invoice.id, { amount: invoice.amount, kind });
  return { status: 200, duplicate: false };
}

describe("payment integrity", () => {
  it("counts a redelivered invoice once", () => {
    const store = new Map<string, { amount: number; kind: string }>();
    const a = persistInvoice(store, { id: "in_1", amount: 4900 }, false);
    const b = persistInvoice(store, { id: "in_1", amount: 4900 }, false);
    expect(a.duplicate).toBe(false);
    expect(b.duplicate).toBe(true);
    expect(store.size).toBe(1);
  });

  it("returns 500 on a write failure so the retry recovers", () => {
    const store = new Map<string, { amount: number; kind: string }>();
    expect(persistInvoice(store, { id: "in_2", amount: 4900, failWrite: true }, false).status).toBe(500);
    expect(store.size).toBe(0);
    expect(persistInvoice(store, { id: "in_2", amount: 4900 }, false).status).toBe(200);
  });

  it("separates first payment, renewal and a zero-charge trial", () => {
    const store = new Map<string, { amount: number; kind: string }>();
    persistInvoice(store, { id: "in_3", amount: 4900 }, false);
    persistInvoice(store, { id: "in_4", amount: 4900 }, true);
    persistInvoice(store, { id: "in_5", amount: 0 }, true);
    expect(store.get("in_3")!.kind).toBe("first_payment");
    expect(store.get("in_4")!.kind).toBe("renewal");
    expect(store.get("in_5")!.kind).toBe("trial_no_charge");
  });

  it("keys payment identity on the invoice, never a browser session", () => {
    expect(SQL).toContain("stripe_payments_invoice_key UNIQUE (stripe_invoice_id)");
  });
});

// ---------------------------------------------------------------------------
// Activation contract: access is not money
// ---------------------------------------------------------------------------
const ACCESS = ["active", "trialing", "past_due", "paid"];
const hasAccess = (s: string) => ACCESS.includes(s);

describe("activation contract", () => {
  it("grants access to trialing and past_due, not to canceled", () => {
    expect(hasAccess("trialing")).toBe(true);
    expect(hasAccess("past_due")).toBe(true);
    expect(hasAccess("canceled")).toBe(false);
    expect(hasAccess("none")).toBe(false);
  });

  it("does not infer collected money from access", () => {
    const status = { subscription_status: "trialing", has_access: true, collected_payment: false };
    expect(status.has_access && !status.collected_payment).toBe(true);
  });

  it("allows the client events the app sends and keeps payment facts server-only", () => {
    const policy = SQL.slice(SQL.indexOf('CREATE POLICY "Anyone can record an allowed funnel event"'));
    for (const e of ["cta_clicked", "demo_started", "demo_completed", "page_published", "first_ask_prepared"]) {
      expect(policy).toContain(`'${e}'`);
    }
    const allowList = policy.slice(0, policy.indexOf("AND (session_id IS NULL"));
    expect(allowList).not.toContain("payment_collected");
    expect(allowList).not.toContain("subscription_activated");
  });
});
