import { act, cleanup, render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { origamiAllowed, origamiMarketingPath } from "@/lib/origami";

const bot = vi.hoisted(() => ({ value: false }));
vi.mock("@/lib/botCheck", () => ({ isLikelyBot: () => bot.value }));

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  bot.value = false;
  Object.defineProperty(navigator, "globalPrivacyControl", { configurable: true, value: false });
  Object.defineProperty(navigator, "doNotTrack", { configurable: true, value: null });
  window.history.replaceState({}, "", "/");
});
afterEach(() => {
  cleanup();
  document.getElementById("origami-visitors")?.remove();
  vi.useRealTimers();
});

async function mount(path = "/") {
  window.history.replaceState({}, "", path);
  const { default: OrigamiVisitors } = await import("@/components/OrigamiVisitors");
  render(<BrowserRouter><OrigamiVisitors /></BrowserRouter>);
  act(() => { vi.advanceTimersByTime(100); });
}

function navigate(path: string) {
  act(() => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  act(() => { vi.advanceTimersByTime(100); });
}

describe("Origami marketing boundary", () => {
  it.each(["/", "/pricing", "/how-it-works", "/guides", "/guides/referral-guide", "/referral-program/roofing", "/tools/referral-reward-calculator", "/compare/example", "/about", "/partners", "/sample"])("allows marketing page %s", path => {
    expect(origamiMarketingPath(path)).toBe(true);
  });
  it.each(["/r/example", "/r/status/token", "/preview/example", "/dashboard", "/dashboard/settings", "/__sa", "/print/sign", "/auth", "/signup", "/login", "/reset-password", "/welcome", "/earn", "/earn/vancouver", "/me", "/referrer/user", "/partners/dashboard", "/unknown"])("does not load on %s", async path => {
    await mount(path);
    expect(document.getElementById("origami-visitors")).toBeNull();
  });
  it("loads only after first paint on a marketing page", async () => {
    const { default: OrigamiVisitors } = await import("@/components/OrigamiVisitors");
    render(<BrowserRouter><OrigamiVisitors /></BrowserRouter>);
    expect(document.getElementById("origami-visitors")).toBeNull();
    act(() => { vi.advanceTimersByTime(100); });
    const frame = document.getElementById("origami-visitors") as HTMLIFrameElement;
    expect(frame).not.toBeNull();
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
    expect(frame.srcdoc).toContain('data-key="og_pk_0eCVHRhHCdjnzxpeLe_iOQ"');
    expect(frame.referrerPolicy).toBe("no-referrer");
  });
  it.each(["globalPrivacyControl", "doNotTrack"])("does not load for %s", async signal => {
    Object.defineProperty(navigator, signal, { configurable: true, value: signal === "doNotTrack" ? "1" : true });
    expect(origamiAllowed("/")).toBe(false);
    await mount();
    expect(document.getElementById("origami-visitors")).toBeNull();
  });
  it("does not load for bots", async () => {
    bot.value = true;
    await mount();
    expect(document.getElementById("origami-visitors")).toBeNull();
  });
  it("does not duplicate on SPA navigation and destroys the provider before private pages", async () => {
    await mount();
    const frame = document.getElementById("origami-visitors");
    navigate("/pricing");
    expect(document.querySelectorAll("#origami-visitors")).toHaveLength(1);
    expect(document.getElementById("origami-visitors")).toBe(frame);
    navigate("/r/example");
    expect(document.getElementById("origami-visitors")).toBeNull();
    navigate("/pricing");
    expect(document.getElementById("origami-visitors")).toBeNull();
  });
  it("does not emit the provider in server-rendered HTML", async () => {
    const { default: OrigamiVisitors } = await import("@/components/OrigamiVisitors");
    expect(renderToString(<BrowserRouter><OrigamiVisitors /></BrowserRouter>)).not.toContain("origami-web-visitors.com");
  });
});