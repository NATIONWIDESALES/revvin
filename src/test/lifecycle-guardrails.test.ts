import { describe, it, expect } from "vitest";
import {
  MAX_PER_24H,
  MAX_PER_7D,
  pickCandidate,
  promoAllowed,
  withinFrequencyCap,
  type Candidate,
} from "../../supabase/functions/_shared/lifecycle-rules";
import { LIFECYCLE_CATEGORIES, templateCategory } from "../../supabase/functions/_shared/lifecycle-categories";
import { REVVIN_POSTAL_ADDRESS } from "../../supabase/functions/_shared/lifecycle-config";
import { PRO_FEATURE_LABELS, MONTHLY_PRICE, ANNUAL_PRICE, PRO_PRICE_LINE } from "../../supabase/functions/_shared/pricing-copy";
import { PRO_FEATURES } from "@/config/planFeatures";
import { MONTHLY_PRICE as APP_MONTHLY, ANNUAL_PRICE as APP_ANNUAL } from "@/config/pricing";

const HOUR = 3600_000;
const NOW = Date.parse("2026-10-01T12:00:00.000Z");
const agoHours = (h: number) => new Date(NOW - h * HOUR).toISOString();

const ADDRESS = "Revvin, 1 Example St, Vancouver BC";

describe("lifecycle frequency cap", () => {
  it("caps at one email per 24 hours", () => {
    expect(MAX_PER_24H).toBe(1);
    expect(withinFrequencyCap([], NOW)).toBe(true);
    expect(withinFrequencyCap([agoHours(2)], NOW)).toBe(false);
    expect(withinFrequencyCap([agoHours(30)], NOW)).toBe(true);
  });

  it("caps at three emails per rolling 7 days", () => {
    expect(MAX_PER_7D).toBe(3);
    expect(withinFrequencyCap([agoHours(30), agoHours(80)], NOW)).toBe(true);
    expect(withinFrequencyCap([agoHours(30), agoHours(80), agoHours(120)], NOW)).toBe(false);
    // Older than the window, so it no longer counts.
    expect(withinFrequencyCap([agoHours(30), agoHours(80), agoHours(24 * 9)], NOW)).toBe(true);
  });
});

describe("promotional email gate", () => {
  it("is skipped entirely while the postal address is empty", () => {
    expect(REVVIN_POSTAL_ADDRESS).toBe("");
    expect(promoAllowed({ postalAddress: "" })).toEqual({ allowed: false, reason: "no_postal_address" });
    expect(promoAllowed({ postalAddress: ADDRESS }).allowed).toBe(true);
  });

  it("stops permanently once the business is paying", () => {
    expect(promoAllowed({ postalAddress: ADDRESS, plan: "pro" })).toEqual({ allowed: false, reason: "already_pro" });
    for (const status of ["active", "trialing"]) {
      expect(promoAllowed({ postalAddress: ADDRESS, subscriptionStatus: status })).toEqual({
        allowed: false,
        reason: "subscription_active",
      });
    }
    expect(promoAllowed({ postalAddress: ADDRESS, subscriptionStatus: "canceled" }).allowed).toBe(true);
  });

  it("honours the promotional opt-out flag", () => {
    expect(promoAllowed({ postalAddress: ADDRESS, promoOptOut: true })).toEqual({
      allowed: false,
      reason: "promo_opted_out",
    });
  });
});

describe("choosing one email per run", () => {
  const candidates: Candidate[] = [
    { template: "free_d5", data: {} },
    { template: "no_leads_d7", data: {} },
  ];

  it("never repeats a template that is already in the ledger", () => {
    const picked = pickCandidate([{ template: "no_leads_d7", data: {} }], ["no_leads_d7"], {
      postalAddress: ADDRESS,
    });
    expect(picked).toBeNull();
  });

  it("skips promotional candidates and sends the setup email instead", () => {
    const picked = pickCandidate(candidates, [], { postalAddress: "" });
    expect(picked?.template).toBe("no_leads_d7");
  });

  it("sends the highest priority candidate when promotional email is allowed", () => {
    const picked = pickCandidate(candidates, [], { postalAddress: ADDRESS });
    expect(picked?.template).toBe("free_d5");
  });
});

describe("template categories", () => {
  it("marks the promotional templates as promo and the rest as setup", () => {
    expect(templateCategory("free_d10")).toBe("promo");
    expect(templateCategory("pro_welcome")).toBe("setup");
    const promos = Object.entries(LIFECYCLE_CATEGORIES)
      .filter(([, c]) => c === "promo")
      .map(([name]) => name)
      .sort();
    expect(promos).toEqual(
      ["first_lead_next_day", "free_d10", "free_d14", "free_d21", "free_d5", "winback_d30"].sort(),
    );
  });
});

describe("email copy pulls prices and Pro features from one source", () => {
  it("matches the app pricing config", () => {
    expect(MONTHLY_PRICE).toBe(APP_MONTHLY);
    expect(ANNUAL_PRICE).toBe(APP_ANNUAL);
    expect(PRO_PRICE_LINE).toContain(`$${APP_MONTHLY}/month`);
    expect(PRO_PRICE_LINE).toContain(`$${APP_ANNUAL}/year`);
  });

  it("matches the app Pro feature list", () => {
    expect(PRO_FEATURE_LABELS).toEqual(PRO_FEATURES.map((f) => f.label));
  });

  it("has no em dashes and makes no trial or discount claim", () => {
    const copy = [PRO_PRICE_LINE, ...PRO_FEATURE_LABELS].join(" ");
    expect(copy).not.toMatch(/[—–]/);
    expect(copy.toLowerCase()).not.toMatch(/trial|discount|founding/);
  });
});
