import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const auth = vi.hoisted(() => ({ user: null as null | { id: string }, loading: false }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
import OpenAiPixel from "@/components/OpenAiPixel";
import { loadOpenAiPixel } from "@/lib/metaPixelLoader";
import { OPENAI_PIXEL_ID, OPENAI_PIXEL_DEBUG } from "@/config/brand";
import { trackOpenAiAdEvent } from "@/lib/openAiAds";

const frame = () => document.getElementById("openai-ad-pixel") as HTMLIFrameElement | null;
let navigate: (path: string) => void = () => {};
function Navigation() { navigate = useNavigate(); return null; }
async function mount(path = "/") {
  window.history.replaceState({}, "", path);
  render(<MemoryRouter initialEntries={[path]}><Navigation /><OpenAiPixel /></MemoryRouter>);
  await act(async () => { vi.advanceTimersByTime(3100); });
  vi.useRealTimers();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
}
async function go(path: string) {
  await act(async () => { window.history.replaceState({}, "", path); navigate(path); });
}
function documentHarness() {
  const code = readFileSync("public/ad-events.html", "utf8").match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (!code) throw Error("Missing advertising document");
  let receive: (event: unknown) => void = () => {};
  const requests: { src: string; async?: boolean }[] = [];
  const parent = { postMessage: vi.fn() };
  const scope = { window: {} as { oaiq?: { q: IArguments[] } }, parent, location: { origin: location.origin },
    addEventListener: (_type: string, handler: typeof receive) => { receive = handler; },
    document: { createElement: () => ({}), head: { appendChild: (script: typeof requests[number]) => requests.push(script) } } };
  runInNewContext(code, scope);
  const init = (data = { type: "revvin-openai-init", id: OPENAI_PIXEL_ID, debug: OPENAI_PIXEL_DEBUG }, origin = location.origin, source: unknown = parent) => receive({ origin, source, data });
  return { init, requests, scope };
}
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear(); auth.user = null; auth.loading = false;
  if (!AbortSignal.timeout) (AbortSignal as unknown as { timeout: () => AbortSignal }).timeout = () => new AbortController().signal;
  vi.stubGlobal("fetch", vi.fn(async () => new Response(`h=${location.hostname}\nloc=US\n`)));
  for (const [name, value] of Object.entries({ webdriver: false, userAgent: "Mozilla/5.0 Chrome/150.0.0.0 Safari/537.36", globalPrivacyControl: false, doNotTrack: null })) {
    Object.defineProperty(navigator, name, { value, configurable: true });
  }
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ""; });

