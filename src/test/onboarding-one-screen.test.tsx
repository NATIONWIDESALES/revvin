import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({
  update: vi.fn(),
  rpc: vi.fn(),
  publish: vi.fn(),
  track: vi.fn(),
  taken: new Set<string>(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ limit: async () => ({ data: [{ id: "biz-1", name: "Summit Roofing", category: "Roofing", service_area: "", offer_amount: "$100", slug: null, business_email: null, launch_package_status: null }] }) }) }),
      update: (patch: unknown) => ({ eq: async () => { h.update(patch); return { error: null }; } }),
    }),
    rpc: async (_fn: string, args: { p_slug: string }) => { h.rpc(args.p_slug); return { data: h.taken.has(args.p_slug) ? "taken" : "ok", error: null }; },
    functions: { invoke: vi.fn(async () => ({})) },
  },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1", email: "o@example.test" } }) }));
vi.mock("@/lib/publishPage", () => ({ publishPage: async (s: string) => { h.publish(s); return { ok: true }; } }));
vi.mock("@/lib/track", () => ({ track: (...a: unknown[]) => h.track(...a) }));
vi.mock("@/lib/proCheckoutIntent", () => ({ CHECKOUT_FALLBACK_TOAST: {}, parsePlan: () => null, peekCheckoutIntent: () => null, startHeldCheckout: vi.fn() }));
vi.mock("@/components/ServiceAreaAutocomplete", () => ({ default: (p: { value: string; onChange: (v: string) => void; id: string }) => <input id={p.id} value={p.value} onChange={(e) => p.onChange(e.target.value)} /> }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));

import Onboarding from "@/pages/Onboarding";
import { resolveAvailableSlug } from "@/lib/slugRules";

beforeEach(() => { h.update.mockReset(); h.rpc.mockReset(); h.publish.mockReset(); h.track.mockReset(); h.taken.clear(); });

describe("one-screen onboarding", () => {
  it("publishes in one submit and appends -2 when the link is taken", async () => {
    h.taken.add("summit-roofing");
    render(<MemoryRouter initialEntries={["/welcome"]}><Onboarding /></MemoryRouter>);
    const btn = await screen.findByRole("button", { name: "Publish my page" });
    expect(screen.getByRole("heading", { name: "Your referral page, live in a minute" })).toBeTruthy();
    fireEvent.click(btn);
    await screen.findByRole("heading", { name: "Your page is live" });
    expect(h.publish).toHaveBeenCalledTimes(1);
    expect(h.publish).toHaveBeenCalledWith("onboarding");
    expect(h.update).toHaveBeenCalledTimes(1);
    expect(h.update.mock.calls[0][0]).toMatchObject({ slug: "summit-roofing-2", name: "Summit Roofing", category: "Roofing", offer_amount: "$100" });
    expect(h.track).toHaveBeenCalledWith("onboarding_completed");
    expect(screen.getByRole("link", { name: "Open page" }).getAttribute("href")).toMatch(/\/r\/summit-roofing-2$/);
  });

  it("keeps counting up past -2", async () => {
    const taken = new Set(["acme", "acme-2", "acme-3"]);
    expect(await resolveAvailableSlug("acme", async (s) => (taken.has(s) ? "taken" : "ok"))).toBe("acme-4");
  });

  it("returns null instead of looping forever", async () => {
    expect(await resolveAvailableSlug("acme", async () => "taken", 5)).toBeNull();
  });
});
