import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SignupForm from "@/components/signup/SignupForm";
import MetaPixel from "@/components/MetaPixel";
import OpenAiPixel from "@/components/OpenAiPixel";
import { track } from "@/lib/track";
import { SIGNUP_TRADES, signupCategory, signupTradeFromPreview } from "@/lib/signupTrade";
import { capturePreview, storePreview } from "@/lib/instantPreview";
import { PREVIEW_TRADES } from "@/content/previewTrades";
import { registrationPayload } from "../../supabase/functions/_shared/meta-registration";

const mocks = vi.hoisted(() => ({ signup: vi.fn(), invoke: vi.fn(), toast: vi.fn(), auth: { user: null as null | { id: string }, loading: false } }));
const userId = "11111111-1111-4111-8111-111111111111";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signUp: mocks.signup }, functions: { invoke: mocks.invoke } } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/lib/supabaseLazy", () => ({ loadSupabase: async () => ({ rpc: vi.fn() }), insertAsVisitor: async () => ({ error: null }) }));
vi.mock("@/lib/track", async importOriginal => {
  const original = await importOriginal<typeof import("@/lib/track")>();
  return { ...original, track: vi.fn(original.track) };
});

beforeEach(() => {
  if (!AbortSignal.timeout) Object.defineProperty(AbortSignal, "timeout", { configurable: true, value: () => new AbortController().signal });
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); delete window.oaiq; document.getElementById("openai-ad-pixel")?.remove();
  mocks.auth.user = null; mocks.auth.loading = false;
  Object.defineProperty(navigator, "webdriver", { value: false, configurable: true });
  Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 Chrome/150.0.0.0 Safari/537.36", configurable: true });
  window.history.replaceState({}, "", "/signup");
  Object.defineProperty(navigator, "doNotTrack", { value: null, configurable: true });
  Object.defineProperty(navigator, "globalPrivacyControl", { value: false, configurable: true });
  mocks.signup.mockResolvedValue({ data: { user: { id: userId }, session: { access_token: "test-session" } }, error: null });
  mocks.invoke.mockResolvedValue({ data: {}, error: null });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(String(url).includes("/cdn-cgi/trace") ? `h=${location.hostname}\nloc=US\n` : "{}")));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup(); localStorage.setItem("revvin_advertising_choice", "denied");
  window.dispatchEvent(new Event("revvin:advertising-choice"));
  vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});
function SignupFlow() { return <MemoryRouter initialEntries={["/signup"]}><MetaPixel /><OpenAiPixel /><SignupForm showStickyMobileBar={false} /></MemoryRouter>; }
function show() { return render(<SignupFlow />); }
async function choose(trade: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Your trade" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("option", { name: trade }));
}
function fill() {
  fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Fixture Business" } });
  fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "fixture@example.test" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "fixture-password" } });
}
async function submit() {
  fireEvent.submit(document.querySelector("form") as HTMLFormElement);
  await waitFor(() => expect(mocks.signup).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(track).toHaveBeenCalledWith("signup_succeeded"));
}

