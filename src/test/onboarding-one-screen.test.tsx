import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({
  update: vi.fn(),
  rpc: vi.fn(),
  publish: vi.fn(),
  track: vi.fn(),
  save: vi.fn(),
  taken: new Set<string>(),
  user: { id: "u1", email: "o@example.test" },
  load: vi.fn(),
  published: false,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ limit: async () => { h.load(); return { data: [{ is_published: h.published, id: "biz-1", name: "Summit Roofing", category: "Roofing", service_area: "", offer_amount: "$100", slug: null, business_email: null, launch_package_status: null }] }; } }) }),
      update: (patch: unknown) => ({ eq: () => {
        h.update(patch);
        const result = h.save(patch);
        return Object.assign(result, { select: () => ({ limit: () => result }) });
      } }),
    }),
    rpc: async (_fn: string, args: { p_slug: string }) => { h.rpc(args.p_slug); return { data: h.taken.has(args.p_slug) ? "taken" : "ok", error: null }; },
    functions: { invoke: vi.fn(async () => ({})) },
  },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: h.user }) }));
vi.mock("@/lib/publishPage", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/publishPage")>(),
  publishPage: async (s: string) => { h.publish(s); return { ok: true }; },
}));
vi.mock("@/lib/track", () => ({ track: (...a: unknown[]) => h.track(...a) }));
vi.mock("@/lib/proCheckoutIntent", () => ({ CHECKOUT_FALLBACK_TOAST: {}, parsePlan: () => null, peekCheckoutIntent: () => null, startHeldCheckout: vi.fn() }));
vi.mock("@/components/ServiceAreaAutocomplete", () => ({ default: (p: { value: string; onChange: (v: string) => void; id: string }) => <input id={p.id} value={p.value} onChange={(e) => p.onChange(e.target.value)} /> }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));

import Onboarding from "@/pages/Onboarding";
import { resolveAvailableSlug } from "@/lib/slugRules";

beforeEach(() => {
  h.published = false;
  h.load.mockClear();
  h.update.mockReset(); h.rpc.mockReset(); h.publish.mockReset(); h.track.mockReset(); h.taken.clear();
  h.save.mockReset(); h.save.mockImplementation(async (patch) => ({ data: [{ id: "biz-1", ...patch }], error: null }));
});

describe("one-screen onboarding", () => {
  it("uses edit labels for a published business and preserves the save behavior", async () => {
    h.published = true;
    render(<MemoryRouter initialEntries={["/welcome"]}><Onboarding /></MemoryRouter>);
    const save = await screen.findByRole("button", { name: "Save changes" });
    expect(screen.getByRole("heading", { name: "Edit your page" })).toBeTruthy();
    fireEvent.click(save);
    await screen.findByRole("heading", { name: "Your page is live" });
    expect(h.publish).toHaveBeenCalledTimes(1);
  });
  it("preserves unsaved fields when auth emits a new object for the same user", async () => {
    const page = <MemoryRouter initialEntries={["/welcome"]}><Onboarding /></MemoryRouter>;
    const { rerender } = render(page);
    const name = await screen.findByDisplayValue("Summit Roofing");
    fireEvent.change(name, { target: { value: "Unsaved flooring name" } });
    const reward = screen.getByDisplayValue("$100");
    fireEvent.change(reward, { target: { value: "$150" } });
    for (const event of ["TOKEN_REFRESHED", "SIGNED_IN"]) {
      h.user = { ...h.user };
      await act(async () => { rerender(<MemoryRouter initialEntries={["/welcome"]}><Onboarding /></MemoryRouter>); });
      expect(screen.getByDisplayValue("Unsaved flooring name")).toBe(name);
      expect(screen.getByDisplayValue("$150")).toBe(reward);
    }
    expect(h.load).toHaveBeenCalledTimes(1);
    expect(h.update).not.toHaveBeenCalled();
  });

  it("waits for the saved required fields before publishing", async () => {
    let finish: ((value: unknown) => void) | undefined;
    h.save.mockImplementation((patch) => new Promise(resolve => { finish = () => resolve({ data: [{ id: "biz-1", ...patch }], error: null }); }));
    render(<MemoryRouter initialEntries={["/welcome"]}><Onboarding /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Publish my page" }));
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(1));
    expect(h.publish).not.toHaveBeenCalled();
    finish?.({});
    await screen.findByRole("heading", { name: "Your page is live" });
    expect(h.publish).toHaveBeenCalledTimes(1);
  });
  it("does not publish when an owner save silently returns no row", async () => {
    h.save.mockResolvedValue({ data: [], error: null });
    render(<MemoryRouter initialEntries={["/welcome"]}><Onboarding /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Publish my page" }));
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "Publish my page" })).not.toBeDisabled());
    expect(h.publish).not.toHaveBeenCalled();
  });
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
