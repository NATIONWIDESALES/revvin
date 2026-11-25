import { describe, expect, it } from "vitest";
import { cardRewardAmount, clusterLabel, countLine, marketplaceSearch, openingView, parseMarketplaceParams, type DirectoryEntry } from "@/lib/directory";
import { cleanListingName, validateImportRow } from "../../supabase/functions/_shared/directory";
import { tradeIcon } from "@/components/marketplace/DirectoryCard";
import { Wrench, Zap, Building2 } from "lucide-react";

const biz = (o: Partial<DirectoryEntry>): DirectoryEntry => ({ kind: "business", slug: "a", name: "A", category: "Roofing", city: null, region: null, country: "US", lat: null, lng: null, is_pro: false, is_verified: false, has_reward: true, reward_text: "100", logo_url: null, ...o });

describe("marketplace map search", () => {
  it("header count uses thousands separators", () => {
    expect(countLine(1284)).toBe("1,284 businesses in this area");
    expect(countLine(1)).toBe("1 business in this area");
  });
  it("cluster labels go compact at 10,000", () => {
    expect(clusterLabel(9999)).toBe("9,999");
    expect(clusterLabel(12400)).toBe("12.4k");
  });
  it("reward pill amount follows the regulated rule", () => {
    expect(cardRewardAmount(biz({}))).toBe("$100");
    expect(cardRewardAmount(biz({ category: "Mortgage" }))).toBeNull();
    expect(cardRewardAmount(biz({ kind: "listing" }))).toBeNull();
  });
  it("shared URL round-trips and keeps other params", () => {
    const s = { lat: 33.45, lng: -112.07, z: 9, q: "pipe", trade: "Plumbing", rewards: true };
    const qs = marketplaceSearch("?utm_source=email", s);
    expect(qs).toContain("utm_source=email");
    const back = parseMarketplaceParams(qs);
    expect(back).toEqual({ ...s, lat: 33.45, lng: -112.07, z: 9 });
  });
  it("ignores bad URL values", () => {
    const p = parseMarketplaceParams("?lat=999&lng=1&z=3&trade=Nope");
    expect(p.lat).toBeNull();
    expect(p.trade).toBe("");
  });
  it("opening view: URL first, then time zone, else continental", () => {
    const url = parseMarketplaceParams("?lat=40&lng=-100&z=5");
    expect(openingView(url, "America/Phoenix")).toEqual({ lat: 40, lng: -100, z: 5 });
    const none = parseMarketplaceParams("");
    expect(openingView(none, "America/Phoenix")).toMatchObject({ lat: 33.45, z: 8 });
    expect(openingView(none, "Europe/Paris")).toBeNull();
  });
  it("trade icons", () => {
    expect(tradeIcon("Plumbing")).toBe(Wrench);
    expect(tradeIcon("Electrical")).toBe(Zap);
    expect(tradeIcon("Other")).toBe(Building2);
  });
});

describe("listing name cleanup", () => {
  it("strips variation selectors, zero-width and stray leading characters", () => {
    expect(cleanListingName("\uFE0F Acme Plumbing")).toBe("Acme Plumbing");
    expect(cleanListingName("\u200B*** Best\u200D Roofing ")).toBe("Best Roofing");
    expect(cleanListingName('"Quoted" Co')).toBe('"Quoted" Co');
    expect(cleanListingName("(Bracket) Co")).toBe("(Bracket) Co");
  });
  it("import applies it", () => {
    const r = validateImportRow({ name: "\uFE0F Acme", country: "US", source: "overture", source_id: "x", category: "Plumbing" });
    expect("row" in r && r.row.name).toBe("Acme");
  });
});

import { rewardPinLabel as pinLabel, rewardDollars as dollars, parseMarketplaceParams as parseMp, marketplaceSearch as mpSearch } from "@/lib/directory";
describe("earn mode", () => {
  it("mode=earn and the old rewards=1 both open earn mode, and links are written as mode=earn", () => {
    expect(parseMp("?mode=earn").rewards).toBe(true);
    expect(parseMp("?rewards=1").rewards).toBe(true);
    expect(parseMp("").rewards).toBe(false);
    const qs = mpSearch("?rewards=1", { lat: null, lng: null, z: null, q: "", trade: "", rewards: true });
    expect(qs).toBe("?mode=earn");
  });
  it("reward pin labels", () => {
    expect(pinLabel("$250")).toBe("$250");
    expect(pinLabel("1,000")).toBe("$1,000");
    expect(pinLabel("10% of the job")).toBe("10%");
    expect(pinLabel("Gift Certificate")).toBe("Gift card");
    expect(pinLabel("Free tune-up")).toBe("Reward");
    expect(dollars("$300.00 min 3 day delivery")).toBeNull();
  });
});
