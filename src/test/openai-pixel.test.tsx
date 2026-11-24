import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
const auth = vi.hoisted(() => ({ user: null as null | { id: string }, loading: false }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
import OpenAiPixel from "@/components/OpenAiPixel";
import { OPENAI_PIXEL_ID, OPENAI_PIXEL_DEBUG } from "@/config/brand";
import { captureOpenAiSignupEligibility, initializeOpenAiAds, setOpenAiAdPermission, trackOpenAiAdEvent, withdrawOpenAiAds } from "@/lib/openAiAds";
import { acquisitionOf, cleanPreviewAddress } from "@/lib/instantPreview";
import { captureFirstTouch, FIRST_TOUCH_KEY } from "@/lib/firstTouch";
import { captureAttribution } from "@/lib/attribution";

const script = () => document.querySelector<HTMLScriptElement>('script[src="https://bzrcdn.openai.com/sdk/oaiq.min.js"]');
const calls = () => window.oaiq?.q ?? [];
const id = "reg_11111111-1111-4111-8111-111111111111";
let navigate: (path: string) => void = () => {};
function Navigation() { navigate = useNavigate(); return null; }
async function mount(path = "/") {
  window.history.replaceState({}, "", path);
  const view = render(<MemoryRouter initialEntries={[path]}><Navigation /><OpenAiPixel /></MemoryRouter>);
  await act(async () => { vi.advanceTimersByTime(3100); });
  vi.useRealTimers();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  return view;
}
async function go(path: string) { await act(async () => { window.history.replaceState({}, "", path); navigate(path); }); }
function fakeFetch(country = "US", matching: unknown = false) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => String(url).includes("/cdn-cgi/trace")
    ? new Response(`h=${location.hostname}\nloc=${country}\n`)
    : new Response(JSON.stringify({ automatic_advanced_matching_enabled: matching }))));
}
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear(); auth.user = null; auth.loading = false;
  delete window.oaiq; script()?.remove();
  if (!AbortSignal.timeout) (AbortSignal as unknown as { timeout: () => AbortSignal }).timeout = () => new AbortController().signal;
  fakeFetch();
  for (const [name, value] of Object.entries({ webdriver: false, userAgent: "Mozilla/5.0 Chrome/150.0.0.0 Safari/537.36", globalPrivacyControl: false, doNotTrack: null })) Object.defineProperty(navigator, name, { value, configurable: true });
});
afterEach(() => { cleanup(); delete window.oaiq; script()?.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ""; });

