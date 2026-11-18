import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureFirstTouch, FIRST_TOUCH_KEY, readFirstTouch } from "@/lib/firstTouch";
import { acquisitionOf, capturePreview } from "@/lib/instantPreview";

beforeEach(() => sessionStorage.clear());

describe("first-touch acquisition", () => {
  it("keeps homepage campaign attribution after clicking through to signup", () => {
    captureFirstTouch("https://revvin.co/?utm_source=meta&utm_medium=paid_social&utm_campaign=signups_us&utm_content=ad1&utm_term=roofing&fbclid=private&name=private");
    expect(acquisitionOf(null, "https://revvin.co/signup")).toEqual({ landing_path: "/", utm_source: "meta", utm_medium: "paid_social", utm_campaign: "signups_us", utm_content: "ad1", utm_term: "roofing" });
  });
  it("captures a direct signup ad landing", () => {
    captureFirstTouch("https://revvin.co/signup?offer=bf2026&utm_source=meta&utm_content=bf");
    expect(acquisitionOf(null, "https://revvin.co/signup?offer=bf2026&utm_source=meta&utm_content=bf")).toEqual({ landing_path: "/signup", utm_source: "meta", utm_content: "bf" });
  });
  it("does not replace first touch on later document landings", () => {
    captureFirstTouch("https://revvin.co/?utm_source=meta");
    captureFirstTouch("https://revvin.co/pricing?utm_source=google");
    expect(acquisitionOf(null, "https://revvin.co/signup")).toEqual({ landing_path: "/", utm_source: "meta" });
  });
  it("stores only the landing pathname without UTMs", () => {
    captureFirstTouch("https://revvin.co/pricing?name=private#private");
    expect(readFirstTouch()).toEqual({ landing_path: "/pricing" });
    captureFirstTouch("https://revvin.co/signup?utm_source=meta");
    expect(acquisitionOf(null)).toEqual({ landing_path: "/pricing" });
  });
  it("bounds paths and campaign values", () => {
    captureFirstTouch(`https://revvin.co/guides/${"a".repeat(200)}?utm_campaign=${"b".repeat(300)}`);
    expect(readFirstTouch()?.landing_path).toBe(`/guides/${"a".repeat(152)}`);
    expect(readFirstTouch()?.utm_campaign).toBe("b".repeat(200));
  });
  it("does not capture private document loads", () => {
    captureFirstTouch("https://revvin.co/dashboard?utm_source=meta");
    expect(sessionStorage.getItem(FIRST_TOUCH_KEY)).toBeNull();
  });
  it("keeps preview precedence and its existing path validation", () => {
    captureFirstTouch("https://revvin.co/?utm_source=meta");
    const preview = capturePreview("Acme", "other", 100, "https://revvin.co/start?utm_source=preview");
    expect(acquisitionOf(preview)).toEqual({ landing_path: "/start", utm_source: "preview" });
  });
  it("falls back to the current URL if storage fails", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw Error("blocked"); });
    captureFirstTouch("https://revvin.co/?utm_source=meta");
    expect(acquisitionOf(null, "https://revvin.co/signup?utm_source=direct")).toEqual({ landing_path: "/signup", utm_source: "direct" });
    spy.mockRestore();
  });
  it("rejects stored query-bearing paths without including extra stored fields", () => {
    sessionStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify({ landing_path: "/signup?name=private" }));
    expect(readFirstTouch()).toBeNull();
    sessionStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify({ landing_path: "/", name: "private", fbclid: "private" }));
    expect(acquisitionOf(null)).toEqual({ landing_path: "/" });
  });
});