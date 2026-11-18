import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { useBillingPlan } from "@/lib/useBillingPlan";
import { setPendingPlan } from "@/lib/pendingPlan";

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

it("keeps a pending Monthly choice when the dashboard sale check finishes", () => {
  setPendingPlan("monthly");
  const { result, rerender } = renderHook(({ live }) => useBillingPlan(live, true), { initialProps: { live: false } });
  rerender({ live: true });
  expect(result.current[0]).toBe("monthly");
});

it("keeps a Monthly click made before a public checkout sale response", () => {
  const { result, rerender } = renderHook(({ live }) => useBillingPlan(live), { initialProps: { live: false } });
  act(() => result.current[1]("monthly"));
  rerender({ live: true });
  expect(result.current[0]).toBe("monthly");
});

it("defaults to Yearly during the sale only when no choice exists", () => {
  const { result, rerender } = renderHook(({ live }) => useBillingPlan(live, true), { initialProps: { live: false } });
  expect(result.current[0]).toBe("monthly");
  rerender({ live: true });
  expect(result.current[0]).toBe("annual");
});

it("keeps an explicit Monthly choice across later sale refreshes", () => {
  const { result, rerender } = renderHook(({ live }) => useBillingPlan(live), { initialProps: { live: true } });
  act(() => result.current[1]("monthly"));
  rerender({ live: false });
  rerender({ live: true });
  expect(result.current[0]).toBe("monthly");
});