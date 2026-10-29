import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Isolated event sink: the real tracker runs, persistence is intercepted.
const fake = vi.hoisted(() => ({ insert: vi.fn(), capture: vi.fn(), existing: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  if (table !== "funnel_events") throw new Error("Unexpected persistence target");
  return { insert: fake.insert };
} } }));
vi.mock("@/lib/attribution", () => ({ captureAttribution: fake.capture, getAttribution: fake.existing }));

import { track, setTrackDiagnosticSink, FUNNEL_EVENTS, type TrackDiagnostic } from "@/lib/track";
import { setAnalyticsAudience, HOME_CTA_LABELS, SIGNUP_STEP_EVENTS } from "@/lib/analyticsPrivacy";
import { TOOLKIT_CTA_LABELS } from "@/lib/toolkit/analytics";

// Read-only snapshot of the live funnel_events INSERT policy (pg_policies,
// 2026-10-14). No migration was made; this pins compatibility.
const LIVE_POLICY_EVENTS = new Set(["page_viewed","signup_viewed","signup_submitted","signup_succeeded","signup_failed","onboarding_started","onboarding_completed","go_live_clicked","publish_page_clicked","checkout_redirected","checkout_canceled","email_lead_submitted","referral_submitted","sample_page_viewed","promo_popup_shown","promo_cta_clicked","invite_link_opened","invite_code_entered","invite_landing_viewed","signup_form_started","invite_cta_clicked","cta_clicked","demo_started","demo_completed","page_published","first_ask_prepared","pwa_install_prompted","pwa_installed","pwa_install_cta_shown","pwa_install_cta_clicked","dashboard_viewed","onboarding_step_completed","publish_banner_seen","publish_succeeded","publish_failed","share_tools_viewed","checkout_succeeded","campaigns_tab_viewed","campaign_segment_selected","campaign_preview_viewed","campaign_send_clicked","campaign_sent","campaign_send_failed","referral_page_load_failed"]);

const SIGNUP_STEPS = ["signup_viewed", "signup_form_started", "signup_submitted", "signup_failed"] as const;
const at = (href: string) => vi.stubGlobal("location", new URL(href));
const rows = () => fake.insert.mock.calls.map(([r]) => r);
const flush = () => new Promise((r) => setTimeout(r, 0));

