import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { cardReward, claimedListingSlug, directoryRegulated, listingClaimPreview, type DirectoryEntry } from "@/lib/directory";
import { validateImportBatch, validateImportRow, mapDirectoryCategory, MAX_IMPORT_BATCH } from "../../supabase/functions/_shared/directory";
import { cityQueryFromBusiness } from "../../supabase/functions/_shared/geocode-city";
import { readPreview, previewSignupUrl } from "@/lib/instantPreview";
import { safeAnalyticsMeta, analyticsContext, analyticsEventAllowed, zoomBucket } from "@/lib/analyticsPrivacy";
import { FREE_FEATURES, PRO_FEATURES } from "@/config/planFeatures";

const biz = (o: Partial<DirectoryEntry>): DirectoryEntry => ({ kind: "business", slug: "a", name: "A", category: "Roofing", city: null, region: null, country: "US", lat: null, lng: null, is_pro: false, is_verified: false, has_reward: true, reward_text: "$250", logo_url: null, ...o });

describe("regulated categories", () => {
  it("Real Estate, Mortgage and Insurance never show a reward, in any spelling", () => {
    for (const c of ["Real Estate", "real-estate", "MORTGAGE", "Insurance"]) {
      expect(directoryRegulated(c)).toBe(true);
      expect(cardReward(biz({ category: c }))).toBeNull();
    }
    expect(directoryRegulated("Roofing")).toBe(false);
  });
  it("matches the database helper word for word", () => {
    const sql = readFileSync("drizzle/migrations/0049_marketplace_directory.sql", "utf8");
    expect(sql).toContain("IN ('realestate','mortgage','insurance')");
  });
  it("says the business pays the reward itself when the job closes", () => {
    expect(cardReward(biz({}))).toBe("Pays $250 per referral, paid by the business when the job closes");
    expect(cardReward(biz({ reward_text: "250" }))).toBe("Pays $250 per referral, paid by the business when the job closes");
    expect(cardReward(biz({ kind: "listing" }))).toBeNull();
  });
});

describe("import validation", () => {
  const ok = { name: "Acme", country: "us", source: "osm", source_id: "1", latitude: 40, longitude: -100, category: "plumber" };
  it("requires a name, US or CA, a source id and in-range coordinates", () => {
    expect(validateImportRow({ ...ok, name: " " })).toEqual({ error: "name_required" });
    expect(validateImportRow({ ...ok, country: "MX" })).toEqual({ error: "invalid_country" });
    expect(validateImportRow({ ...ok, source_id: "" })).toEqual({ error: "source_required" });
    expect(validateImportRow({ ...ok, latitude: 91 })).toEqual({ error: "invalid_coordinates" });
    expect(validateImportRow({ ...ok, longitude: null })).toEqual({ error: "invalid_coordinates" });
    const v = validateImportRow(ok);
    expect("row" in v && v.row).toMatchObject({ country: "US", category: "Plumbing" });
  });
  it("maps categories to the trade vocabulary or Other", () => {
    expect(mapDirectoryCategory("Electrician")).toBe("Electrical");
    expect(mapDirectoryCategory("Real estate agent")).toBe("Real Estate");
    expect(mapDirectoryCategory("Bakery")).toBe("Other");
  });
  it("caps a batch at 1,000 rows and keeps one row per source id", () => {
    expect(validateImportBatch(Array(MAX_IMPORT_BATCH + 1).fill(ok))).toEqual({ error: "batch_too_large" });
    const r = validateImportBatch([ok, { ...ok, name: "Acme 2" }, { name: "" }]);
    expect("rows" in r && r.rows.map((x) => x.name)).toEqual(["Acme 2"]);
    expect("rows" in r && r.rejected).toEqual([{ index: 2, error: "name_required" }]);
  });
});

describe("claim handoff", () => {
  it("carries the listing to signup and back to onboarding", () => {
    const data = listingClaimPreview({ slug: "acme-plumbing-denver", name: "Acme Plumbing", category: "Plumbing", city: "Denver", region: "CO", country: "US", postal_code: null, lat: 1, lng: 1, phone: null, website: null, source: "osm", source_license: null, status: "unclaimed", claimed_slug: null });
    const back = readPreview(new URL(previewSignupUrl(data), "https://revvin.co").search);
    expect(back).toMatchObject({ name: "Acme Plumbing", trade: "plumbing", city: "Denver", region: "CO", landing_path: "/b/acme-plumbing-denver" });
    expect(claimedListingSlug(back?.landing_path)).toBe("acme-plumbing-denver");
    expect(claimedListingSlug("/preview/abc")).toBeNull();
  });
});

describe("city geocoding", () => {
  it("builds a city query only when the place is specific enough", () => {
    expect(cityQueryFromBusiness({ service_area: "Memphis, TN" })).toBe("Memphis, TN");
    expect(cityQueryFromBusiness({ service_area: "Marietta GA" })).toBe("Marietta, GA");
    expect(cityQueryFromBusiness({ city: "Phoenix", country: "United States" })).toBe("Phoenix, United States");
    expect(cityQueryFromBusiness({ city: "Lakewood" })).toBeNull();
  });
});

describe("marketplace events", () => {
  it("are public and carry only a zoom bucket or a card kind", () => {
    const ctx = analyticsContext("https://revvin.co/marketplace", "anonymous")!;
    for (const e of ["marketplace_viewed", "marketplace_map_moved", "marketplace_card_clicked"]) expect(analyticsEventAllowed(e, ctx)).toBe(true);
    const b = analyticsContext("https://revvin.co/b/acme-plumbing-denver", "anonymous")!;
    expect(b.path).toBe("/b/:listing");
    for (const e of ["listing_viewed", "listing_claim_clicked", "listing_removal_requested"]) expect(analyticsEventAllowed(e, b)).toBe(true);
    expect(safeAnalyticsMeta("marketplace_map_moved", ctx, { zoom: zoomBucket(3), lat: 1 })).toMatchObject({ zoom: "continent" });
    expect(safeAnalyticsMeta("marketplace_map_moved", ctx, { zoom: "12.5" })).not.toHaveProperty("zoom");
    expect(safeAnalyticsMeta("marketplace_card_clicked", ctx, { kind: "listing", slug: "x" })).not.toHaveProperty("slug");
  });
});

describe("plan lines", () => {
  it("lists the marketplace profile on Free and featured placement on Pro", () => {
    expect(FREE_FEATURES.map((f) => f.label)).toContain("A free marketplace profile");
    expect(PRO_FEATURES.map((f) => f.label)).toContain("Featured placement and Pro badge in the marketplace");
  });
});
