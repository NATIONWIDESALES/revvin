import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import MetaPixel from "@/components/MetaPixel";
import { advertisingAllowed, pixelAllowedHere } from "@/lib/metaPermission";
import { track } from "@/lib/track";
import { FBCLID_KEY, FBCLID_FIRST_SEEN_KEY, permittedFbclid } from "@/lib/metaClick";
import { capturePreview, previewSignupUrl, readPreview, cleanPreviewAddress } from "@/lib/instantPreview";

const frame = () => document.querySelector('iframe[src^="/ad-events.html"]') as HTMLIFrameElement | null;
let nav: (to: string) => void = () => {};
const Nav = () => { nav = useNavigate(); return null; };
const sent: string[] = [];

function trace(country: string) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(`h=${location.hostname}\nloc=${country}\n`)));
}
async function mount(path: string) {
  window.history.replaceState({}, "", path);
  render(<MemoryRouter initialEntries={[path]}><Nav /><MetaPixel /></MemoryRouter>);
  await act(async () => { vi.advanceTimersByTime(3100); });
  vi.useRealTimers();
  await act(async () => { await new Promise(r => setTimeout(r, 150)); });
}
function capture() {
  const f = frame();
  if (!f) return;
  vi.spyOn(f.contentWindow as Window, "postMessage").mockImplementation((m: unknown) => { sent.push((m as { event: string }).event); });
  f.dispatchEvent(new Event("load"));
}

beforeEach(() => { if (!AbortSignal.timeout) (AbortSignal as unknown as { timeout: () => AbortSignal }).timeout = () => new AbortController().signal; vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear(); sent.length = 0; trace("US"); Object.defineProperty(navigator, "doNotTrack", { value: null, configurable: true }); Object.defineProperty(navigator, "globalPrivacyControl", { value: false, configurable: true }); });
afterEach(() => { cleanup(); localStorage.setItem("revvin_advertising_choice", "denied"); window.dispatchEvent(new Event("revvin:advertising-choice")); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ""; });

