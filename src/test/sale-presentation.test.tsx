import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Link } from "react-router-dom";
import { SALE_END_ISO } from "@/config/pricing";
import { isSaleSurface, saleCountdown, saleDestination, withSaleOffer } from "@/lib/salePresentation";

const auth = vi.hoisted(() => ({ user: null as null | { id: string }, userRole: null as string | null, loading: false }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/lib/supabaseLazy", async (original) => ({ ...await original<typeof import("@/lib/supabaseLazy")>(), loadSupabase: async () => ({ auth: { getSession: async () => ({ data: { session: { access_token: "test" } } }) }, from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: [{ subscription_status: "active" }], error: null }) }) }) }) }) }));

const flush = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); }); };
beforeEach(() => {
  vi.resetModules(); localStorage.clear(); sessionStorage.clear();
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 Chrome/131 Safari/537.36");
  auth.user = null; auth.userRole = null;
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({ sale_live: true, sale_end: SALE_END_ISO, server_now: "2026-11-16T21:56:00Z" }))));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function surface(path = "/") {
  const { default: Promotion } = await import("@/components/billing/SalePromotion");
  return render(<MemoryRouter initialEntries={[path]}><Promotion /><Link to="/guides">Browse guides</Link><Link to="/pricing">View pricing</Link><Link to="/?utm_source=meta">Paid landing</Link></MemoryRouter>);
}
async function popupWait() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 2150)); }); await flush(); }

