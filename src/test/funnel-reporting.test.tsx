import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";

const fixture = vi.hoisted(() => ({ rows: [] as any[], payments: [] as any[], paymentError: null as unknown, activityCount: undefined as number | null | undefined, paymentCount: undefined as number | null | undefined }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    if (!["funnel_events_human", "funnel_events", "stripe_payments"].includes(table)) throw new Error(`Unexpected table: ${table}`);
    const chain: any = {
      select: () => chain, eq: () => chain, gte: () => chain, limit: () => chain,
      then: (resolve: any, reject: any) => Promise.resolve(table === "stripe_payments"
        ? { data: fixture.payments, error: fixture.paymentError, count: fixture.paymentCount === undefined ? fixture.payments.length : fixture.paymentCount }
        : { data: fixture.rows, error: null, count: fixture.activityCount === undefined ? fixture.rows.length : fixture.activityCount }).then(resolve, reject),
    };
    return chain;
  },
} }));
import FunnelPanel from "@/components/admin/FunnelPanel";

beforeEach(() => {
  fixture.rows = []; fixture.payments = []; fixture.paymentError = null;
  fixture.activityCount = undefined; fixture.paymentCount = undefined;
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network is forbidden in reporting tests"); }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const row = (event: string, session: string, meta: Record<string, unknown>) => ({ event, session_id: session, created_at: new Date().toISOString(), meta });

describe("actual public activity reporting", () => {
  it("keeps demo insight separate from marketing and excludes unsupported/legacy rows", async () => {
    fixture.rows = [
      row("page_viewed", "marketing-1", { traffic: "marketing", is_demo: false }),
      row("demo_completed", "demo-1", { traffic: "demo", is_demo: true }),
      row("page_viewed", "referral-1", { traffic: "referral", is_demo: false }),
      row("page_viewed", "bad-demo", { traffic: "marketing", is_demo: true }),
      row("page_viewed", "old", {}),
      row("signup_succeeded", "old-signup", { traffic: "marketing" }),
      row("page_viewed", "server_test", { traffic: "marketing" }),
    ];
    render(<FunnelPanel />);
    await screen.findByText(/0 new paying businesses, 0 renewals/);
    const cells = (label: string) => within(screen.getByText(label).closest("tr")!).getAllByRole("cell").map(c => c.textContent);
    expect(cells("Page views")).toEqual(["Page views", "1 / 1", "0 / 0", "1 / 1"]);
    expect(cells("Demo completions")).toEqual(["Demo completions", "0 / 0", "1 / 1", "0 / 0"]);
    expect(cells("Unique sessions")).toEqual(["Unique sessions", "1 / 1", "1 / 1", "1 / 1"]);
    expect(screen.queryByText("Signup succeeded")).not.toBeInTheDocument();
    expect(screen.getByText(/Signup, account and activation browser measurements are unavailable/)).toBeInTheDocument();
  });
  it("shows unavailable money as a reporting error instead of a false zero", async () => {
    fixture.paymentError = { message: "ledger unavailable" };
    render(<FunnelPanel />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Collected payments could not be loaded"));
    expect(screen.queryByText(/0 new paying businesses/)).not.toBeInTheDocument();
  });
  it("warns when server row caps make both activity and payment counts partial", async () => {
    fixture.rows = [row("page_viewed", "one", { traffic: "marketing" })];
    fixture.payments = [{ kind: "first_payment" }];
    fixture.activityCount = 1001; fixture.paymentCount = 1200;
    render(<FunnelPanel />);
    expect(await screen.findByText(/Partial activity results: 1 of 1001/)).toBeInTheDocument();
    expect(screen.getByText(/Partial payment results: 1 of 1200/)).toBeInTheDocument();
  });
  it("does not claim completeness when exact counts are unavailable", async () => {
    fixture.activityCount = null; fixture.paymentCount = null;
    render(<FunnelPanel />);
    expect(await screen.findByText(/Activity completeness could not be verified/)).toBeInTheDocument();
    expect(screen.getByText(/Payment completeness could not be verified/)).toBeInTheDocument();
  });
  it("reports first payments and renewals independently of browser rows", async () => {
    fixture.payments = [{ kind: "first_payment" }, { kind: "renewal" }, { kind: "renewal" }];
    render(<FunnelPanel />);
    expect(await screen.findByText(/1 new paying business, 2 renewals/)).toBeInTheDocument();
    expect(within(screen.getByText("Unique sessions").closest("tr")!).getAllByRole("cell").map(c => c.textContent)).toEqual(["Unique sessions", "0 / 0", "0 / 0", "0 / 0"]);
  });
});
