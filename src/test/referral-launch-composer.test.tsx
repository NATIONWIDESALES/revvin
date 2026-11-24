import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ launches: [] as unknown[], invoke: vi.fn() }));
vi.mock("@/lib/track", () => ({ track: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => {
  const contacts = [
    { id: "c1", name: "Test Alpha", email: "info+qa1@revvin.co", status: "pending", is_mock: false, referrers: { token: "tokAlpha" } },
    { id: "c2", name: "Test Bravo", email: "info+qa2@revvin.co", status: "pending", is_mock: false, referrers: { token: "tokBravo" } },
    { id: "c3", name: "Test Charlie", email: null, status: "pending", is_mock: false, referrers: { token: "tokCharlie" } },
  ];
  const query = (table: string) => {
    const result = { data: table === "referral_contacts" ? contacts : h.launches, error: null };
    const chain: Record<string, unknown> = {};
    for (const m of ["select", "eq", "order", "limit"]) chain[m] = () => chain;
    chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return chain;
  };
  return { supabase: { from: query, rpc: async () => ({ data: null }), functions: { invoke: h.invoke } } };
});

import ReferralLaunchSection from "@/components/dashboard/ReferralLaunchSection";

const biz = { id: "b1", name: "QA Test Plumbing", slug: "qa-test-plumbing", offer_amount: "$100", business_email: "info+qa1113@revvin.co" };
const view = (isPro = false) => render(<MemoryRouter><ReferralLaunchSection biz={biz} publicUrl="https://revvin.co/r/qa-test-plumbing" isPro={isPro} ready /></MemoryRouter>);

beforeEach(() => { h.launches = []; });

describe("launch composer", () => {
  it("counts who will be asked, explains skips and previews the first customer's own link", async () => {
    view();
    expect(await screen.findByText("2 customers with an email will be asked")).toBeTruthy();
    expect(screen.getByText("Skipped: 1 no email.")).toBeTruthy();
    const link = screen.getByTestId("launch-preview-link") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("https://revvin.co/r/qa-test-plumbing?ref=tokAlpha");
    expect(screen.getByTestId("launch-preview").textContent).toContain("we will send you $100 as a thank you.");
    expect(screen.getByRole("button", { name: /Ask all 2 customers/ })).toBeTruthy();
  });
  it("after Free used its one launch, a new send shows the Pro offer", async () => {
    h.launches = [{ id: "l1", created_at: "2026-11-20T00:00:00Z", started_at: "2026-11-20T00:00:00Z", followups_enabled: true, followups_done: 1, status: "sent" }];
    view(false);
    expect(await screen.findByText("Ask your customers again")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Ask all/ })).toBeNull();
    await waitFor(() => expect(screen.getByTestId("launch-results")).toBeTruthy());
  });
  it("Pro can launch again", async () => {
    h.launches = [{ id: "l1", created_at: "2026-11-20T00:00:00Z", started_at: "2026-11-20T00:00:00Z", followups_enabled: true, followups_done: 0, status: "sent" }];
    view(true);
    expect(await screen.findByRole("button", { name: /Ask all 2 customers/ })).toBeTruthy();
  });
});
