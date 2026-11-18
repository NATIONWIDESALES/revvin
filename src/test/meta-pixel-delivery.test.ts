import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { loadPixel } from "@/lib/metaPixelLoader";

const id = "1941132123224407";
let bridges: NonNullable<ReturnType<typeof loadPixel>>[] = [];
function setup(permitted = () => true) {
  const bridge = loadPixel(id, "test", permitted);
  const frame = document.querySelector("iframe") as HTMLIFrameElement | null;
  if (!bridge || !frame || !frame.contentWindow) throw Error("missing bridge");
  bridges.push(bridge);
  const post = vi.spyOn(frame.contentWindow, "postMessage");
  const ack = (sequence: number, origin = location.origin, source = frame.contentWindow) => window.dispatchEvent(new MessageEvent("message", { origin, source, data: { type: "revvin-pixel-ack", id, sequence } }));
  return { bridge, frame, post, ack };
}
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { for (const bridge of bridges) bridge.dispose(true); bridges = []; document.body.innerHTML = ""; vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Meta bridge dispatch drain", () => {
  it.each(["Lead", "CompleteRegistration", "PagePublished"])("retains an unacknowledged %s for exactly five seconds", event => {
    const { bridge, frame } = setup();
    frame.dispatchEvent(new Event("load")); bridge.send(event); bridge.dispose();
    vi.advanceTimersByTime(4999); expect(frame.isConnected).toBe(true);
    vi.advanceTimersByTime(1); expect(frame.isConnected).toBe(false);
  });
  it("flushes pending messages after frame load during the grace period", () => {
    const { bridge, frame, post, ack } = setup();
    bridge.send("CompleteRegistration"); bridge.dispose();
    expect(post).not.toHaveBeenCalled();
    frame.dispatchEvent(new Event("load"));
    expect(post).toHaveBeenCalledWith({ type: "revvin-pixel", id, event: "CompleteRegistration", sequence: 1 }, location.origin);
    ack(1); expect(frame.isConnected).toBe(false);
  });
  it("ignores foreign, wrong-source and unknown acknowledgments and drains all events", () => {
    const { bridge, frame, ack } = setup();
    frame.dispatchEvent(new Event("load")); bridge.send("Lead"); bridge.send("CompleteRegistration"); bridge.dispose();
    ack(1, "https://example.com"); ack(1, location.origin, window); ack(99);
    expect(frame.isConnected).toBe(true);
    ack(1); expect(frame.isConnected).toBe(true);
    ack(2); expect(frame.isConnected).toBe(false);
  });
  it("removes an idle or already acknowledged bridge immediately", () => {
    const { bridge, frame, ack } = setup();
    frame.dispatchEvent(new Event("load")); bridge.send("CompleteRegistration"); ack(1); bridge.dispose();
    expect(frame.isConnected).toBe(false);
    const idle = setup(); idle.bridge.dispose(); expect(idle.frame.isConnected).toBe(false);
  });
  it("does not extend the deadline or accept new events after disposal begins", () => {
    const { bridge, frame, post } = setup();
    frame.dispatchEvent(new Event("load")); bridge.send("Lead"); bridge.dispose();
    vi.advanceTimersByTime(4000); bridge.dispose(); bridge.send("CompleteRegistration");
    expect(post).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000); expect(frame.isConnected).toBe(false);
  });
  it("explicit revocation removes pending events immediately", () => {
    const { bridge, frame, post } = setup();
    bridge.send("CompleteRegistration"); bridge.dispose(); bridge.dispose(true);
    frame.dispatchEvent(new Event("load")); expect(post).not.toHaveBeenCalled(); expect(frame.isConnected).toBe(false);
  });
  it.each(["storage", "revvin:advertising-choice"])("revokes a departing bridge immediately on %s", event => {
    let allowed = true;
    const { bridge, frame, post } = setup(() => allowed);
    bridge.send("CompleteRegistration"); bridge.dispose(); allowed = false;
    window.dispatchEvent(new Event(event));
    expect(frame.isConnected).toBe(false);
    frame.dispatchEvent(new Event("load")); expect(post).not.toHaveBeenCalled();
  });
  it("rechecks permission before delayed frame-load dispatch", () => {
    let allowed = true;
    const { bridge, frame, post } = setup(() => allowed);
    bridge.send("CompleteRegistration"); bridge.dispose(); allowed = false;
    frame.dispatchEvent(new Event("load"));
    expect(frame.isConnected).toBe(false); expect(post).not.toHaveBeenCalled();
  });
});

describe("isolated Meta document acknowledgment", () => {
  it("acknowledges only after SDK readiness and track dispatch, with source/origin guards", () => {
    const html = readFileSync("public/ad-events.html", "utf8");
    const code = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    if (!code) throw Error("missing frame script");
    let receive: (event: unknown) => void = () => {};
    let script: { onload?: () => void } | undefined;
    const post = vi.fn(); const parent = { postMessage: post };
    const scope: Record<string, any> = {
      window: {}, parent, location: { origin: location.origin },
      addEventListener: (_: string, handler: typeof receive) => { receive = handler; },
      document: { createElement: () => ({}), head: { appendChild: (value: typeof script) => { script = value; } } },
    };
    runInNewContext(code, scope);
    const message = { origin: location.origin, source: parent, data: { type: "revvin-pixel", id, event: "CompleteRegistration", sequence: 1 } };
    receive({ ...message, origin: "https://example.com" }); receive({ ...message, source: {} });
    expect(script).toBeUndefined();
    receive(message);
    expect(post).not.toHaveBeenCalled();
    expect(scope.window.fbq.queue.map((args: unknown[]) => args[0])).toEqual(["set", "init"]);
    const calls = vi.fn(); scope.window.fbq.callMethod = calls;
    script?.onload?.();
    expect(calls).toHaveBeenCalledWith("track", "CompleteRegistration");
    expect(post).toHaveBeenCalledWith({ type: "revvin-pixel-ack", id, sequence: 1 }, location.origin);
    expect(calls.mock.invocationCallOrder[0]).toBeLessThan(post.mock.invocationCallOrder[0]);
    receive({ ...message, data: { ...message.data, sequence: 2, eventID: "reg_11111111-1111-4111-8111-111111111111", email: "must not pass" } });
    expect(calls).toHaveBeenLastCalledWith("track", "CompleteRegistration", {}, { eventID: "reg_11111111-1111-4111-8111-111111111111" });
  });
});