describe("OpenAI init-only advertising permission", () => {
  it("uses the supplied ID and one debug flag, and initializes exactly once across eligible navigation", async () => {
    expect(OPENAI_PIXEL_ID).toBe("PsQihxvTbEPvdwqHWKuL2n"); expect(OPENAI_PIXEL_DEBUG).toBe(true);
    await mount(); const original = frame();
    if (!original?.contentWindow) throw Error("Missing permitted bridge");
    const harness = documentHarness();
    const post = vi.spyOn(original.contentWindow, "postMessage").mockImplementation(data => harness.init(data));
    original.dispatchEvent(new Event("load")); original.dispatchEvent(new Event("load"));
    window.dispatchEvent(new Event("pointerdown"));
    await go("/pricing"); await go("/signup");
    window.dispatchEvent(new CustomEvent("revvin:conversion", { detail: { name: "signup_completed", eventID: "reg_11111111-1111-4111-8111-111111111111" } }));
    expect(frame()).toBe(original); expect(post).toHaveBeenCalledTimes(1);
    expect(harness.requests.map(script => script.src)).toEqual(["https://bzrcdn.openai.com/sdk/oaiq.min.js"]);
    expect(harness.scope.window.oaiq?.q.map(args => Array.from(args))).toEqual([["init", { pixelId: "PsQihxvTbEPvdwqHWKuL2n", debug: true }]]);
  });
  it("consent off means no frame and no SDK request", async () => {
    localStorage.setItem("revvin_advertising_choice", "denied"); await mount();
    expect(frame()).toBeNull(); expect(document.querySelector('[src*="bzrcdn.openai.com"]')).toBeNull();
  });
  it("rechecks withdrawal after a pending region lookup", async () => {
    let resolve: (response: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(done => { resolve = done; })));
    await mount(); expect(frame()).toBeNull();
    localStorage.setItem("revvin_advertising_choice", "denied");
    await act(async () => { resolve(new Response(`h=${location.hostname}\nloc=US\n`)); });
    expect(frame()).toBeNull();
  });
  it("fails closed when region discovery fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw Error("unavailable"); }));
    await mount(); expect(frame()).toBeNull();
  });
  it("waits for unresolved account state without initializing", async () => {
    auth.loading = true; await mount(); expect(frame()).toBeNull();
  });
  it.each(["DE", "GB", "CH", "XX", "T1", ""])("skips consent or unresolved region %s", async country => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(`h=${location.hostname}\nloc=${country}\n`)));
    await mount(); expect(frame()).toBeNull();
  });
  it.each(["globalPrivacyControl", "doNotTrack", "webdriver"])("blocks %s", async name => {
    Object.defineProperty(navigator, name, { value: name === "doNotTrack" ? "1" : true, configurable: true });
    await mount(); expect(frame()).toBeNull();
  });
  it("blocks bot user agents", async () => {
    Object.defineProperty(navigator, "userAgent", { value: "Googlebot", configurable: true });
    await mount(); expect(frame()).toBeNull();
  });
  it.each(["/r/acme", "/r/status/private", "/dashboard", "/dashboard?tab=leads", "/welcome", "/auth", "/__sa", "/partners", "/preview/x", "/sample", "/?demo=true", "/signup?email=private"])("never loads on %s", async path => {
    await mount(path); expect(frame()).toBeNull();
  });
  it("keeps a demo visit excluded after navigation to signup", async () => {
    await mount("/sample"); await go("/signup"); window.dispatchEvent(new Event("pointerdown"));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    expect(frame()).toBeNull();
  });
  it("does not load for signed-in accounts, including demo accounts", async () => {
    auth.user = { id: "existing-account" }; await mount("/signup"); expect(frame()).toBeNull();
  });
  it.each(["storage", "revvin:advertising-choice"])("withdrawal removes the running SDK document immediately via %s", async type => {
    await mount(); expect(frame()).not.toBeNull();
    localStorage.setItem("revvin_advertising_choice", "denied");
    act(() => window.dispatchEvent(new Event(type))); expect(frame()).toBeNull();
  });
  it("disposes on a private transition and never replays init within this document", async () => {
    await mount(); expect(frame()).not.toBeNull(); await go("/dashboard"); expect(frame()).toBeNull();
    await go("/pricing"); window.dispatchEvent(new Event("pointerdown")); expect(frame()).toBeNull();
  });
  it("withdrawal during frame loading prevents delayed init", () => {
    let permitted = true; const bridge = loadOpenAiPixel(OPENAI_PIXEL_ID, true, () => permitted);
    const element = frame(); if (!element?.contentWindow || !bridge) throw Error("Missing bridge");
    const post = vi.spyOn(element.contentWindow, "postMessage"); permitted = false;
    element.dispatchEvent(new Event("load")); expect(post).not.toHaveBeenCalled(); expect(element.isConnected).toBe(false);
    bridge.dispose();
  });
  it("never forwards Meta click identifiers into the OpenAI document and blocks site storage", async () => {
    await mount("/?fbclid=abc"); expect(frame()?.getAttribute("src")).toBe("/ad-events.html");
    expect(frame()?.getAttribute("sandbox")).toBe("allow-scripts"); expect(frame()?.referrerPolicy).toBe("no-referrer");
  });
  it("guards init by source/origin, rejects duplicate init and ignores Meta events", () => {
    const h = documentHarness();
    h.init(undefined, "https://example.com"); h.init(undefined, location.origin, {}); expect(h.requests).toHaveLength(0);
    h.init(); h.init();
    h.init({ type: "revvin-pixel", id: "1941132123224407", debug: true });
    expect(h.requests).toHaveLength(1); expect(h.scope.window.oaiq?.q).toHaveLength(1);
  });
  it("the reserved helper sends nothing before vendor event semantics are supplied", () => {
    const call = vi.fn(); vi.stubGlobal("oaiq", call);
    expect(trackOpenAiAdEvent("vendor-event-pending", {})).toBe(false); expect(call).not.toHaveBeenCalled();
  });
});
