import { beforeEach, describe, expect, it, vi } from "vitest";
import { capturePreview, readPreview, storePreview, previewSignupUrl, suggestedReward, acquisitionOf } from "@/lib/instantPreview";
import { INDUSTRIES } from "@/content/industries";
import { PREVIEW_TRADES } from "@/content/previewTrades";
import { START_PATHS } from "@/content/startPages";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import { acquisitionEventPath } from "@/lib/acquisitionEvents";
import { advertisingAllowed, pixelSafePath } from "@/lib/metaPermission";
import { META_PIXEL_ID } from "@/config/brand";
import { hasMobileStartBar } from "@/components/marketing/MobileStartBar";
import { trialNotice } from "../../supabase/functions/_shared/trial-notices";
import { effectivePlan } from "../../supabase/functions/_shared/effective-plan";
beforeEach(() => sessionStorage.clear());
describe("1. instant preview handoff", () => {
  it("preserves name, trade, reward and campaign data through either handoff", () => {
    const data = capturePreview("Acme Roofing", "roofing", 250, "https://revvin.co/start/roofing?utm_source=facebook&utm_medium=paid&utm_campaign=roof&utm_content=sign&utm_term=local&email=private");
    storePreview(data);
    expect(readPreview()).toEqual(data);
    sessionStorage.clear();
    expect(readPreview(previewSignupUrl(data).split("?")[1])).toEqual(data);
    expect(acquisitionOf(data)).toEqual({ landing_path: "/start/roofing", utm_source: "facebook", utm_medium: "paid", utm_campaign: "roof", utm_content: "sign", utm_term: "local" });
    expect(data).not.toHaveProperty("email");
  });
  it("survives disabled storage with URL fallback", () => {
    const data = capturePreview("Acme", "other", 100, "https://revvin.co/");
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("blocked"); });
    expect(() => storePreview(data)).not.toThrow(); spy.mockRestore();
    expect(readPreview(previewSignupUrl(data).split("?")[1])?.name).toBe("Acme");
  });
  it("rejects invalid rewards and keeps lightweight trades aligned", () => {
    expect(readPreview("name=Acme&reward=-1&trade=roofing")).toBeNull();
    expect(PREVIEW_TRADES.map(i => i.slug)).toEqual(INDUSTRIES.map(i => i.slug));
    expect(suggestedReward("other")).toBe(100);
  });
  it("records only fixed acquisition paths, never typed query data", () => {
    expect(acquisitionEventPath("preview_submitted", "/start/roofing")).toBe("/start/roofing");
    expect(acquisitionEventPath("preview_submitted", "/r/private")).toBeNull();
    expect(acquisitionEventPath("signup_completed", "/signup")).toBe("/signup");
  });
});
describe("2. ad landing route contract", () => {
  it("has generic and every supported trade page, all noindex", () => {
    expect(START_PATHS.length).toBe(21);
    for (const path of START_PATHS) expect(PRERENDER_ROUTES.find(r => r.path === path)?.noindex).toBe(true);
  });
});
describe("4. trial deadline and authority", () => {
  const now = Date.parse("2026-11-11T12:00:00Z");
  it("notifies on day 11 and last day, but not paid Pro or expired trials", () => {
    expect(trialNotice("2026-11-14T12:00:00Z", "free", now)).toBe("trial_ends_3_days");
    expect(trialNotice("2026-11-12T12:00:00Z", "free", now)).toBe("trial_ends_today");
    expect(trialNotice("2026-11-14T12:00:00Z", "pro", now)).toBeNull();
    expect(trialNotice("2026-11-11T12:00:00Z", "free", now)).toBeNull();
  });
  it("fails closed if server cannot verify effective plan", async () => {
    await expect(effectivePlan({ rpc: async () => ({ error: {}, data: null }) }, "biz")).rejects.toThrow("effective_plan_unavailable");
  });
});
describe("5. sticky CTA eligibility", () => {
  it.each(["/", "/pricing", "/compare/referralwise", "/guides/referral-text-templates", "/referral-program/roofing", "/about"])("includes %s", path => expect(hasMobileStartBar(path)).toBe(true));
  it.each(["/r/acme", "/start", "/start/roofing", "/dashboard", "/welcome", "/signup", "/login"])("excludes %s", path => expect(hasMobileStartBar(path)).toBe(false));
});
describe("6. pixel slot and permission", () => {
  it("defaults empty and blocks consent-required/unknown regions and opt-outs", () => {
    expect(META_PIXEL_ID).toBe("");
    expect(advertisingAllowed("US")).toBe(true);
    for (const country of ["GB", "DE", "XX", "T1", null]) expect(advertisingAllowed(country)).toBe(false);
    expect(advertisingAllowed("US", true)).toBe(false);
    expect(advertisingAllowed("CA", false, true)).toBe(false);
  });
  it("never loads on private/signup query URLs", () => {
    expect(pixelSafePath("/", "?utm_source=facebook", "")).toBe(true);
    expect(pixelSafePath("/signup", "?name=Private&reward=100", "")).toBe(false);
    expect(pixelSafePath("/r/acme", "?ref=secret", "")).toBe(false);
    expect(pixelSafePath("/", "", "#access_token=secret")).toBe(false);
  });
});