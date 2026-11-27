import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
const auth = vi.hoisted(() => ({ user: null as null | { id: string }, loading: false }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
import GoogleAdsTag from "@/components/GoogleAdsTag";
import { GOOGLE_TAG_ID } from "@/config/brand";
import { captureGoogleSignupEligibility, trackGoogleSignup, trackGooglePageView } from "@/lib/googleAds";

const account = "11111111-1111-4111-8111-111111111111";
const script = () => document.querySelector('script[src*="googletagmanager.com/"]');
const calls = () => (window.dataLayer ?? []).filter(entry => typeof entry === "object" && entry !== null && "0" in entry)
  .map(entry => Array.from(entry as ArrayLike<unknown>));
const events = (name: string) => calls().filter(call => call[0] === "event" && call[1] === name);
let navigate: (path: string) => void = () => {};
function Navigation() { navigate = useNavigate(); return null; }
async function flush() { await act(async () => { vi.advanceTimersByTime(3100); }); }
async function mount(path = "/") {
  window.history.replaceState({}, "", path);
  const view = render(<MemoryRouter initialEntries={[path]}><Navigation /><GoogleAdsTag /></MemoryRouter>);
  await flush(); return view;
}
async function go(path: string) {
  await act(async () => { window.history.replaceState({}, "", path); navigate(path); }); await flush();
}
function region(country = "US") {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(`h=${location.hostname}\nloc=${country}\n`)));
}
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear(); auth.user = null; auth.loading = false;
  delete window.gtag; delete window.dataLayer; script()?.remove(); region();
  if (!AbortSignal.timeout) (AbortSignal as unknown as { timeout: () => AbortSignal }).timeout = () => new AbortController().signal;
  for (const [name, value] of Object.entries({ webdriver: false, userAgent: "Mozilla/5.0 Chrome/150.0.0.0 Safari/537.36", globalPrivacyControl: false, doNotTrack: null }))
    Object.defineProperty(navigator, name, { value, configurable: true });
});
afterEach(() => { cleanup(); delete window.gtag; delete window.dataLayer; script()?.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Google tag permission and SPA page views", () => {
  it("loads the exact container once with one page view per eligible navigation", async () => {
    expect(GOOGLE_TAG_ID).toBe("GTM-TX7W9QD3");
    await mount("/?gclid=click&gbraid=braid&wbraid=web"); const original = script();
    expect(original?.getAttribute("src")).toBe("https://www.googletagmanager.com/gtm.js?id=GTM-TX7W9QD3");
    expect(original?.parentElement).toBe(document.head);
    act(() => window.dispatchEvent(new Event("pointerdown"))); await flush();
    await go("/pricing"); await go("/signup");
    expect(script()).toBe(original); expect(calls().filter(call => call[0] === "js")).toHaveLength(1);
    expect(events("page_view").map(call => (call[2] as { page_path: string }).page_path)).toEqual(["/", "/pricing", "/signup"]);
    expect(events("page_view")[0][2]).toEqual({ page_location: `${location.origin}/?gclid=click&gbraid=braid&wbraid=web`, page_path: "/" });
    expect(calls().find(call => call[0] === "set")?.[1]).toMatchObject({ send_page_view: false, allow_enhanced_conversions: false, allow_google_signals: false });
    expect(calls().find(call => call[0] === "config")?.[2]).toMatchObject({ send_page_view: false, allow_enhanced_conversions: false, ae_block_history: true, ae_block_form: true });
    expect(calls().filter(call => call[0] === "consent").every(call => (call[2] as { ad_user_data: string }).ad_user_data === "denied")).toBe(true);
  });
  it("does not install alongside an existing Google script", async () => {
    const existing = document.createElement("script"); existing.src = "https://www.googletagmanager.com/gtm.js?id=GTM-TX7W9QD3"; document.head.appendChild(existing);
    await mount(); expect(document.querySelectorAll('script[src*="googletagmanager.com/"]')).toHaveLength(1);
  });
  it("blocks stored refusal", async () => { localStorage.setItem("revvin_advertising_choice", "denied"); await mount(); expect(script()).toBeNull(); expect(window.dataLayer).toBeUndefined(); });
  it.each(["globalPrivacyControl", "doNotTrack", "webdriver"])("blocks %s", async name => {
    Object.defineProperty(navigator, name, { value: name === "doNotTrack" ? "1" : true, configurable: true }); await mount(); expect(script()).toBeNull();
  });
  it("blocks bot user agents", async () => { Object.defineProperty(navigator, "userAgent", { value: "Googlebot", configurable: true }); await mount(); expect(script()).toBeNull(); });
  it.each(["DE", "GB", "CH", "NO", "XX", "T1", ""])("blocks excluded/unresolved region %s", async country => { region(country); await mount(); expect(script()).toBeNull(); });
  it("fails closed on unavailable region", async () => { vi.stubGlobal("fetch", vi.fn(async () => { throw Error("offline"); })); await mount(); expect(script()).toBeNull(); });
  it("rechecks withdrawal during region lookup", async () => {
    let resolve: (response: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(done => { resolve = done; })));
    await mount(); localStorage.setItem("revvin_advertising_choice", "denied");
    await act(async () => { resolve(new Response(`h=${location.hostname}\nloc=US\n`)); }); expect(script()).toBeNull();
  });
  it.each(["/r/acme", "/dashboard", "/auth", "/__sa", "/partners", "/preview/x", "/sample", "/welcome", "/?demo=true", "/signup?email=private", "/?name=private"])("does not load on %s", async path => { await mount(path); expect(script()).toBeNull(); });
  it("remembers a demo visit on signup", async () => { await mount("/sample"); await go("/signup"); expect(script()).toBeNull(); expect(captureGoogleSignupEligibility()).toBeUndefined(); });
  it("waits for auth and blocks existing signed-in visitors", async () => { auth.loading = true; const view = await mount(); expect(script()).toBeNull(); auth.loading = false; auth.user = { id: account }; view.rerender(<MemoryRouter><Navigation /><GoogleAdsTag /></MemoryRouter>); await flush(); expect(script()).toBeNull(); });
  it("cleans validated preview handoff and retains all three Google click identifiers", async () => {
    await mount("/signup?name=Fixture&trade=roofing&reward=250&gclid=click&gbraid=braid&wbraid=web");
    expect(events("page_view")[0][2]).toEqual({ page_location: `${location.origin}/signup?gclid=click&gbraid=braid&wbraid=web`, page_path: "/signup" });
    expect(JSON.stringify(window.dataLayer)).not.toContain("Fixture");
  });
  it.each(["storage", "revvin:advertising-choice"])("immediately withdraws through %s and drops queued events", async event => {
    await mount("/signup"); const token = captureGoogleSignupEligibility();
    localStorage.setItem("revvin_advertising_choice", "denied"); act(() => window.dispatchEvent(new Event(event)));
    expect(events("page_view")).toHaveLength(0);
    expect(calls()).toEqual([["consent", "update", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }]]);
    expect(await trackGoogleSignup(account, "Roofing", token)).toBe(false);
    await go("/pricing"); expect(events("page_view")).toHaveLength(0);
  });
  it("does not send on private navigation or replay it on return", async () => {
    await mount(); await go("/dashboard"); expect(trackGooglePageView("private")).toBe(false);
    await go("/pricing"); expect(events("page_view").map(call => (call[2] as { page_path: string }).page_path)).toEqual(["/", "/pricing"]);
  });
});

