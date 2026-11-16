// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as promo from "../../supabase/functions/_shared/promo";
import * as prices from "../../supabase/functions/_shared/stripe-prices";
import * as emailPrices from "../../supabase/functions/_shared/pricing-copy";
import { SALE_PRICE_TEXT, MONTHLY_PRICE, ANNUAL_PRICE } from "@/config/pricing";

const before = new Date("2026-12-01T06:58:59.999Z");
const end = new Date("2026-12-01T06:59:00.000Z");
afterEach(() => vi.useRealTimers());

describe("Black Friday server rules", () => {
  it.each([["monthly", "xH7aouoN"], ["annual", "oe2UDUt4"]] as const)("selects the %s coupon before expiry", (plan, coupon) => {
    expect(promo.saleCouponFor(plan, before, prices.CHECKOUT_PRICE_VERSION)).toBe(coupon);
  });
  it.each(["monthly", "annual"] as const)("refuses %s at and after expiry", plan => {
    expect(promo.saleCouponFor(plan, end, prices.CHECKOUT_PRICE_VERSION)).toBeNull();
    expect(promo.saleCouponFor(plan, new Date("2026-12-02"), prices.CHECKOUT_PRICE_VERSION)).toBeNull();
  });
  it.each([undefined, "legacy", "unknown"])("refuses legacy/unknown version %s", version => {
    expect(promo.saleCouponFor("monthly", before, version)).toBeNull();
    expect(promo.saleCouponFor("annual", before, version)).toBeNull();
  });
  it("derives exact sale prices without changing regular pricing", () => {
    expect(promo.salePrices(MONTHLY_PRICE, ANNUAL_PRICE)).toEqual({ monthly: 67.9, annual: 582 });
    expect(SALE_PRICE_TEXT.monthly).toBe("$67.90");
    expect(SALE_PRICE_TEXT.annual).toBe("$582");
    expect([MONTHLY_PRICE, ANNUAL_PRICE]).toEqual([97, 970]);
  });
  it("never stacks with an applied invite", () => {
    expect(promo.checkoutPromotion("monthly", before, prices.CHECKOUT_PRICE_VERSION, true)).toEqual({ coupon: promo.PROMO_COUPON_MONTHLY, tag: "invite_17_monthly" });
  });
  it("a previous sale subscriber returns at regular pricing", () => {
    expect(promo.checkoutPromotion("monthly", before, prices.CHECKOUT_PRICE_VERSION, false, true)).toEqual({ coupon: null, tag: "none" });
  });
});

// Execute the actual handler, replacing external services only. No Stripe
// writes or real credentials are used by these checkout contract tests.
async function checkout(plan: string, now: Date, extra: Record<string, unknown> = {}, history: unknown[] = []) {
  vi.useFakeTimers(); vi.setSystemTime(now);
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const sessions = vi.fn().mockResolvedValue({ id: "fixture-session", url: "https://fixture.invalid/checkout" });
  class Stripe {
    customers = { list: vi.fn().mockResolvedValue({ data: history.length ? [{ id: "fixture-customer" }] : [] }) };
    subscriptions = { list: vi.fn().mockResolvedValue({ data: history, has_more: false }) };
    checkout = { sessions: { create: sessions } };
  }
  const client = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "fixture-user", email: "owner@fixture.invalid" } }, error: null }) } };
  const js = ts.transpileModule(readFileSync("supabase/functions/create-business-checkout/index.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const require = (id: string) => {
    if (id.includes("/http/server")) return { serve: (fn: typeof handler) => { handler = fn; } };
    if (id.includes("stripe@")) return Stripe;
    if (id.includes("supabase-js")) return { createClient: () => client };
    if (id.endsWith("stripe-prices.ts")) return prices;
    if (id.endsWith("promo.ts")) return promo;
    throw new Error(`Unexpected dependency ${id}`);
  };
  new Function("require", "exports", "Deno", js)(require, {}, { env: { get: () => "fixture-only" } });
  if (!handler) throw new Error("Missing checkout handler");
  const response = await handler(new Request("https://fixture.invalid", { method: "POST", headers: { Authorization: "Bearer fixture-only", "Content-Type": "application/json" }, body: JSON.stringify({ plan, price_version: prices.CHECKOUT_PRICE_VERSION, ...extra }) }));
  expect(response.status).toBe(200);
  return sessions.mock.calls[0]?.[0];
}

describe("actual checkout request", () => {
  it.each([["monthly", "xH7aouoN", "bf2026_monthly_30"], ["annual", "oe2UDUt4", "bf2026_annual_40"]])("applies %s discounts and both metadata tags", async (plan, coupon, tag) => {
    const request = await checkout(plan, before, { includeLaunchPackage: true });
    expect(request.discounts).toEqual([{ coupon }]);
    expect(request.metadata.promo).toBe(tag);
    expect(request.subscription_data.metadata.promo).toBe(tag);
    expect(request.line_items[1]).toEqual({ price: prices.PRICE_LAUNCH_PACKAGE_297, quantity: 1 });
    expect(request.allow_promotion_codes).toBeUndefined();
  });
  it.each(["monthly", "annual"])("sends no %s discount after expiry", async plan => {
    const request = await checkout(plan, end);
    expect(request.discounts).toBeUndefined();
    expect(request.metadata.promo).toBe("none");
    expect(request.subscription_data.metadata.promo).toBe("none");
  });
  it("leaves unversioned checkout at the legacy price with no sale", async () => {
    const request = await checkout("monthly", before, { price_version: undefined });
    expect(request.discounts).toBeUndefined();
    expect(request.line_items[0].price).toBe(prices.PRICE_MONTHLY_49);
  });
  it("does not apply a sale coupon when a canceled sale subscriber returns", async () => {
    const request = await checkout("monthly", before, {}, [{ id: "fixture-old", status: "canceled", metadata: { promo: "bf2026_monthly_30" } }]);
    expect(request.discounts).toBeUndefined();
    expect(request.metadata.promo).toBe("none");
  });
});

describe("trial-ending email only", () => {
  function render(today: boolean) {
    const js = ts.transpileModule(readFileSync("supabase/functions/_shared/transactional-email-templates/trial-ending.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
    const exports: Record<string, any> = {};
    const require = (id: string) => {
      if (id === "npm:react@18.3.1") return React;
      if (id.includes("@react-email/components")) return { Text: "p" };
      if (id === "../promo.ts") return promo;
      if (id === "../pricing-copy.ts") return emailPrices;
      if (id === "./revvin-shell.tsx") return { RevvinShell: ({ children }: any) => React.createElement("div", null, children), ctaButton: () => null, heading: {}, paragraph: {} };
      throw new Error(`Unexpected dependency ${id}`);
    };
    new Function("require", "exports", js)(require, exports);
    return renderToStaticMarkup(React.createElement(exports.template.component, { today }));
  }
  it.each([false, true])("includes sale line in existing trial notice (today=%s) only before end", today => {
    vi.useFakeTimers(); vi.setSystemTime(before);
    expect(render(today)).toContain("Pro is $67.90 a month or $582 a year");
    vi.setSystemTime(end);
    expect(render(today)).not.toContain("Early Black Friday");
  });
});