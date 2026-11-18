import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

const report = vi.hoisted(() => vi.fn());
vi.mock("@/lib/reportFailure", () => ({ reportFailure: report }));
const failure = new Error("Failed to fetch dynamically imported module: /assets/old.js");
let recovery: typeof import("@/lib/chunkRecovery");

function host() {
  const target = new EventTarget();
  return Object.assign(target, {
    location: { href: "https://revvin.co/pricing?offer=bf2026#plans", replace: vi.fn() },
    sessionStorage: window.sessionStorage,
  }) as unknown as Window;
}

beforeEach(async () => {
  vi.resetModules();
  sessionStorage.clear();
  report.mockClear();
  recovery = await import("@/lib/chunkRecovery");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("stale chunk recovery", () => {
  it.each([failure, new Error("Importing a module script failed"), Object.assign(new Error("Loading chunk 2 failed"), { name: "ChunkLoadError" })])("reloads matching chunk failures once with a cache-busted URL", error => {
    const browser = host();
    expect(recovery.recoverChunkLoad(error, browser, 1_000_000)).toBe(true);
    expect(browser.sessionStorage.getItem(recovery.CHUNK_RELOAD_KEY)).toBe("1000000");
    expect(browser.location.replace).toHaveBeenCalledExactlyOnceWith("https://revvin.co/pricing?offer=bf2026&_revvin_reload=1000000#plans");
    recovery.recoverChunkLoad(error, browser, 1_000_001);
    expect(browser.location.replace).toHaveBeenCalledTimes(1);
  });

  it("blocks a second reload in a fresh document for five minutes", async () => {
    const browser = host();
    recovery.recoverChunkLoad(failure, browser, 1_000_000);
    vi.resetModules();
    recovery = await import("@/lib/chunkRecovery");
    expect(recovery.recoverChunkLoad(failure, browser, 1_299_999)).toBe(false);
    expect(browser.location.replace).toHaveBeenCalledTimes(1);
    expect(recovery.recoverChunkLoad(failure, browser, 1_300_000)).toBe(true);
    expect(browser.location.replace).toHaveBeenCalledTimes(2);
  });

  it("the URL timestamp also prevents loops if session storage is cleared", () => {
    const browser = host();
    browser.location.href = "https://revvin.co/pricing?_revvin_reload=1000000";
    expect(recovery.recoverChunkLoad(failure, browser, 1_001_000)).toBe(false);
    expect(browser.location.replace).not.toHaveBeenCalled();
  });

  it("does not reload when storage is unavailable", () => {
    const browser = host();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(recovery.recoverChunkLoad(failure, browser)).toBe(false);
    expect(browser.location.replace).not.toHaveBeenCalled();
  });

  it("only prevents the Vite error while recovery navigation is underway", async () => {
    const browser = host();
    const remove = recovery.installChunkRecovery(browser);
    const event = Object.assign(new Event("vite:preloadError", { cancelable: true }), { payload: failure });
    browser.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(browser.location.replace).toHaveBeenCalledTimes(1);
    remove();
    vi.resetModules();
    recovery = await import("@/lib/chunkRecovery");
    recovery.installChunkRecovery(browser);
    const blocked = Object.assign(new Event("vite:preloadError", { cancelable: true }), { payload: failure });
    browser.dispatchEvent(blocked);
    expect(blocked.defaultPrevented).toBe(false);
    expect(browser.location.replace).toHaveBeenCalledTimes(1);
  });

  it("leaves unrelated errors and their reporting untouched", async () => {
    const browser = host();
    const error = new Error("ordinary render failure");
    expect(recovery.recoverChunkLoad(error, browser)).toBe(false);
    expect(browser.location.replace).not.toHaveBeenCalled();
    const Broken = recovery.lazyWithChunkRecovery(() => Promise.reject(error));
    render(<ErrorBoundary><Suspense fallback={null}><Broken /></Suspense></ErrorBoundary>);
    await screen.findByRole("button", { name: "Refresh Page" });
    expect(report).toHaveBeenCalledWith("render_crash", { error });
  });

  it("reports a persistent lazy chunk failure through the existing boundary", async () => {
    sessionStorage.setItem(recovery.CHUNK_RELOAD_KEY, String(Date.now()));
    const Broken = recovery.lazyWithChunkRecovery(() => Promise.reject(failure));
    render(<ErrorBoundary><Suspense fallback={null}><Broken /></Suspense></ErrorBoundary>);
    await screen.findByRole("button", { name: "Refresh Page" });
    expect(report).toHaveBeenCalledWith("render_crash", { error: failure });
  });

  it("a recovering lazy import stays pending instead of reporting a crash", async () => {
    const browser = host();
    const realWindow = window;
    vi.stubGlobal("window", new Proxy(realWindow, {
      get: (target, key) => key === "location" ? browser.location : Reflect.get(target, key),
    }));
    const Broken = recovery.lazyWithChunkRecovery(() => Promise.reject(failure));
    render(<ErrorBoundary><Suspense fallback={<span role="status" />}><Broken /></Suspense></ErrorBoundary>);
    await vi.waitFor(() => expect(browser.location.replace).toHaveBeenCalledTimes(1));
    expect(report).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Refresh Page" })).toBeNull();
  });
});