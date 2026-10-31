import { afterEach, beforeEach, describe, expect, it, vi, beforeAll } from "vitest";

const fake = vi.hoisted(() => ({ insert: vi.fn(), capture: vi.fn(), existing: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (fn: string, args: { p_kind: string; p_data: unknown }) => {
  if (fn !== "fn_submit_public_capture" || args.p_kind !== "funnel_events") throw new Error("Unexpected persistence target");
  return fake.insert(args.p_data);
} } }));
vi.mock("@/lib/attribution", () => ({ captureAttribution: fake.capture, getAttribution: fake.existing }));
import { track } from "@/lib/track";
import { milestoneContext } from "@/lib/analyticsPrivacy";
import { setAnalyticsAudience } from "@/lib/analyticsPrivacy";
import { loadSupabase } from "@/lib/supabaseLazy";

// The client loads on first use; load the mocked one up front so each event
// is written in the same tick, as it is once a page has the client.
beforeAll(async () => { await loadSupabase(); });

const MILESTONES = ["signup_succeeded", "onboarding_started", "onboarding_completed", "page_published"] as const;

beforeEach(() => {
  fake.insert.mockReset().mockResolvedValue({ error: null });
  fake.capture.mockReset().mockReturnValue({ utm_source: "ugc", private_token: "SECRET" });
  fake.existing.mockReset();
  // A real business completing onboarding is signed in on a private route.
  setAnalyticsAudience("signed-in");
  vi.spyOn(document, "referrer", "get").mockReturnValue("https://revvin.co/r/status/PRIVATE_RECEIPT");
});
afterEach(() => { setAnalyticsAudience("unknown"); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("authenticated funnel milestones", () => {
  it.each([
    ["signup_succeeded", "https://revvin.co/signup"],
    ["onboarding_started", "https://revvin.co/welcome"],
    ["onboarding_completed", "https://revvin.co/welcome"],
    ["page_published", "https://revvin.co/dashboard?welcome=1"],
  ] as const)("records %s for a signed-in, non-demo business", (event, href) => {
    vi.stubGlobal("location", new URL(href));
    track(event as (typeof MILESTONES)[number]);
    expect(fake.insert).toHaveBeenCalledTimes(1);
    const row = fake.insert.mock.calls[0][0];
    expect(row.event).toBe(event);
    expect(row.meta).toEqual({ utm_source: "ugc", traffic: "product", is_demo: false });
    expect(row.referrer).toBeNull();
    expect(JSON.stringify(row)).not.toMatch(/SECRET|PRIVATE|welcome=1/);
  });

  it("keeps the milestone lane narrow: fixed events, fixed routes, production only", () => {
    expect(milestoneContext("https://revvin.co/welcome", "referral_submitted")).toBeNull();
    expect(milestoneContext("https://revvin.co/r/status/PRIVATE", "page_published")).toBeNull();
    expect(milestoneContext("https://preview--x.lovable.app/welcome", "page_published")).toBeNull();
    expect(milestoneContext("https://revvin.co/welcome?token=SECRET", "page_published")).toEqual({ path: "/welcome", traffic: "product" });
  });

  it("still records public anonymous pageviews unchanged", () => {
    setAnalyticsAudience("anonymous");
    vi.stubGlobal("location", new URL("https://revvin.co/pricing"));
    track("page_viewed");
    expect(fake.insert.mock.calls[0][0].meta.traffic).toBe("marketing");
  });
});
