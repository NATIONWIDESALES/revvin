import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SALE_END_ISO } from "@/config/pricing";
import SaleBanner from "@/components/billing/SaleBanner";
import PlanPicker from "@/components/billing/PlanPicker";
import { useSale } from "@/lib/useSale";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const response = (now: string) => new Response(JSON.stringify({ sale_live: Date.parse(now) < Date.parse(SALE_END_ISO), sale_end: SALE_END_ISO, server_now: now }));
function Surface() {
  const live = useSale();
  return <MemoryRouter><SaleBanner live={live} /><PlanPicker plan="monthly" onChange={() => {}} saleLive={live} /></MemoryRouter>;
}
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

describe("server-clock sale UI", () => {
  it("renders sale banner and both discounted prices, then removes them at expiry in the same tab", async () => {
    vi.useFakeTimers(); vi.setSystemTime("2026-12-01T06:58:00Z");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(response(new Date().toISOString()))));
    const { container } = render(<Surface />); await flush();
    expect(screen.getByRole("complementary", { name: "Early Black Friday sale" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /67.90/ })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /582/ })).toBeTruthy();
    expect(container.querySelectorAll(".line-through")).toHaveLength(2);
    await act(async () => { vi.advanceTimersByTime(60001); }); await flush();
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(screen.queryByRole("radio", { name: /67.90|582/ })).toBeNull();
    expect(container.querySelectorAll(".line-through")).toHaveLength(0);
    expect(screen.getByRole("radio", { name: /97\/month/ })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /970\/year/ })).toBeTruthy();
  });
  it("never advertises a sale after the server deadline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(SALE_END_ISO)));
    render(<Surface />); await flush();
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(screen.queryByRole("radio", { name: /67.90|582/ })).toBeNull();
  });
  it("uses the server clock even if the client clock is wrong", async () => {
    vi.useFakeTimers(); vi.setSystemTime("2030-01-01");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response("2026-11-16T21:10:00Z")));
    render(<Surface />); await flush();
    expect(screen.getByRole("radio", { name: /67.90/ })).toBeTruthy();
  });
  it("fails closed when sale state cannot be read", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<Surface />); await flush();
    expect(screen.queryByRole("complementary")).toBeNull();
  });
});