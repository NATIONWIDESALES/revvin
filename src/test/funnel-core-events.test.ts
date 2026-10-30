import { afterEach, beforeEach, describe, expect, it, vi, beforeAll } from "vitest";

const fake = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert: fake.insert }) } }));
vi.mock("@/lib/attribution", () => ({ captureAttribution: () => ({}), getAttribution: () => ({}) }));

import { track } from "@/lib/track";
import { setAnalyticsAudience } from "@/lib/analyticsPrivacy";
import { loadSupabase } from "@/lib/supabaseLazy";

// The client loads on first use; load the mocked one up front so each event
// is written in the same tick, as it is once a page has the client.
beforeAll(async () => { await loadSupabase(); });

const at = (href: string) => vi.stubGlobal("location", new URL(href));
const flush = () => new Promise((r) => setTimeout(r, 0));
beforeEach(() => { fake.insert.mockReset().mockResolvedValue({ error: null }); });
afterEach(() => { setAnalyticsAudience("unknown"); vi.unstubAllGlobals(); });

describe("core funnel events still reach funnel_events on production", () => {
  it("signup_succeeded from /signup", async () => {
    setAnalyticsAudience("anonymous"); at("https://revvin.co/signup");
    track("signup_succeeded"); await flush();
    expect(fake.insert.mock.calls.map(([r]) => r.event)).toEqual(["signup_succeeded"]);
  });
  it.each(["onboarding_completed", "page_published"] as const)("%s from /welcome while signed in", async (e) => {
    setAnalyticsAudience("signed-in"); at("https://revvin.co/welcome");
    track(e); await flush();
    expect(fake.insert).toHaveBeenCalledTimes(1);
    expect(fake.insert.mock.calls[0][0]).toMatchObject({ event: e, path: "/welcome" });
  });
  it("hero cta_clicked from / for an anonymous visitor", async () => {
    setAnalyticsAudience("anonymous"); at("https://revvin.co/");
    track("cta_clicked", { cta: "hero_signup" }); await flush();
    expect(fake.insert.mock.calls[0][0]).toMatchObject({ event: "cta_clicked", path: "/" });
    expect(JSON.stringify(fake.insert.mock.calls[0][0])).toContain("hero_signup");
  });
  it("nothing from a preview host", async () => {
    setAnalyticsAudience("anonymous"); at("https://id-preview--x.lovable.app/welcome");
    track("onboarding_completed"); await flush();
    expect(fake.insert).not.toHaveBeenCalled();
  });
});