describe("OpenAI top-level advertising permission", () => {
  it("initializes once in the top-level head with no user object, across SPA navigation", async () => {
    expect(OPENAI_PIXEL_ID).toBe("PsQihxvTbEPvdwqHWKuL2n"); expect(OPENAI_PIXEL_DEBUG).toBe(true);
    await mount("/?oppref=landing-token"); const original = script();
    expect(original?.parentElement).toBe(document.head); expect(document.querySelector("iframe")).toBeNull();
    expect(location.search).toBe("?oppref=landing-token");
    window.dispatchEvent(new Event("pointerdown")); await go("/pricing"); await go("/signup");
    expect(script()).toBe(original);
    expect(calls().filter(call => call[0] === "init")).toEqual([["init", { pixelId: "PsQihxvTbEPvdwqHWKuL2n", debug: true }]]);
    expect(calls()[0]).toEqual(["consent", true]);
  });
  it("consent off makes no vendor request", async () => {
    localStorage.setItem("revvin_advertising_choice", "denied"); await mount();
    expect(script()).toBeNull(); expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("openai.com"))).toBe(false);
  });
  it("rechecks withdrawal after a pending region lookup", async () => {
    let resolve: (response: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(done => { resolve = done; })));
    await mount(); localStorage.setItem("revvin_advertising_choice", "denied");
    await act(async () => { resolve(new Response(`h=${location.hostname}\nloc=US\n`)); });
    expect(script()).toBeNull();
  });
  it("rechecks withdrawal after a pending matching configuration lookup", async () => {
    let resolve: (response: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(async (url: string) => String(url).includes("/cdn-cgi/trace") ? new Response(`h=${location.hostname}\nloc=US\n`) : new Promise<Response>(done => { resolve = done; })));
    await mount(); localStorage.setItem("revvin_advertising_choice", "denied");
    await act(async () => { resolve(new Response('{"automatic_advanced_matching_enabled":false}')); });
    expect(script()).toBeNull();
  });
  it.each([true, null, "false"])("fails closed if automatic matching is enabled or unresolved: %s", async matching => {
    fakeFetch("US", matching); await mount(); expect(script()).toBeNull();
  });
  it("fails closed when discovery fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw Error("unavailable"); })); await mount(); expect(script()).toBeNull();
  });
  it("waits for unresolved account state", async () => { auth.loading = true; await mount(); expect(script()).toBeNull(); });
  it("preserves initialized attribution through an anonymous session recheck without granting a signed-in account", async () => {
    const view = await mount(); const vendor = vi.fn(); window.oaiq = vendor;
    auth.loading = true;
    view.rerender(<MemoryRouter><Navigation /><OpenAiPixel /></MemoryRouter>);
    expect(vendor).not.toHaveBeenCalled();
    auth.loading = false;
    view.rerender(<MemoryRouter><Navigation /><OpenAiPixel /></MemoryRouter>);
    expect(vendor).not.toHaveBeenCalled();
    auth.user = { id: "existing-account" };
    view.rerender(<MemoryRouter><Navigation /><OpenAiPixel /></MemoryRouter>);
    expect(vendor).not.toHaveBeenCalled();
    expect(trackOpenAiAdEvent("registration_completed", { type: "customer_action" }, { event_id: id })).toBe(false);
  });
  it.each(["DE", "GB", "CH", "XX", "T1", ""])("skips consent or unresolved region %s", async country => { fakeFetch(country); await mount(); expect(script()).toBeNull(); });
  it.each(["globalPrivacyControl", "doNotTrack", "webdriver"])("blocks %s", async name => {
    Object.defineProperty(navigator, name, { value: name === "doNotTrack" ? "1" : true, configurable: true }); await mount(); expect(script()).toBeNull();
  });
  it("blocks bot user agents", async () => {
    Object.defineProperty(navigator, "userAgent", { value: "Googlebot", configurable: true }); await mount(); expect(script()).toBeNull();
  });
  it.each(["/r/acme", "/r/status/private", "/dashboard", "/dashboard?tab=leads", "/welcome", "/auth", "/__sa", "/partners", "/preview/x", "/sample", "/?demo=true", "/signup?email=private"])("never loads on %s", async path => { await mount(path); expect(script()).toBeNull(); });
  it("keeps a demo visit excluded after navigation to signup", async () => { await mount("/sample"); await go("/signup"); window.dispatchEvent(new Event("pointerdown")); expect(script()).toBeNull(); });
  it("does not load for signed-in accounts", async () => { auth.user = { id: "existing-account" }; await mount("/signup"); expect(script()).toBeNull(); });
  it.each(["storage", "revvin:advertising-choice"])("calls vendor consent(false) immediately via %s and stops sends", async type => {
    await mount(); const vendor = vi.fn(); window.oaiq = vendor;
    localStorage.setItem("revvin_advertising_choice", "denied"); act(() => window.dispatchEvent(new Event(type)));
    expect(vendor).toHaveBeenCalledExactlyOnceWith("consent", false);
    expect(trackOpenAiAdEvent("registration_completed", { type: "customer_action" }, { event_id: id })).toBe(false);
    expect(vendor).toHaveBeenCalledTimes(1);
  });
  it("pauses sends on private navigation without withdrawing consent or reinitializing", async () => {
    await mount(); const vendor = vi.fn(); window.oaiq = vendor;
    await go("/dashboard"); expect(vendor).not.toHaveBeenCalled();
    expect(trackOpenAiAdEvent("registration_completed", { type: "customer_action" }, { event_id: id })).toBe(false);
    await go("/pricing"); window.dispatchEvent(new Event("pointerdown"));
    expect(vendor.mock.calls.some(call => call[0] === "init")).toBe(false);
  });
  it("revokes queued consent before a late SDK can drain or replay events", async () => {
    await mount("/signup"); expect(trackOpenAiAdEvent("registration_completed", { type: "customer_action" }, { event_id: id })).toBe(true);
    localStorage.setItem("revvin_advertising_choice", "denied"); act(() => window.dispatchEvent(new Event("revvin:advertising-choice")));
    expect(calls()).toEqual([["consent", false], ["init", { pixelId: OPENAI_PIXEL_ID, debug: true }]]);
  });
  it("preserves oppref through preview cleanup and excludes it from our acquisition storage", async () => {
    await mount("/signup?name=Fixture&trade=roofing&reward=250&oppref=landing-token&fbclid=meta-token&utm_source=openai");
    cleanPreviewAddress(); expect(location.search).toContain("oppref=landing-token"); expect(script()).not.toBeNull();
    captureFirstTouch(location.href); captureAttribution(location.search);
    expect(sessionStorage.getItem(FIRST_TOUCH_KEY)).not.toContain("landing-token");
    expect([...Array(sessionStorage.length)].map((_, i) => sessionStorage.getItem(sessionStorage.key(i) ?? "")).join()).not.toContain("landing-token");
    expect(JSON.stringify(acquisitionOf(null, location.href))).not.toContain("landing-token");
    expect([...Array(localStorage.length)].map((_, i) => localStorage.getItem(localStorage.key(i) ?? "")).join()).not.toContain("landing-token");
  });
});

