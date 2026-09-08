import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ insert: vi.fn(), capture: vi.fn(), existing: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  if (table !== "funnel_events") throw new Error("Unexpected persistence target");
  return { insert: fake.insert };
} } }));
vi.mock("@/lib/attribution", () => ({ captureAttribution: fake.capture, getAttribution: fake.existing }));
import { track } from "@/lib/track";
import { setAnalyticsAudience } from "@/lib/analyticsPrivacy";

beforeEach(() => {
  fake.insert.mockReset().mockResolvedValue({ error: null });
  fake.capture.mockReset().mockReturnValue({ utm_source: "ugc", private_token: "SECRET" });
  fake.existing.mockReset();
  setAnalyticsAudience("anonymous");
  vi.stubGlobal("location", new URL("https://revvin.co/pricing?utm_source=ugc"));
  vi.spyOn(document, "referrer", "get").mockReturnValue("https://revvin.co/r/status/PRIVATE_RECEIPT?token=SECRET");
  Object.assign(window, { plausible: vi.fn(), fbq: vi.fn() });
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("NETWORK FORBIDDEN"); }));
});
afterEach(() => { setAnalyticsAudience("unknown"); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("real tracker payload with isolated persistence", () => {
  it("writes a sanitized public row and never calls browser provider globals", () => {
    track("cta_clicked", { cta: "hero_signup", private_token: "SECRET", name: "PRIVATE" });
    expect(fake.insert).toHaveBeenCalledTimes(1);
    const row = fake.insert.mock.calls[0][0];
    expect(row.path).toBe("/pricing");
    expect(row.referrer).toBe("https://revvin.co");
    expect(row.meta).toEqual({ utm_source: "ugc", cta: "hero_signup", traffic: "marketing", is_demo: false });
    expect(JSON.stringify(row)).not.toMatch(/PRIVATE|SECRET/);
    expect((window as any).plausible).not.toHaveBeenCalled();
    expect((window as any).fbq).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("drops private URLs before attribution capture or persistence", () => {
    vi.stubGlobal("location", new URL("https://revvin.co/r/status/PRIVATE_RECEIPT"));
    track("page_viewed");
    track("cta_clicked");
    expect(fake.capture).not.toHaveBeenCalled();
    expect(fake.insert).not.toHaveBeenCalled();
  });
  it("preserves demo start/completion as labeled events, blocks commercial results in the demo", () => {
    vi.stubGlobal("location", new URL("https://revvin.co/sample"));
    track("demo_started"); track("demo_completed"); track("referral_submitted");
    expect(fake.insert).toHaveBeenCalledTimes(2);
    expect(fake.insert.mock.calls.map(([row]) => [row.event, row.meta.is_demo, row.meta.traffic])).toEqual([["demo_started", true, "demo"], ["demo_completed", true, "demo"]]);
  });
});