describe("signup trade qualification", () => {
  it("retains submit-time eligibility when signUp publishes auth before resolving", async () => {
    const view = show(); fireEvent.keyDown(window, { key: "Tab" });
    await waitFor(() => expect(window.oaiq?.q?.some(call => call[0] === "init")).toBe(true));
    let succeed: (value: unknown) => void = () => {};
    mocks.signup.mockImplementation(() => new Promise(resolve => { succeed = resolve; }));
    fill(); await choose("Roofing");
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);
    expect(mocks.signup).toHaveBeenCalledTimes(1);
    mocks.auth.user = { id: userId };
    view.rerender(<SignupFlow />);
    expect(window.oaiq?.q?.filter(call => call[0] === "consent")).toEqual([["consent", true]]);
    await act(async () => { succeed({ data: { user: { id: userId }, session: { access_token: "test-session" } }, error: null }); });
    await waitFor(() => expect(track).toHaveBeenCalledWith("signup_succeeded"));
    expect(window.oaiq?.q?.filter(call => call[0] === "measure")).toEqual([["measure", "registration_completed", { type: "customer_action" }, { event_id: `reg_${userId}` }]]);
    expect(window.oaiq?.q?.filter(call => call[0] === "consent")).toEqual([["consent", true]]);
  });
  it("sends a home-service registration through the pixel bridge and CAPI with the same event ID", async () => {
    show();
    fireEvent.keyDown(window, { key: "Tab" });
    const frame = await waitFor(() => {
      const element = document.querySelector<HTMLIFrameElement>('iframe[src^="/ad-events.html"]');
      if (!element?.contentWindow) throw Error("waiting for bridge");
      return element;
    });
    if (!frame.contentWindow) throw Error("missing bridge window");
    const post = vi.spyOn(frame.contentWindow, "postMessage");
    fireEvent.load(frame);
    await waitFor(() => expect(window.oaiq?.q?.some(call => call[0] === "init")).toBe(true));
    fill(); await choose("Roofing"); await submit();
    expect(mocks.signup.mock.calls[0][0].options.data).toMatchObject({ signup_trade: "Roofing", preview_trade: "Roofing" });
    await waitFor(() => expect(post).toHaveBeenCalledWith(expect.objectContaining({ event: "CompleteRegistration", eventID: `reg_${userId}` }), location.origin));
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("/meta-capi"))).toBe(true));
    const capi = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/meta-capi"));
    expect(String(capi?.[0])).toContain("/meta-capi");
    const serverEvent = registrationPayload({ userId, createdAt: new Date().toISOString(), advertisingAllowed: true, userAgent: "Fixture" }).data[0];
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ event: serverEvent.event_name, eventID: serverEvent.event_id }), location.origin);
    expect(track).toHaveBeenCalledWith("signup_completed", undefined, `reg_${userId}`);
    expect(window.oaiq?.q?.filter(call => call[0] === "measure")).toEqual([["measure", "registration_completed", { type: "customer_action" }, { event_id: `reg_${userId}` }]]);
    expect(JSON.parse(String(capi?.[1]?.body))).toMatchObject({ advertising_allowed: true, country: "US" });
  });
  it("records internal success but sends neither registration event nor CAPI for a non-home-service business", async () => {
    const conversion = vi.fn(); window.addEventListener("revvin:conversion", conversion);
    try {
      show(); fireEvent.keyDown(window, { key: "Tab" });
      await waitFor(() => expect(window.oaiq?.q?.some(call => call[0] === "init")).toBe(true));
      fill(); await choose("Not a home-service business"); await submit();
      expect(mocks.signup.mock.calls[0][0].options.data).toMatchObject({ signup_trade: "Not a home-service business", preview_trade: "Other" });
      expect(track).toHaveBeenCalledWith("signup_submitted");
      expect(track).not.toHaveBeenCalledWith("signup_completed", expect.anything(), expect.anything());
      expect(vi.mocked(track).mock.calls.some(([event]) => event === "signup_completed")).toBe(false);
      expect(conversion).not.toHaveBeenCalled();
      expect(window.oaiq?.q?.some(call => call[0] === "measure") ?? false).toBe(false);
      expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("/meta-capi"))).toBe(false);
    } finally { window.removeEventListener("revvin:conversion", conversion); }
  });
  it("never measures a qualified signup after advertising permission is withdrawn", async () => {
    show(); fireEvent.keyDown(window, { key: "Tab" });
    await waitFor(() => expect(window.oaiq?.q?.some(call => call[0] === "init")).toBe(true));
    localStorage.setItem("revvin_advertising_choice", "denied");
    act(() => window.dispatchEvent(new Event("revvin:advertising-choice")));
    fill(); await choose("Roofing"); await submit();
    expect(track).toHaveBeenCalledWith("signup_completed", undefined, `reg_${userId}`);
    expect(window.oaiq?.q?.some(call => call[0] === "measure") ?? false).toBe(false);
    expect(window.oaiq?.q?.[0]).toEqual(["consent", false]);
  });
  it("blocks submit without a trade using the missing-info toast", () => {
    show(); fill(); fireEvent.submit(document.querySelector("form") as HTMLFormElement);
    expect(mocks.signup).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Missing info", variant: "destructive" }));
  });
  it.each(["roofing", "landscaping", "pool-service", "garage-door", "remodeling"])("preselects preview trade %s", trade => {
    storePreview(capturePreview("Fixture", trade, 100, "https://revvin.co/start")); show();
    expect(screen.getByRole("combobox", { name: "Your trade" }).textContent).toBe(signupTradeFromPreview(trade));
  });
  it("uses the selected trade instead of an old preview category", async () => {
    storePreview(capturePreview("Fixture", "roofing", 100, "https://revvin.co/start")); show(); fill();
    await choose("Other home service"); await submit();
    expect(mocks.signup.mock.calls[0][0].options.data).toMatchObject({ signup_trade: "Other home service", preview_trade: "Home Services" });
  });
  it.each(PREVIEW_TRADES.filter(t => t.slug !== "auto-detailing"))("maps existing home-service preview $slug to a qualifying option", ({ slug }) => {
    const selection = signupTradeFromPreview(slug);
    expect(SIGNUP_TRADES.slice(0, -1)).toContain(selection);
  });
  it("does not assume a generic or auto-detailing preview qualifies", () => {
    expect(signupTradeFromPreview("other")).toBe("");
    expect(signupTradeFromPreview("auto-detailing")).toBe("Not a home-service business");
  });
  it.each([["Other home service", "Home Services"], ["Not a home-service business", "Other"], ["Landscaping and lawn care", "Landscaping"], ["Pool and spa", "Pool service"]] as const)("maps %s to existing category %s", (trade, category) => {
    expect(signupCategory(trade)).toBe(category);
  });
});