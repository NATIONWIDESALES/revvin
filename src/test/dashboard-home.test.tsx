import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { computeStats, leadsToCall, nextStep, resolveTab, setupDone, type SetupState } from "@/lib/dashboardHome";

vi.mock("@/integrations/supabase/client", () => {
  const chain: any = { select: () => chain, eq: () => Promise.resolve({ data: [] }) };
  return { supabase: { from: () => chain, rpc: () => Promise.resolve({ data: [] }) } };
});

import HomeView from "@/components/dashboard/HomeView";
import DashboardShell from "@/components/dashboard/DashboardShell";

const base: SetupState = { isLive: true, customersTotal: 12, customersSent: 3, customersPending: 9, qrDownloaded: true, hasReviewLink: true };

describe("next step mapping", () => {
  it.each([
    [{ isLive: false }, "publish", "Publish your page"],
    [{ customersTotal: 0, customersSent: 0, customersPending: 0 }, "import", "Add your last 10 customers"],
    [{ customersSent: 0 }, "ask", "Ask your last 10 customers"],
    [{ qrDownloaded: false }, "qr", "Put your QR on every invoice"],
    [{ hasReviewLink: false }, "review", "Add your Google review link"],
    [{}, "ask_more", "Ask 10 more customers"],
    [{ customersPending: 0 }, "share_again", "Share your page link again"],
  ])("%o -> %s", (over, key, button) => {
    const s = nextStep({ ...base, ...over });
    expect(s.key).toBe(key);
    expect(s.button).toBe(button);
  });
  it("ask step uses the real imported count", () => {
    expect(nextStep({ ...base, customersSent: 0 }).body).toContain("12 customers");
  });
  it("counts setup steps", () => {
    expect(setupDone({ ...base, qrDownloaded: false }).filter(Boolean).length).toBe(4);
  });
});

describe("stat tiles", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  const lead = (o: any) => ({ id: Math.random().toString(), lead_name: "A", lead_phone: "1", lead_need: "roof", referrer_name: "R", deal_value: null, ...o });
  const leads = [
    lead({ created_at: "2026-10-02T00:00:00Z", status: "new" }),
    lead({ created_at: "2026-10-18T00:00:00Z", status: "closed_won", deal_value: 8000 }),
    lead({ created_at: "2026-09-10T00:00:00Z", status: "closed_won", deal_value: 4500 }),
    lead({ created_at: "2026-09-01T00:00:00Z", status: "in_progress" }),
    lead({ created_at: "2026-10-19T00:00:00Z", status: "in_progress" }),
  ];
  const rewards = [
    { status: "pending", amount: 250, referrer_name: "Ann" },
    { status: "pending", amount: 100, referrer_name: "Ann" },
    { status: "pending", amount: 250, referrer_name: "Bo" },
    { status: "paid", amount: 999, referrer_name: "Cy" },
  ];
  it("computes from fixtures", () => {
    expect(computeStats(leads, rewards, now)).toEqual({ referralsThisMonth: 3, jobsClosed: 2, revenue: 12500, owed: 600, owedPeople: 2 });
  });
  it("leads to call keeps new/contacted and only stale quoted", () => {
    const r = leadsToCall(leads, now);
    expect(r.map((l) => l.status)).toEqual(["new", "in_progress"]);
    expect(r[1].stale).toBe(true);
  });
});

describe("deep links", () => {
  it("?tab=leads opens Leads, default is home", () => {
    expect(resolveTab("leads")).toBe("leads");
    expect(resolveTab(null)).toBe("home");
    expect(resolveTab("home")).toBe("home");
    expect(resolveTab("nonsense")).toBe("home");
  });
});

describe("rail", () => {
  const renderShell = (isPro: boolean) =>
    render(<DashboardShell active="home" onSelect={() => {}} isPro={isPro} newLeads={2}>x</DashboardShell>);
  it("shows Pro tags only on Free", () => {
    renderShell(false);
    expect(screen.getAllByTestId("pro-tag")).toHaveLength(2);
  });
  it("hides Pro tags on Pro", () => {
    renderShell(true);
    expect(screen.queryAllByTestId("pro-tag")).toHaveLength(0);
  });
});

describe("home upsell", () => {
  const renderHome = (isPro: boolean, isDemo: boolean) => render(
    <MemoryRouter>
      <HomeView businessId="b" businessName="Summit Roofing" slug="summit" publicUrl="https://revvin.co/r/summit"
        isPro={isPro} isDemo={isDemo} setup={base} leads={[]} onGo={() => {}} onPublish={() => {}} onShared={() => {}} />
    </MemoryRouter>,
  );
  it("demo account renders without upsell", () => {
    renderHome(false, true);
    expect(screen.getByTestId("next-step")).toBeTruthy();
    expect(screen.queryByTestId("free-upsell")).toBeNull();
  });
  it("free non-demo shows upsell with real count", () => {
    renderHome(false, false);
    expect(screen.getByTestId("free-upsell").textContent).toContain("You've added 12");
  });
  it("pro shows no upsell", () => {
    renderHome(true, false);
    expect(screen.queryByTestId("free-upsell")).toBeNull();
  });
});