describe("Google new account reporting", () => {
  it("never gates account creation on trade or transmits an unrecognized value", async () => {
    await mount("/signup"); const token = captureGoogleSignupEligibility();
    await act(async () => { expect(await trackGoogleSignup(account, "private@example.test", token)).toBe(true); });
    expect(events("sign_up")).toEqual([["event", "sign_up", { method: "email" }]]);
  });
  it("reports a non-home-service signup once despite the auth race and allows welcome only once", async () => {
    const view = await mount("/signup"); const token = captureGoogleSignupEligibility(); expect(token).toBeDefined();
    auth.user = { id: account }; view.rerender(<MemoryRouter><Navigation /><GoogleAdsTag /></MemoryRouter>);
    await act(async () => { expect(await trackGoogleSignup(account, "Not a home-service business", token)).toBe(true); });
    expect(await trackGoogleSignup(account, "Roofing", token)).toBe(false);
    expect(events("sign_up")).toEqual([["event", "sign_up", { method: "email", signup_trade: "Not a home-service business" }]]);
    await go("/welcome"); expect(events("page_view").filter(call => (call[2] as { page_path: string }).page_path === "/welcome")).toHaveLength(1);
    await go("/dashboard"); await go("/welcome");
    expect(events("page_view").filter(call => (call[2] as { page_path: string }).page_path === "/welcome")).toHaveLength(1);
    expect(JSON.stringify(window.dataLayer)).not.toContain(account);
  });
  it("does not report welcome for an existing account even after permitted anonymous loading", async () => {
    const view = await mount(); auth.user = { id: account }; view.rerender(<MemoryRouter><Navigation /><GoogleAdsTag /></MemoryRouter>);
    await go("/welcome"); expect(events("page_view")).toHaveLength(1);
    expect(await trackGoogleSignup(account, "Roofing")).toBe(false);
  });
  it("resolves permission for fast signup before the delayed tag starts", async () => {
    window.history.replaceState({}, "", "/signup"); render(<MemoryRouter initialEntries={["/signup"]}><Navigation /><GoogleAdsTag /></MemoryRouter>);
    const token = captureGoogleSignupEligibility();
    await act(async () => { expect(await trackGoogleSignup(account, "Roofing", token)).toBe(true); });
    expect(script()).not.toBeNull(); expect(events("sign_up")).toHaveLength(1);
  });
  it.each(["globalPrivacyControl", "doNotTrack"])("rechecks live %s for a signup snapshot", async name => {
    await mount("/signup"); const token = captureGoogleSignupEligibility();
    Object.defineProperty(navigator, name, { value: name === "doNotTrack" ? "1" : true, configurable: true });
    expect(await trackGoogleSignup(account, "Roofing", token)).toBe(false); expect(events("sign_up")).toHaveLength(0);
  });
});