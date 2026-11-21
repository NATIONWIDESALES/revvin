import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { SEND_HASHED_EMAIL, eligibleBusinessRegistration, hashEmail, registrationPayload, registrationEventId, sendRegistration, gatewayTransport } from "../../supabase/functions/_shared/meta-registration";
import { registrationConsent, reportRegistration } from "@/lib/metaRegistration";
import { loadPixel } from "@/lib/metaPixelLoader";

const userId = "11111111-1111-4111-8111-111111111111";
const input = { userId, createdAt: "2026-11-18T23:34:00Z", advertisingAllowed: true, userAgent: "Dummy browser", ip: "192.0.2.1", fbc: "fb.1.1795044840000.dummy_click", fbp: "fb.1.1795044840000.12345" };
beforeEach(() => { if (!AbortSignal.timeout) Object.defineProperty(AbortSignal, "timeout", { configurable: true, value: () => new AbortController().signal }); localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, "", "/signup"); Object.defineProperty(navigator, "doNotTrack", { value: null, configurable: true }); Object.defineProperty(navigator, "globalPrivacyControl", { value: false, configurable: true }); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); document.body.innerHTML = ""; });

describe("Meta server registration", () => {
  it("accepts a new authenticated business signup before its business row is available", () => {
    const now = Date.parse(input.createdAt);
    expect(eligibleBusinessRegistration({ created_at: input.createdAt, user_metadata: { role: "business", signup_trade: "Roofing" } }, undefined, now)).toBe(true);
    expect(eligibleBusinessRegistration({ created_at: input.createdAt, user_metadata: { role: "business", signup_trade: "Roofing" } }, { is_demo: false }, now)).toBe(true);
  });
  it("excludes known demos, other signup intents and accounts outside the signup window", () => {
    const now = Date.parse(input.createdAt);
    const user = { created_at: input.createdAt, user_metadata: { role: "business", signup_trade: "Roofing" } };
    expect(eligibleBusinessRegistration(user, { is_demo: true }, now)).toBe(false);
    expect(eligibleBusinessRegistration({ ...user, user_metadata: { role: "business", is_demo: true } }, undefined, now)).toBe(false);
    expect(eligibleBusinessRegistration({ ...user, user_metadata: { role: "referrer" } }, undefined, now)).toBe(false);
    expect(eligibleBusinessRegistration(user, undefined, now + 600001)).toBe(false);
    expect(eligibleBusinessRegistration(user, undefined, now - 1)).toBe(false);
  });
  it.each(["Not a home-service business", "", undefined, "Yacht delivery"])("blocks server registration for unqualified trade %s", signup_trade => {
    expect(eligibleBusinessRegistration({ created_at: input.createdAt, user_metadata: { role: "business", signup_trade } }, undefined, Date.parse(input.createdAt))).toBe(false);
  });
  it("normalizes trimmed lowercase email before SHA-256, while matching remains disabled", async () => {
    vi.stubGlobal("crypto", webcrypto);
    expect(await hashEmail(" Test@Example.COM ")).toBe("973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b");
    expect(SEND_HASHED_EMAIL).toBe(false);
  });
  it("constructs only approved event and user-data fields from server occurrence time", () => {
    const payload = registrationPayload({ ...input, email: "not allowed", name: "not allowed" } as typeof input, "DUMMY_TEST");
    expect(payload).toEqual({ data: [{ event_name: "CompleteRegistration", event_time: 1795044840, event_id: `reg_${userId}`, action_source: "website", event_source_url: "https://revvin.co/signup", user_data: { client_user_agent: "Dummy browser", client_ip_address: "192.0.2.1", fbc: input.fbc, fbp: input.fbp } }], partner_agent: "lovable", test_event_code: "DUMMY_TEST" });
    expect(registrationPayload(input)).not.toHaveProperty("test_event_code");
    expect(registrationPayload({ ...input, fbc: "bad", fbp: "bad" }).data[0].user_data).toEqual({ client_user_agent: input.userAgent, client_ip_address: input.ip });
  });
  it("does not send or log when advertising permission is false", async () => {
    const transport = vi.fn(); const log = vi.fn();
    expect(await sendRegistration({ ...input, advertisingAllowed: false }, { token: "dummy", transport, log })).toBe("consent_blocked");
    expect(transport).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled();
  });
  it("quietly skips a missing token with the exact fixed diagnostic", async () => {
    const transport = vi.fn(); const log = vi.fn();
    expect(await sendRegistration(input, { transport, log })).toBe("disabled");
    expect(transport).not.toHaveBeenCalled(); expect(log).toHaveBeenCalledExactlyOnceWith("capi disabled: no token");
  });
  it("sends through the linked connection gateway with the dataset events path and no Meta token", async () => {
    const fetcher = vi.fn(async () => new Response("{}"));
    expect(await sendRegistration(input, { token: "conn-key", transport: gatewayTransport("lov-key", "conn-key", fetcher as unknown as typeof fetch) })).toBe("sent");
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://connector-gateway.lovable.dev/meta_ads/v26.0/1941132123224407/events");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer lov-key", "X-Connection-Api-Key": "conn-key" });
    const body = JSON.parse(init.body as string);
    expect(Object.keys(body).sort()).toEqual(["data", "partner_agent"]);
    expect(body.data[0].user_data.em).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/access_token|conn-key|lov-key/);
  });
  it("fails closed without a verified transport even when a token is configured", async () => {
    expect(await sendRegistration(input, { token: "dummy" })).toBe("connection_required");
  });
  it("keeps the same dedup identity across repeated attempts without claiming persistent once-only delivery", async () => {
    const transport = vi.fn(async () => new Response("{}"));
    await sendRegistration(input, { token: "dummy", transport });
    await sendRegistration(input, { token: "dummy", transport });
    expect(transport.mock.calls.map(call => (call as unknown as [ReturnType<typeof registrationPayload>])[0].data[0].event_id)).toEqual([`reg_${userId}`, `reg_${userId}`]);
  });
  it("uses the identical server event ID in the browser bridge without other matching data", () => {
    const bridge = loadPixel("1941132123224407");
    const frame = document.querySelector("iframe");
    if (!bridge || !frame?.contentWindow) throw Error("missing frame");
    const post = vi.spyOn(frame.contentWindow, "postMessage");
    frame.dispatchEvent(new Event("load"));
    bridge.send("CompleteRegistration", registrationEventId(userId));
    expect(post).toHaveBeenCalledWith({ type: "revvin-pixel", id: "1941132123224407", event: "CompleteRegistration", sequence: 1, eventID: registrationPayload(input).data[0].event_id }, location.origin);
    bridge.dispose(true);
  });
  it("never throws or retries on Meta errors and never logs response bodies", async () => {
    const log = vi.fn(); const transport = vi.fn(async () => new Response("potentially private error text", { status: 400 }));
    expect(await sendRegistration(input, { token: "dummy", log, transport })).toBe("failed");
    expect(transport).toHaveBeenCalledTimes(1); expect(log).toHaveBeenCalledExactlyOnceWith("capi status: 400");
  });
  it("times out after three seconds without blocking or retrying", async () => {
    vi.useFakeTimers();
    const transport = vi.fn(() => new Promise<Response>(() => {}));
    const result = sendRegistration(input, { token: "dummy", transport });
    await vi.advanceTimersByTimeAsync(3000);
    expect(await result).toBe("failed"); expect(transport).toHaveBeenCalledTimes(1);
  });
});