describe("sale presentation eligibility and continuity", () => {
  it.each(["utm_medium=paid_social", "utm_source=meta", "utm_source=facebook", "utm_source=instagram", "fbclid=abc", "gclid=abc", "msclkid=abc", "fbclid="])("suppresses the popup but retains the banner for %s", async (query) => {
    await surface(`/?${query}`); await flush(); await popupWait();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("complementary")).toBeTruthy();
    expect(sessionStorage.getItem("revvin_bf2026_paid_ad")).toBe("1");
    expect(localStorage.getItem("revvin_bf2026_popup_seen")).toBeNull();
  });
  it("keeps paid-ad suppression through client navigation and a fresh mount in the same session", async () => {
    const view = await surface("/?utm_source=meta"); await flush();
    fireEvent.click(screen.getByRole("link", { name: "View pricing" })); await popupWait();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("complementary")).toBeTruthy();
    view.unmount(); vi.resetModules(); await surface("/pricing"); await popupWait();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("complementary")).toBeTruthy();
  }, 10000);
  it("cancels a pending organic popup when navigation identifies a paid-ad visit", async () => {
    await surface(); await flush();
    fireEvent.click(screen.getByRole("link", { name: "Paid landing" })); await popupWait();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(sessionStorage.getItem("revvin_bf2026_paid_ad")).toBe("1");
  });
  it("retains paid suppression on navigation when session storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("unavailable"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("unavailable"); });
    await surface("/?utm_medium=paid_social"); await flush();
    fireEvent.click(screen.getByRole("link", { name: "View pricing" })); await popupWait();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("complementary")).toBeTruthy();
  });
  it("still opens for an organic campaign visit", async () => {
    await surface("/?utm_source=google&utm_medium=organic"); await flush(); await popupWait();
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Early Black Friday" })).toBeTruthy());
    expect(sessionStorage.getItem("revvin_bf2026_paid_ad")).toBeNull();
  });
  it.each(["/r/acme", "/r/status/token", "/print/qr", "/earn", "/earn/dallas", "/me", "/referrer/123", "/auth/callback", "/feedback/token", "/offer/acme/1", "/partners/dashboard"])("excludes %s", (path) => { expect(isSaleSurface(path)).toBe(false); });
  it.each(["/", "/pricing", "/how-it-works", "/guides/guide", "/referral-program/roofing", "/dashboard", "/i/LAUNCH", "/i/OTHER/"])("includes %s", (path) => { expect(isSaleSurface(path)).toBe(true); });
  it("shows only the existing banner on invite pages during the sale", async () => {
    await surface("/i/LAUNCH"); await flush(); await popupWait();
    expect(screen.getByRole("complementary", { name: "Early Black Friday sale" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Get the Black Friday price/ }).getAttribute("href")).toBe("/signup?offer=bf2026");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("hides the invite banner after the sale end", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ sale_live: true, sale_end: SALE_END_ISO, server_now: SALE_END_ISO }))));
    await surface("/i/LAUNCH"); await flush();
    expect(screen.queryByRole("complementary")).toBeNull();
  });
  it("routes visitors to the sale signup and owners to the existing billing picker", () => {
    expect(saleDestination(false)).toBe("/signup?offer=bf2026");
    expect(saleDestination(true)).toBe("/dashboard?tab=billing&offer=bf2026");
  });
  it("keeps the allowlisted sale intent through signup and setup without purchase intent", () => {
    expect(withSaleOffer("/welcome", "?offer=bf2026")).toBe("/welcome?offer=bf2026");
    expect(withSaleOffer("/dashboard?welcome=1&tab=billing", "?offer=bf2026")).toBe("/dashboard?welcome=1&tab=billing&offer=bf2026");
    expect(withSaleOffer("/welcome", "?offer=other")).toBe("/welcome");
  });
  it("uses server time for countdown including November 30 tonight", () => {
    expect(saleCountdown(Date.parse("2026-11-16T21:56:00Z"), SALE_END_ISO)).toBe("Ends in 15 days");
    expect(saleCountdown(Date.parse("2026-11-30T18:00:00Z"), SALE_END_ISO)).toBe("Ends tonight");
  });
  it("shows once and does not return after navigation or a new mount", async () => {
    const view = await surface(); await flush(); await popupWait();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Early Black Friday" })).not.toBeNull(), { timeout: 5000 });
    expect(screen.getByRole("dialog", { name: "Early Black Friday" })).toBeTruthy();
    expect(localStorage.getItem("revvin_bf2026_popup_seen")).toBe("1");
    expect(screen.getAllByRole("link", { name: /Get the Black Friday price/ })[0].getAttribute("href")).toBe("/signup?offer=bf2026");
    fireEvent.click(screen.getByRole("button", { name: "Maybe later" })); await flush();
    fireEvent.click(screen.getByRole("link", { name: "Browse guides" })); await popupWait();
    expect(screen.queryByRole("dialog")).toBeNull();
    view.unmount(); vi.resetModules(); await surface(); await popupWait();
    expect(screen.queryByRole("dialog")).toBeNull();
  }, 15000);
  it.each(["/r/acme", "/print/qr", "/earn", "/auth/callback"])("renders neither sale surface on %s", async (path) => {
    await surface(path); await flush();
    expect(screen.queryByRole("complementary")).toBeNull(); expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("removes both sale surfaces after the server end", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ sale_live: false, sale_end: SALE_END_ISO, server_now: SALE_END_ISO }))));
    await surface(); await flush(); await popupWait();
    expect(screen.queryByRole("dialog")).toBeNull(); expect(screen.queryByRole("complementary")).toBeNull();
    expect(localStorage.getItem("revvin_bf2026_popup_seen")).toBeNull();
  });
  it("dismisses the banner for the browser session", async () => {
    await surface(); await flush(); fireEvent.click(screen.getByRole("button", { name: "Dismiss sale banner" }));
    expect(sessionStorage.getItem("revvin_bf2026_banner_dismissed")).toBe("1");
    fireEvent.click(screen.getByRole("link", { name: "Browse guides" })); await flush();
    expect(screen.queryByRole("complementary")).toBeNull();
  });
  it("links signed-in owners to billing but never interrupts a paid owner", async () => {
    auth.user = { id: "owner" }; auth.userRole = "business";
    await surface(); await flush(); await popupWait();
    expect(screen.getByRole("link", { name: /Get the Black Friday price/ }).getAttribute("href")).toBe("/dashboard?tab=billing&offer=bf2026");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("never advertises SaaS to a signed-in referrer, even on marketing pages", async () => {
    auth.user = { id: "referrer" }; auth.userRole = "referrer";
    await surface(); await flush(); expect(screen.queryByRole("complementary")).toBeNull(); expect(fetch).not.toHaveBeenCalled();
  });
  it("does not interrupt bots", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Googlebot");
    await surface(); await flush(); await popupWait();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem("revvin_bf2026_popup_seen")).toBeNull();
  });
  it("falls back to once per page session when storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("unavailable"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("unavailable"); });
    const view = await surface(); await flush(); await popupWait();
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Maybe later" })); await flush();
    view.unmount(); await surface(); await flush(); await popupWait();
    expect(screen.queryByRole("dialog")).toBeNull();
  }, 10000);
});