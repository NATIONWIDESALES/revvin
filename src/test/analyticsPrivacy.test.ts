import { describe, expect, it } from "vitest";
import { analyticsContext, analyticsEventAllowed, safeAnalyticsAttribution, safeAnalyticsMeta, sanitizeAnalyticsReferrer } from "@/lib/analyticsPrivacy";

describe("public analytics privacy boundary", () => {
  it.each([
    "/r/status/PRIVATE_RECEIPT", "/feedback/PRIVATE_TOKEN", "/dashboard", "/dashboard/settings",
    "/auth", "/signup", "/reset-password", "/__sa", "/__health", "/i/PRIVATE_INVITE",
    "/pricing?token=PRIVATE", "/?__lovable_token=PRIVATE", "/#access_token=PRIVATE", "/not-a-public-route",
  ])("excludes private, auth, token-bearing and unknown URL %s", path => {
    expect(analyticsContext(`https://revvin.co${path}`, "anonymous")).toBeNull();
  });
  it("preserves public marketing and labeled demo, without query or business identifiers", () => {
    expect(analyticsContext("https://revvin.co/pricing?utm_source=ugc", "anonymous")).toEqual({ path: "/pricing", traffic: "marketing" });
    expect(analyticsContext("https://revvin.co/sample", "anonymous")).toEqual({ path: "/sample", traffic: "demo" });
    expect(analyticsContext("https://revvin.co/r/summit-roofing", "anonymous")).toEqual({ path: "/r/:business", traffic: "referral" });
    expect(analyticsContext("https://revvin.co/referral-program/roofing", "anonymous")?.path).toBe("/referral-program/roofing");
  });
  it("excludes preview, local, signed-in and unresolved audiences", () => {
    for (const origin of ["https://preview--example.lovable.app", "http://localhost:5173", "https://revvin.co.evil.invalid"]) {
      expect(analyticsContext(`${origin}/pricing`, "anonymous")).toBeNull();
    }
    expect(analyticsContext("https://revvin.co/", "signed-in")).toBeNull();
    expect(analyticsContext("https://revvin.co/", "unknown")).toBeNull();
  });
  it("reduces referrers to an external origin or approved same-site path", () => {
    expect(sanitizeAnalyticsReferrer("https://search.example/search/alice@example.invalid?q=PRIVATE#secret")).toBe("https://search.example");
    expect(sanitizeAnalyticsReferrer("https://revvin.co/r/status/PRIVATE?token=OTHER")).toBe("https://revvin.co");
    expect(sanitizeAnalyticsReferrer("https://revvin.co/pricing?utm_source=ugc#secret")).toBe("https://revvin.co/pricing");
    expect(sanitizeAnalyticsReferrer("https://revvin.co/r/private-business?x=1")).toBe("https://revvin.co/r/:business");
    expect(sanitizeAnalyticsReferrer("javascript:alert(1)")).toBeNull();
  });
  it("labels public demos, strips unknown metadata, and cannot turn demo into a commercial event", () => {
    const context = { path: "/sample", traffic: "demo" as const };
    expect(safeAnalyticsMeta("demo_completed", context, { name: "PRIVATE", receipt_token: "SECRET", is_demo: false, traffic: "marketing" })).toEqual({ traffic: "demo", is_demo: true });
    expect(safeAnalyticsMeta("cta_clicked", { path: "/", traffic: "marketing" }, { cta: "demo_signup" }).is_demo).toBe(true);
    expect(analyticsEventAllowed("referral_submitted", context)).toBe(false);
    expect(analyticsEventAllowed("signup_succeeded", context)).toBe(false);
    expect(analyticsEventAllowed("demo_completed", context)).toBe(true);
  });
  it("filters stored attribution instead of spreading arbitrary storage keys", () => {
    expect(safeAnalyticsAttribution({ utm_source: "ugc", utm_campaign: "roofing-sept", gclid: "valid-click-id", email: "PRIVATE", token: "SECRET", utm_content: "alice@example.invalid", utm_term: "https://private.invalid/?token=SECRET" })).toEqual({ utm_source: "ugc", utm_campaign: "roofing-sept", gclid: "valid-click-id" });
  });
});