describe("Meta pixel gating", () => {
  it("loads for an allowed US marketing visit and sends PageView", async () => {
    await mount("/pricing");
    expect(frame()).not.toBeNull();
    capture();
    expect(sent).toEqual(["PageView"]);
  });
  it("forwards only the permitted landing click to the iframe", async () => {
    await mount("/?utm_source=meta&fbclid=abc");
    expect(frame()).not.toBeNull();
    expect(frame()?.getAttribute("src")).toBe("/ad-events.html?fbclid=abc");
    expect(frame()?.referrerPolicy).toBe("no-referrer");
    expect(sessionStorage.getItem(FBCLID_KEY)).toBe("abc");
    expect(Number(sessionStorage.getItem(FBCLID_FIRST_SEEN_KEY))).toBeGreaterThan(0);
    capture();
    expect(sent).toEqual(["PageView"]);
  });
  it("loads on signup with fbclid", async () => {
    await mount("/signup?fbclid=abc");
    expect(frame()).not.toBeNull();
    capture();
    act(() => { track("signup_completed"); });
    expect(sent).toEqual(["CompleteRegistration"]);
  });
  it("persists the landing click through a later signup page without forwarding personal data", async () => {
    await mount("/?utm_source=meta&fbclid=abc_1.X-2");
    const timestamp = sessionStorage.getItem(FBCLID_FIRST_SEEN_KEY);
    capture();
    const landing = frame();
    act(() => { window.dispatchEvent(new MessageEvent("message", { origin: location.origin, source: landing?.contentWindow, data: { type: "revvin-pixel-ack", id: "1941132123224407", sequence: 1 } })); });
    cleanup(); vi.useFakeTimers();
    const data = capturePreview("Acme Roofing", "roofing", 250, "https://revvin.co/?utm_source=meta");
    await mount(`${previewSignupUrl(data)}&offer=bf2026&gclid=google&fbclid=abc_1.X-2`);
    expect(location.pathname).toBe("/signup");
    expect(location.search).toBe("?utm_source=meta&offer=bf2026&gclid=google&fbclid=abc_1.X-2");
    expect(readPreview()).toEqual(data);
    expect(sessionStorage.getItem(FBCLID_FIRST_SEEN_KEY)).toBe(timestamp);
    expect(frame()?.getAttribute("src")).toBe("/ad-events.html?fbclid=abc_1.X-2");
    capture(); sent.length = 0;
    act(() => { track("signup_completed"); });
    expect(sent).toEqual(["CompleteRegistration"]);
    const signup = frame();
    act(() => { window.dispatchEvent(new MessageEvent("message", { origin: location.origin, source: signup?.contentWindow, data: { type: "revvin-pixel-ack", id: "1941132123224407", sequence: 1 } })); });
    cleanup(); vi.useFakeTimers();
    await mount("/signup");
    expect(frame()?.getAttribute("src")).toBe("/ad-events.html?fbclid=abc_1.X-2");
  });
  it.each(["/signup", "/welcome"])("stores preview fields before cleaning %s and loading the pixel", async path => {
    await mount(`${path}?name=Acme&trade=roofing&reward=250&landing_path=/&phone=5551234&city=Vancouver&offer=bf2026&utm_source=meta&fbclid=abc`);
    expect(readPreview()?.name).toBe("Acme");
    expect(readPreview()?.phone).toBe("5551234");
    expect(location.search).toBe("?offer=bf2026&utm_source=meta&fbclid=abc");
    expect(frame()?.getAttribute("src")).toBe("/ad-events.html?fbclid=abc");
  });
  it("keeps the URL and pixel blocked when preview storage fails", async () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("blocked"); });
    await mount("/signup?name=Acme&trade=roofing&reward=250&fbclid=abc");
    expect(location.search).toBe("?name=Acme&trade=roofing&reward=250&fbclid=abc");
    expect(frame()).toBeNull();
    spy.mockRestore();
  });
  it("does not clean or enable an invalid preview or unknown personal key", async () => {
    await mount("/signup?name=Acme&reward=-1&fbclid=abc");
    expect(location.search).toContain("name=Acme");
    expect(frame()).toBeNull();
    cleanup(); vi.useFakeTimers();
    await mount("/welcome?name=Acme&reward=250&email=private&fbclid=abc");
    expect(location.search).toContain("email=private");
    expect(frame()).toBeNull();
  });
  it.each(["", "a%20b", "a%2Fb", "a%40b", "a%2Bb", "abc&fbclid=def", "abc&fbclid=abc", "é", "a".repeat(501)])("rejects malformed or duplicate click IDs: %s", async value => {
    await mount(`/?fbclid=${value}`);
    expect(frame()?.getAttribute("src")).toBe("/ad-events.html");
    expect(sessionStorage.getItem(FBCLID_KEY)).toBeNull();
  });
  it("accepts the exact 500-character limit and preserves first-seen time", () => {
    const value = "a".repeat(500);
    expect(permittedFbclid(`?fbclid=${value}`)).toBe(value);
    const timestamp = sessionStorage.getItem(FBCLID_FIRST_SEEN_KEY);
    expect(permittedFbclid("")).toBe(value);
    expect(permittedFbclid(`?fbclid=${value}`)).toBe(value);
    expect(sessionStorage.getItem(FBCLID_FIRST_SEEN_KEY)).toBe(timestamp);
    expect(permittedFbclid("?fbclid=bad%2Fvalue")).toBeNull();
    expect(permittedFbclid("")).toBeNull();
  });
  it("refuses corrupt persisted IDs and missing timestamps", () => {
    sessionStorage.setItem(FBCLID_KEY, "bad/value");
    sessionStorage.setItem(FBCLID_FIRST_SEEN_KEY, String(Date.now()));
    expect(permittedFbclid("")).toBeNull();
    sessionStorage.setItem(FBCLID_KEY, "abc");
    sessionStorage.removeItem(FBCLID_FIRST_SEEN_KEY);
    expect(permittedFbclid("")).toBeNull();
  });
  it("clears persisted click attribution when permission is withdrawn", async () => {
    await mount("/?fbclid=abc");
    localStorage.setItem("revvin_advertising_choice", "denied");
    act(() => { window.dispatchEvent(new Event("revvin:advertising-choice")); });
    expect(frame()).toBeNull();
    expect(sessionStorage.getItem(FBCLID_KEY)).toBeNull();
    expect(sessionStorage.getItem(FBCLID_FIRST_SEEN_KEY)).toBeNull();
  });
  it.each(["/r/x", "/preview/x", "/partners", "/__sa"])("does not store or clean data on excluded %s", async path => {
    await mount(`${path}?name=Acme&reward=250&fbclid=abc`);
    expect(cleanPreviewAddress()).toBe(false);
    expect(location.search).toContain("name=Acme");
    expect(frame()).toBeNull();
    expect(sessionStorage.getItem(FBCLID_KEY)).toBeNull();
  });
  it.each(["/?name=x", "/r/x?fbclid=abc"])("still blocks %s", async (path) => {
    await mount(path);
    expect(frame()).toBeNull();
  });
  it("does not load with GPC", async () => {
    Object.defineProperty(navigator, "globalPrivacyControl", { value: true, configurable: true });
    await mount("/?fbclid=abc"); expect(frame()).toBeNull();
    expect(sessionStorage.getItem(FBCLID_KEY)).toBeNull();
  });
  it("does not load with Do Not Track", async () => {
    Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true });
    await mount("/"); expect(frame()).toBeNull();
  });
  it("does not load after the advertising opt-out", async () => {
    localStorage.setItem("revvin_advertising_choice", "denied");
    await mount("/"); expect(frame()).toBeNull();
  });
  it("does not load for EU or UK visitors", async () => {
    trace("DE"); await mount("/"); expect(frame()).toBeNull();
  });
  it.each(["/r/acme", "/r/status/abc", "/preview/abc", "/dashboard?tab=leads", "/__sa", "/partners", "/partners/terms", "/earn", "/print/acme"])("does not load on %s", async (path) => {
    await mount(path); expect(frame()).toBeNull();
  });
  it("removes the frame when navigating to a private route", async () => {
    await mount("/");
    expect(frame()).not.toBeNull();
    capture();
    const current = frame();
    act(() => { window.dispatchEvent(new MessageEvent("message", { origin: location.origin, source: current?.contentWindow, data: { type: "revvin-pixel-ack", id: "1941132123224407", sequence: 1 } })); });
    await act(async () => { nav("/r/acme"); });
    expect(frame()).toBeNull();
  });
  it("keeps the same bridge across eligible signup-to-welcome navigation", async () => {
    await mount("/signup?fbclid=test"); capture();
    const original = frame();
    act(() => { track("signup_completed"); window.history.replaceState({}, "", "/welcome"); nav("/welcome"); });
    expect(frame()).toBe(original);
    expect(sent).toEqual(["CompleteRegistration"]);
  });
  it("maps conversion events to Meta events", async () => {
    await mount("/");
    capture(); sent.length = 0;
    act(() => { track("preview_submitted"); track("signup_completed"); track("page_published"); });
    expect(sent).toEqual(["Lead", "CompleteRegistration", "PagePublished"]);
  });
});

