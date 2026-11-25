import { describe, expect, it } from "vitest";
import { boundsDiffer, centerZoomBounds, startingMapView } from "@/lib/marketplaceView";
import { openingView, parseMarketplaceParams } from "@/lib/directory";

describe("map-independent marketplace viewport", () => {
  it("Vancouver at zoom 9 in 900 by 700 contains the centre and spans roughly 1.2 degrees longitude", () => {
    const b = centerZoomBounds(49.28, -123.12, 9, 900, 700);
    expect(b.minLat).toBeLessThan(49.28);
    expect(b.maxLat).toBeGreaterThan(49.28);
    expect(b.minLng).toBeLessThan(-123.12);
    expect(b.maxLng).toBeGreaterThan(-123.12);
    expect(b.maxLng - b.minLng).toBeCloseTo(1.236, 2);
  });
  it("uses the same URL-first and timezone opening without a map", () => {
    const start = openingView(parseMarketplaceParams("?lat=49.28&lng=-123.12&z=9"), "America/Denver");
    expect(startingMapView(start, 900, 700).center).toEqual({ lat: 49.28, lng: -123.12 });
    expect(startingMapView(openingView(parseMarketplaceParams(""), "America/Vancouver"), 390, 700).center).toEqual({ lat: 49.28, lng: -123.12 });
  });
  it("only replaces bounds when an edge shifts more than five percent of its span", () => {
    const b = { minLat: 49, maxLat: 50, minLng: -124, maxLng: -123 };
    expect(boundsDiffer(b, { ...b, minLat: 49.04 })).toBe(false);
    expect(boundsDiffer(b, { ...b, minLat: 49.06 })).toBe(true);
    expect(boundsDiffer(b, { ...b, maxLng: -122.94 })).toBe(true);
  });
  it("unknown regions still get finite padded default bounds", () => {
    const v = startingMapView(null, 900, 700);
    expect(v.bounds.minLng).toBeLessThanOrEqual(-135);
    expect(v.bounds.maxLng).toBeGreaterThanOrEqual(-55);
    expect(v.bounds.minLat).toBeGreaterThan(-90);
    expect(v.bounds.maxLat).toBeLessThan(90);
    expect(Number.isFinite(v.zoom)).toBe(true);
  });
});