let diagnostics: TrackDiagnostic[] = [];
beforeEach(() => {
  fake.insert.mockReset().mockResolvedValue({ error: null });
  fake.capture.mockReset().mockReturnValue({ utm_source: "ig", private_token: "SECRET" });
  fake.existing.mockReset();
  diagnostics = [];
  setTrackDiagnosticSink((d) => diagnostics.push(d));
  setAnalyticsAudience("anonymous");
  vi.spyOn(document, "referrer", "get").mockReturnValue("https://revvin.co/reset-password#access_token=SECRET");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("NETWORK FORBIDDEN"); }));
});
afterEach(() => { setAnalyticsAudience("unknown"); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("signup step lane", () => {
  it("records the four steps from /signup as literal path, fixed name, no caller data", () => {
    at("https://revvin.co/signup?plan=annual&invite=FRIEND42&email=a%40b.co#access_token=SECRET");
    for (const e of SIGNUP_STEPS) track(e, { invite_code: "FRIEND42", email: "a@b.co", cta: "hero_signup" });
    expect(rows().map((r) => r.event)).toEqual([...SIGNUP_STEPS]);
    for (const r of rows()) {
      expect(r.path).toBe("/signup");
      expect(r.referrer).toBeNull();
      expect(r.meta).toEqual({ utm_source: "ig", traffic: "product", is_demo: false });
      expect(JSON.stringify(r)).not.toMatch(/FRIEND42|a@b|SECRET|annual|invite|email/);
    }
  });

  it.each([
    "https://revvin.co/auth", "https://revvin.co/welcome", "https://revvin.co/dashboard",
    "https://revvin.co/", "https://revvin.co/pricing", "https://revvin.co/i/FRIEND42",
    "https://revvin.co/signup/extra", "https://revvin.co/reset-password?token=SECRET",
    "https://revvin.co/r/status/PRIVATE_RECEIPT", "https://revvin.co/partners/dashboard?t=SECRET",
    "https://revvin.lovable.app/signup", "https://id-preview--x.lovable.app/signup",
    "http://revvin.co/signup", "https://revvin.co:8443/signup", "http://localhost:8080/signup",
  ])("rejects every signup step on %s", (href) => {
    at(href);
    for (const e of SIGNUP_STEPS) track(e);
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("rejects signup steps for a visitor known to be signed in", () => {
    setAnalyticsAudience("signed-in");
    at("https://revvin.co/signup");
    for (const e of SIGNUP_STEPS) track(e);
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("keeps signup_succeeded and publication milestones exactly as before", () => {
    for (const path of ["/signup", "/auth", "/welcome", "/dashboard"]) {
      at(`https://revvin.co${path}?x=SECRET`);
      track("signup_succeeded");
      track("page_published");
    }
    expect(rows().map((r) => `${r.event}@${r.path}`)).toEqual([
      "signup_succeeded@/signup", "page_published@/signup", "signup_succeeded@/auth", "page_published@/auth",
      "signup_succeeded@/welcome", "page_published@/welcome", "signup_succeeded@/dashboard", "page_published@/dashboard",
    ]);
    at("https://revvin.co/reset-password");
    track("signup_succeeded");
    expect(fake.insert).toHaveBeenCalledTimes(8);
  });
});

describe("fixed CTA labels", () => {
  it("admits each new homepage placement and existing toolkit labels on the homepage", () => {
    at("https://revvin.co/");
    const labels = [...HOME_CTA_LABELS, ...TOOLKIT_CTA_LABELS];
    for (const cta of labels) track("cta_clicked", { cta, tool: "grader", score: 92 });
    expect(rows().map((r) => r.meta.cta)).toEqual(labels);
    for (const r of rows()) expect(Object.keys(r.meta).sort()).toEqual(["cta", "is_demo", "traffic", "utm_source"]);
  });

  it("drops unknown labels and arbitrary tool data", () => {
    at("https://revvin.co/");
    track("cta_clicked", { cta: "home_tool_<script>" });
    track("cta_clicked", { cta: "home_tool_custom", name: "Jane" });
    track("cta_clicked", { cta: "hero_setup_call_booked" });
    for (const r of rows()) expect(r.meta).toEqual({ utm_source: "ig", traffic: "marketing", is_demo: false });
  });

  it("describes setup clicks as link clicks, never bookings", () => {
    expect(HOME_CTA_LABELS.filter((l) => l.includes("setup"))).toEqual(["hero_setup_link", "pricing_setup_link"]);
    expect([...HOME_CTA_LABELS].some((l) => /book|confirm/.test(l))).toBe(false);
  });
});

describe("public-to-private navigation", () => {
  it("records public steps, then drops everything once the visitor reaches private URLs", () => {
    at("https://revvin.co/");
    track("page_viewed");
    track("cta_clicked", { cta: "home_demo_inline" });
    at("https://revvin.co/?utm_source=ig");
    track("page_viewed");
    for (const href of ["https://revvin.co/dashboard", "https://revvin.co/reset-password#access_token=SECRET", "https://revvin.co/r/status/RECEIPT", "https://revvin.co/?token=SECRET", "https://revvin.co/#demo"]) {
      at(href);
      track("page_viewed");
      track("cta_clicked", { cta: "hero_signup" });
      track("signup_viewed");
    }
    expect(rows().map((r) => `${r.event}@${r.path}`)).toEqual(["page_viewed@/", "cta_clicked@/", "page_viewed@/"]);
    expect(JSON.stringify(rows())).not.toMatch(/SECRET|RECEIPT|reset-password/);
  });

  it("suppresses public events for signed-in visitors", () => {
    setAnalyticsAudience("signed-in");
    at("https://revvin.co/");
    track("page_viewed");
    track("cta_clicked", { cta: "hero_signup" });
    expect(fake.insert).not.toHaveBeenCalled();
  });
});

describe("insert errors", () => {
  it("reports a returned database error as a fixed diagnostic, without payload or raw error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fake.insert.mockResolvedValue({ error: { message: "new row violates policy SECRET", details: "https://revvin.co/x?token=SECRET" } });
    at("https://revvin.co/signup");
    expect(() => track("signup_viewed")).not.toThrow();
    await flush();
    expect(diagnostics).toEqual([{ event: "signup_viewed", code: "insert_rejected" }]);
    expect(JSON.stringify(diagnostics)).not.toMatch(/SECRET|token|policy/);
    expect(warn).not.toHaveBeenCalled();
  });

  it("default development sink prints only the fixed code and event", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setTrackDiagnosticSink((d) => console.warn(`[track] ${d.code}: ${d.event}`));
    fake.insert.mockResolvedValue({ error: { message: "SECRET" } });
    at("https://revvin.co/");
    track("page_viewed");
    await flush();
    expect(warn.mock.calls).toEqual([["[track] insert_rejected: page_viewed"]]);
  });

  it("never throws when the insert rejects, throws synchronously, or the sink throws", async () => {
    at("https://revvin.co/");
    fake.insert.mockRejectedValueOnce(new Error("offline SECRET"));
    track("page_viewed");
    fake.insert.mockImplementationOnce(() => { throw new Error("boom"); });
    expect(() => track("page_viewed")).not.toThrow();
    await flush();
    expect(diagnostics.map((d) => d.code).sort()).toEqual(["insert_threw", "insert_threw"]);
    setTrackDiagnosticSink(() => { throw new Error("sink"); });
    fake.insert.mockResolvedValue({ error: { message: "x" } });
    expect(() => track("page_viewed")).not.toThrow();
    await flush();
  });
});

describe("live policy compatibility", () => {
  it("every declared client event is accepted by the live INSERT policy", () => {
    const missing = FUNNEL_EVENTS.filter((e) => !LIVE_POLICY_EVENTS.has(e));
    expect(missing).toEqual([]);
    for (const e of SIGNUP_STEP_EVENTS) expect(LIVE_POLICY_EVENTS.has(e)).toBe(true);
  });

  it("prints a sanitized event trace", () => {
    at("https://revvin.co/?utm_source=ig");
    track("page_viewed");
    track("cta_clicked", { cta: "home_demo_inline" });
    track("cta_clicked", { cta: "home_tool_grader" });
    track("cta_clicked", { cta: "hero_setup_link" });
    at("https://revvin.co/signup?plan=monthly&invite=FRIEND42");
    for (const e of SIGNUP_STEPS) track(e, { invite_code: "FRIEND42" });
    track("signup_succeeded");
    const trace = rows().map((r) => ({ event: r.event, path: r.path, referrer: r.referrer, meta: r.meta, live_policy_ok: LIVE_POLICY_EVENTS.has(r.event) }));
    // eslint-disable-next-line no-console
    console.log("SANITIZED_TRACE " + JSON.stringify(trace));
    expect(trace.every((t) => t.live_policy_ok)).toBe(true);
    expect(JSON.stringify(trace)).not.toMatch(/FRIEND42|monthly|SECRET/);
  });
});