describe("pixel path rules", () => {
  it.each(["fbclid", "gclid", "msclkid", "ttclid", "li_fat_id", "utm_id"])("allows only the requested additional key %s on eligible pages", (key) => {
    for (const path of ["/", "/pricing", "/signup", "/welcome", "/dashboard", "/auth"]) {
      expect(pixelAllowedHere(path, `?${key}=abc`, "")).toBe(true);
      expect(pixelAllowedHere(path, `?${key}=abc&name=x`, "")).toBe(false);
      expect(pixelAllowedHere(path, `?${key}=abc`, "#private")).toBe(false);
    }
    expect(pixelAllowedHere("/r/x", `?${key}=abc`, "")).toBe(false);
  });
  it.each(["utm_extra", "fbclid_extra", "GCLID", "tab", "email"])("rejects the unlisted key %s", (key) => {
    for (const path of ["/", "/signup", "/welcome", "/dashboard", "/auth"]) {
      expect(pixelAllowedHere(path, `?${key}=x`, "")).toBe(false);
    }
  });
  it("allows US and Canada, blocks consent regions and unknown", () => {
    expect(advertisingAllowed("US")).toBe(true);
    expect(advertisingAllowed("CA")).toBe(true);
    for (const c of ["FR", "GB", "CH", "NO", null]) expect(advertisingAllowed(c)).toBe(false);
  });
  it("conversion pages allow only bare, campaign or offer queries", () => {
    expect(pixelAllowedHere("/signup", "?offer=bf2026", "")).toBe(true);
    expect(pixelAllowedHere("/signup", "?name=Private", "")).toBe(false);
    expect(pixelAllowedHere("/dashboard", "?tab=leads", "")).toBe(false);
  });
});
