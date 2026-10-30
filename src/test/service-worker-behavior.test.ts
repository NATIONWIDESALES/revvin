import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";

/**
 * Runs the real worker source in a sandbox with fake caches and fetch, so the
 * strategy itself is tested rather than strings in the file.
 */
function loadWorker(version = "NEW", existing: Record<string, Map<string, Response>> = {}) {
  const src = readFileSync("src/pwa/service-worker.js", "utf8")
    .replaceAll("__VERSION__", version)
    .replaceAll("__PRECACHE__", JSON.stringify(["/offline.html", "/assets/index-abc.js"]))
    .replaceAll("__VAPID_PUBLIC_KEY__", "k")
    .replaceAll("__RESUBSCRIBE_URL__", "/functions/v1/push-resubscribe");

  const store: Record<string, Map<string, Response>> = { ...existing };
  const keyOf = (r: Request | string) => (typeof r === "string" ? new URL(r, "https://revvin.co").href : r.url);
  const openCache = (name: string) => {
    store[name] ??= new Map();
    const m = store[name];
    return {
      match: async (r: Request | string) => m.get(keyOf(r))?.clone(),
      put: async (r: Request | string, res: Response) => void m.set(keyOf(r), res),
      add: async (r: Request | string) => void m.set(keyOf(r), new Response(`cached ${keyOf(r)}`)),
      keys: async () => [...m.keys()].map((k) => new Request(k)),
      delete: async (r: Request | string) => m.delete(keyOf(r)),
    };
  };
  const caches = {
    open: async (n: string) => openCache(n),
    keys: async () => Object.keys(store),
    delete: async (n: string) => delete store[n],
    match: async () => undefined,
  };
  const listeners: Record<string, (e: unknown) => void> = {};
  const fetchMock = vi.fn(async (req: Request) => new Response(`network ${req.url}`, { headers: { "content-type": "text/html" } }));
  const self = {
    location: new URL("https://revvin.co/"),
    addEventListener: (t: string, fn: (e: unknown) => void) => (listeners[t] = fn),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}), matchAll: async () => [], openWindow: async () => {} },
    registration: { showNotification: async () => {}, pushManager: {} },
  };
  class SwRequest extends Request { constructor(u: string | Request, init?: RequestInit) { super(typeof u === "string" ? new URL(u, "https://revvin.co").href : u, init); } }
  vm.runInNewContext(src, { self, caches, fetch: fetchMock, URL, Request: SwRequest, Response, Promise, console, setTimeout, clearTimeout });
  const dispatch = async (type: string, extra: Record<string, unknown> = {}) => {
    let waited: Promise<unknown> | undefined;
    let responded: Promise<Response> | undefined;
    listeners[type]({ ...extra, waitUntil: (p: Promise<unknown>) => (waited = p), respondWith: (p: Promise<Response>) => (responded = p) });
    await waited;
    return responded ? await responded : undefined;
  };
  return { store, self, fetchMock, dispatch };
}

const navRequest = (path: string) =>
  ({ url: `https://revvin.co${path}`, method: "GET", mode: "navigate", destination: "document", headers: new Headers({ accept: "text/html" }) }) as unknown as Request;

describe("service worker strategy", () => {
  it("never answers a navigation from cache while online, even when an old build cached that page", async () => {
    const stale = new Map([["https://revvin.co/compare/referralwise", new Response("old Not Found page")]]);
    const w = loadWorker("NEW", { "revvin-precache-NEW": stale, "revvin-assets-NEW": new Map(stale) });
    const res = await w.dispatch("fetch", { request: navRequest("/compare/referralwise") });
    expect(w.fetchMock).toHaveBeenCalledTimes(1);
    expect(await res!.text()).toBe("network https://revvin.co/compare/referralwise");
  });

  it("does not write HTML into any cache", async () => {
    const w = loadWorker();
    await w.dispatch("fetch", { request: navRequest("/pricing") });
    for (const m of Object.values(w.store)) expect([...m.keys()].some((k) => k.endsWith("/pricing"))).toBe(false);
  });

  it("serves the offline page only when the network fails", async () => {
    const w = loadWorker("NEW", { "revvin-precache-NEW": new Map([["https://revvin.co/offline.html", new Response("offline page")]]) });
    w.fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    const res = await w.dispatch("fetch", { request: navRequest("/pricing") });
    expect(await res!.text()).toBe("offline page");
  });

  it("takes over at once and deletes every cache from older builds on activate", async () => {
    const w = loadWorker("NEW", {
      "revvin-precache-20260901000000": new Map(),
      "revvin-assets-v1": new Map(),
      "revvin-images-v1": new Map(),
      "revvin-precache-NEW": new Map(),
      "revvin-assets-NEW": new Map(),
    });
    await w.dispatch("install");
    expect(w.self.skipWaiting).toHaveBeenCalled();
    await w.dispatch("activate");
    expect(Object.keys(w.store).sort()).toEqual(["revvin-assets-NEW", "revvin-precache-NEW"]);
    expect(w.self.clients.claim).toHaveBeenCalled();
  });

  it("precaches only the listed hashed files and the offline page", async () => {
    const w = loadWorker();
    await w.dispatch("install");
    expect([...w.store["revvin-precache-NEW"].keys()].sort()).toEqual([
      "https://revvin.co/assets/index-abc.js",
      "https://revvin.co/offline.html",
    ]);
  });

  it("leaves backend and cross-origin requests alone", async () => {
    const w = loadWorker();
    const api = { url: "https://x.supabase.co/rest/v1/leads", method: "GET", mode: "cors", destination: "", headers: new Headers() } as unknown as Request;
    expect(await w.dispatch("fetch", { request: api })).toBeUndefined();
    expect(w.fetchMock).not.toHaveBeenCalled();
  });
});
