import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import MetaPixel from "@/components/MetaPixel";
import { advertisingAllowed, pixelAllowedHere } from "@/lib/metaPermission";
import { track } from "@/lib/track";

const frame = () => document.querySelector('iframe[src="/ad-events.html"]') as HTMLIFrameElement | null;
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

beforeEach(() => { if (!AbortSignal.timeout) (AbortSignal as unknown as { timeout: () => AbortSignal }).timeout = () => new AbortController().signal; vi.useFakeTimers(); localStorage.clear(); sent.length = 0; trace("US"); Object.defineProperty(navigator, "doNotTrack", { value: null, configurable: true }); Object.defineProperty(navigator, "globalPrivacyControl", { value: false, configurable: true }); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); document.body.innerHTML = ""; });

describe("Meta pixel gating", () => {
  it("loads for an allowed US marketing visit and sends PageView", async () => {
    await mount("/pricing");
    expect(frame()).not.toBeNull();
    capture();
    expect(sent).toEqual(["PageView"]);
  });
  it("loads on a Meta landing click without forwarding its query to the iframe", async () => {
    await mount("/?utm_source=meta&fbclid=abc");
    expect(frame()).not.toBeNull();
    expect(frame()?.getAttribute("src")).toBe("/ad-events.html");
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
  it.each(["/?name=x", "/r/x?fbclid=abc"])("still blocks %s", async (path) => {
    await mount(path);
    expect(frame()).toBeNull();
  });
  it("does not load with GPC", async () => {
    Object.defineProperty(navigator, "globalPrivacyControl", { value: true, configurable: true });
    await mount("/"); expect(frame()).toBeNull();
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
    await act(async () => { nav("/r/acme"); });
    expect(frame()).toBeNull();
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
