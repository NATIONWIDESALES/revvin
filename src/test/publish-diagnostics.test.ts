import { expect, it, vi, beforeEach } from "vitest";
import { safeAnalyticsMeta } from "@/lib/analyticsPrivacy";
const h = vi.hoisted(() => ({ rpc: vi.fn(), track: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: h.rpc, functions: { invoke: vi.fn(async () => ({})) } } }));
vi.mock("@/lib/track", () => ({ track: h.track }));
import { publishPage } from "@/lib/publishPage";
beforeEach(() => { h.rpc.mockReset(); h.track.mockReset(); });
it.each([
  ["You need to be signed in.", "not_signed_in"],
  ["No business found on this account.", "no_business"],
  ["This account is disabled. Email info@revvin.co and we will sort it out.", "disabled"],
  ["Choose your page link before publishing.", "missing_slug"],
  ["Add your business name before publishing.", "missing_name"],
  ["Add the reward you pay before publishing.", "missing_reward"],
])("reports a fixed code for %s and preserves safe server wording", async (message, reason) => {
  h.rpc.mockResolvedValue({ error: { message, code: "P0001" } });
  expect((await publishPage("onboarding")).message).toBe(message);
  expect(h.track).toHaveBeenCalledWith("publish_failed", { surface: "onboarding", reason });
});
it.each([
  [{ message: "Only admins or backend services can modify subscription/account/billing fields", code: "P0001" }, "guard_rejected"],
  [{ message: "Failed to fetch private@example.test", code: "" }, "network"],
  [{ message: "private@example.test fixture-roofing", code: "P0001" }, "unknown"],
])("does not put unsafe errors in analytics or owner messages", async (error, reason) => {
  h.rpc.mockResolvedValue({ error });
  const result = await publishPage("dashboard_banner");
  expect(result.message).not.toBe(error.message);
  expect(h.track).toHaveBeenCalledWith("publish_failed", { surface: "dashboard_banner", reason });
});
it("allows reason only on failed product publish events and only from the fixed set", () => {
  const product = { path: "/welcome", traffic: "product" as const };
  expect(safeAnalyticsMeta("publish_failed", product, { reason: "guard_rejected" }).reason).toBe("guard_rejected");
  expect(safeAnalyticsMeta("publish_failed", product, { reason: "private@example.test" }).reason).toBeUndefined();
  expect(safeAnalyticsMeta("signup_succeeded", product, { reason: "network" }).reason).toBeUndefined();
  expect(safeAnalyticsMeta("publish_failed", { path: "/", traffic: "marketing" }, { reason: "network" }).reason).toBeUndefined();
});