describe("OpenAI registration transport", () => {
  it("queues the captured signup once when auth flips before the helper, without consent(false)", async () => {
    const view = await mount("/signup");
    const snapshot = captureOpenAiSignupEligibility();
    expect(snapshot).toBeDefined();
    auth.user = { id: "11111111-1111-4111-8111-111111111111" };
    view.rerender(<MemoryRouter><Navigation /><OpenAiPixel /></MemoryRouter>);
    await go("/dashboard");
    expect(trackOpenAiAdEvent("registration_completed", { type: "customer_action" }, { event_id: id }, snapshot)).toBe(true);
    expect(trackOpenAiAdEvent("registration_completed", { type: "customer_action" }, { event_id: id }, snapshot)).toBe(false);
    expect(trackOpenAiAdEvent("registration_completed", { type: "customer_action" }, { event_id: "reg_22222222-2222-4222-8222-222222222222" }, snapshot)).toBe(false);
    expect(trackOpenAiAdEvent("registration_completed", { type: "customer_action" }, { event_id: "reg_33333333-3333-4333-8333-333333333333" })).toBe(false);
    expect(calls().filter(call => call[0] === "measure")).toEqual([["measure", "registration_completed", { type: "customer_action" }, { event_id: id }]]);
    expect(calls().filter(call => call[0] === "consent")).toEqual([["consent", true]]);
  });
  it("cannot capture signup eligibility after a real opt-out before submit", async () => {
    await mount("/signup");
    localStorage.setItem("revvin_advertising_choice", "denied");
    act(() => window.dispatchEvent(new Event("revvin:advertising-choice")));
    expect(captureOpenAiSignupEligibility()).toBeUndefined();
    expect(trackOpenAiAdEvent("registration_completed", { type: "customer_action" }, { event_id: id })).toBe(false);
    expect(calls().some(call => call[0] === "measure")).toBe(false);
  });
  it.each(["refusal", "globalPrivacyControl", "doNotTrack"])("a live %s overrides a pre-submit snapshot even after sign-in", async reason => {
    const view = await mount("/signup"); const snapshot = captureOpenAiSignupEligibility();
    expect(snapshot).toBeDefined();
    auth.user = { id: "new-account" };
    view.rerender(<MemoryRouter><Navigation /><OpenAiPixel /></MemoryRouter>);
    if (reason === "refusal") localStorage.setItem("revvin_advertising_choice", "denied");
    else Object.defineProperty(navigator, reason, { value: reason === "doNotTrack" ? "1" : true, configurable: true });
    expect(trackOpenAiAdEvent("registration_completed", { type: "customer_action" }, { event_id: id }, snapshot)).toBe(false);
    expect(calls().some(call => call[0] === "measure")).toBe(false);
    expect(calls()[0]).toEqual(["consent", false]);
  });
  it("sends the exact authorized event once with Meta's deterministic ID and no customer fields", async () => {
    setOpenAiAdPermission(() => true); await initializeOpenAiAds();
    const vendor = vi.fn(); window.oaiq = vendor;
    const params = { type: "customer_action" as const, email: "must-not-pass@example.test" };
    expect(trackOpenAiAdEvent("registration_completed", params, { event_id: id })).toBe(true);
    expect(trackOpenAiAdEvent("registration_completed", params, { event_id: id })).toBe(false);
    expect(vendor).toHaveBeenCalledExactlyOnceWith("measure", "registration_completed", { type: "customer_action" }, { event_id: "reg_11111111-1111-4111-8111-111111111111" });
  });
  it("drops refused events and never replays them", async () => {
    let allowed = true; setOpenAiAdPermission(() => allowed); await initializeOpenAiAds();
    const vendor = vi.fn(); window.oaiq = vendor; allowed = false;
    expect(trackOpenAiAdEvent("registration_completed", { type: "customer_action" }, { event_id: id })).toBe(false);
    expect(vendor).toHaveBeenCalledExactlyOnceWith("consent", false);
    allowed = true; await initializeOpenAiAds(); expect(vendor.mock.calls.some(call => call[0] === "measure")).toBe(false);
  });
  it("rejects malformed event IDs", async () => {
    setOpenAiAdPermission(() => true); await initializeOpenAiAds(); const vendor = vi.fn(); window.oaiq = vendor;
    expect(trackOpenAiAdEvent("registration_completed", { type: "customer_action" }, { event_id: "reg_not-a-uuid" })).toBe(false);
    expect(vendor).not.toHaveBeenCalled(); withdrawOpenAiAds();
  });
});