describe("signup advertising handoff", () => {
  const region = (loc: string) => vi.stubGlobal("fetch", vi.fn(async () => new Response(`h=${location.hostname}\nloc=${loc}\n`)));
  it("builds fbc from the persisted first-seen timestamp and accepts only a valid existing fbp", async () => {
    region("US"); window.history.replaceState({}, "", "/signup?fbclid=dummy_click");
    document.cookie = `_fbp=fb.1.${Date.now()}.12345; path=/`;
    const consent = await registrationConsent();
    expect(consent.advertising_allowed).toBe(true);
    expect(consent.fbc).toBe(`fb.1.${sessionStorage.getItem("revvin_fbclid_first_seen")}.dummy_click`);
    expect(consent.fbp).toMatch(/^fb\.1\.\d+\.12345$/);
    window.history.replaceState({}, "", "/signup");
    expect((await registrationConsent()).fbc).toBe(consent.fbc);
  });
  it.each(["refusal", "GPC", "DNT", "DE", "unknown", "excluded"])("blocks %s without reading identifiers", async reason => {
    region(reason === "DE" ? "DE" : reason === "unknown" ? "XX" : "US");
    if (reason === "refusal") localStorage.setItem("revvin_advertising_choice", "denied");
    if (reason === "GPC") Object.defineProperty(navigator, "globalPrivacyControl", { value: true, configurable: true });
    if (reason === "DNT") Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true });
    if (reason === "excluded") window.history.replaceState({}, "", "/r/dummy?fbclid=abc");
    const consent = await registrationConsent();
    expect(consent.advertising_allowed).toBe(false); expect(consent).not.toHaveProperty("fbc");
  });
  it("rechecks withdrawal before non-blocking signup dispatch and absorbs errors", async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error("offline"))); vi.stubGlobal("fetch", fetcher);
    const consent = { advertising_allowed: true, country: "US" };
    expect(reportRegistration(userId, "dummy", consent)).toBeUndefined();
    await Promise.resolve(); expect(fetcher).toHaveBeenCalledTimes(1);
    localStorage.setItem("revvin_advertising_choice", "denied");
    reportRegistration(userId, "dummy", consent); expect(fetcher).toHaveBeenCalledTimes(1);
  });
});