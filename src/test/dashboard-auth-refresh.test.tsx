import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";

const h = vi.hoisted(() => ({
  user: { id: "owner-1" },
  reads: vi.fn(),
  updates: vi.fn(),
  hold: false,
  finish: undefined as (() => void) | undefined,
}));
const business = {
  id: "business-1", name: "Test Floors", slug: "test-floors", plan: "free",
  is_published: true, is_disabled: false, offer_amount: "$100", phone: "5551234567",
  logo_url: null, subscription_status: null, contact_outreach_consent_at: "2026-11-01",
};
const lead = {
  id: "lead-1", created_at: "2026-11-13", lead_name: "Test Customer", lead_phone: "5557654321",
  referrer_name: "Test Referrer", referrer_email: "referrer@example.test", lead_need: "Flooring", status: "new", notes: "",
};
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: h.user }) }));
vi.mock("@/lib/effectivePlan", () => ({ loadEffectivePlan: async () => "free", trialDaysLeft: () => 0 }));
vi.mock("@/lib/track", () => ({ track: vi.fn() }));
vi.mock("@/lib/appInstalled", () => ({ watchAppInstalled: () => () => {} }));
vi.mock("@/components/dashboard/DashboardShell", () => ({ default: ({ children }: { children: ReactNode }) => <><nav aria-label="Dashboard">Dashboard nav</nav>{children}</> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const result = async () => {
      h.reads(table);
      if (table === "businesses" && h.hold) await new Promise<void>((resolve) => { h.finish = resolve; });
      return { data: table === "businesses" ? [business] : table === "leads" ? [lead] : [], error: null };
    };
    const query = { select: () => query, eq: () => query, order: () => query, limit: result, then: (resolve: (value: unknown) => unknown) => result().then(resolve) };
    return { ...query, update: (patch: unknown) => ({ eq: async () => { h.updates(table, patch); return { error: null }; } }) };
  }, functions: { invoke: vi.fn(async () => ({ data: {}, error: null })) },
} }));

import BusinessDashboard from "@/pages/dashboard/BusinessDashboard";

beforeEach(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); h.reads.mockClear(); h.updates.mockClear(); h.hold = false; h.finish = undefined; });
const view = () => <MemoryRouter initialEntries={["/dashboard?tab=leads"]}><BusinessDashboard /></MemoryRouter>;

describe("dashboard refresh stability", () => {
  it("keeps navigation, lead rows and an open status dropdown on same-user events", async () => {
    const { container, rerender } = render(view());
    expect(container.querySelector(".animate-spin")).toBeTruthy();
    await screen.findByText("Test Customer");
    const nav = screen.getByRole("navigation", { name: "Dashboard", hidden: true });
    const row = screen.getByText("Test Customer").closest("tr");
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    await screen.findByRole("listbox");
    const reads = h.reads.mock.calls.length;
    for (const event of ["TOKEN_REFRESHED", "SIGNED_IN"]) {
      h.user = { ...h.user };
      await act(async () => { rerender(view()); });
      expect(screen.getByRole("navigation", { name: "Dashboard", hidden: true })).toBe(nav);
      expect(screen.getByText("Test Customer").closest("tr")).toBe(row);
      expect(screen.getByRole("listbox")).toBeVisible();
      expect(container.querySelector(".animate-spin")).toBeNull();
    }
    expect(h.reads).toHaveBeenCalledTimes(reads);
  });

  it("keeps the loaded UI and unsaved notes mounted during a real background reload", async () => {
    const { container } = render(view());
    await screen.findByText("Test Customer");
    const nav = screen.getByRole("navigation", { name: "Dashboard", hidden: true });
    fireEvent.click(screen.getByRole("button", { name: /details/i }));
    const notes = screen.getByRole("textbox");
    fireEvent.change(notes, { target: { value: "Unsaved note" } });
    h.hold = true;
    fireEvent.click(screen.getByRole("button", { name: /save notes/i }));
    await waitFor(() => expect(h.finish).toBeTypeOf("function"));
    expect(screen.getByRole("navigation", { name: "Dashboard", hidden: true })).toBe(nav);
    expect(notes).toHaveValue("Unsaved note");
    expect(container.querySelector(".animate-spin")).toBeNull();
    await act(async () => { h.finish?.(); });
    expect(screen.getByRole("textbox")).toBe(notes);
    expect(notes).toHaveValue("Unsaved note");
  });
});


describe("won lead value prompt", () => {
  const closeWon = async () => {
    await screen.findByText("Test Customer");
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Closed Won" }));
    return screen.findByLabelText("What was this job worth? (optional)");
  };
  it("saves the status immediately, then saves the optional value to deal_value", async () => {
    render(view());
    const input = await closeWon();
    expect(h.updates).toHaveBeenCalledWith("leads", { status: "closed_won" });
    fireEvent.change(input, { target: { value: "1500" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
    await waitFor(() => expect(h.updates).toHaveBeenCalledWith("leads", { deal_value: 1500 }));
    await waitFor(() => expect(screen.queryByLabelText("What was this job worth? (optional)")).toBeNull());
  });
  it("Skip dismisses the prompt without writing a job value", async () => {
    render(view());
    await closeWon();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.queryByLabelText("What was this job worth? (optional)")).toBeNull();
    expect(h.updates.mock.calls).toEqual([["leads", { status: "closed_won" }]]);
  });
});
