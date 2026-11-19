import { describe, expect, it } from "vitest";
import { displayedMiles, distanceMilesLabel, kmToMiles, milesToKm, storedRadiusKm } from "@/lib/distanceUnits";

describe("mile UI with kilometre storage", () => {
  it("converts one mile to exactly 1.609344 kilometres", () => {
    expect(milesToKm(1)).toBe(1.609344);
    expect(kmToMiles(1.609344)).toBe(1);
  });
  it("rounds displayed radius to whole miles", () => {
    expect(displayedMiles(50)).toBe(31);
    expect(displayedMiles(200)).toBe(124);
    expect(displayedMiles(milesToKm(10.49))).toBe(10);
    expect(displayedMiles(milesToKm(10.5))).toBe(11);
  });
  it("rounds saved kilometres to match the existing integer column and preserves caps", () => {
    expect(storedRadiusKm(25, 500)).toBe(40);
    expect(storedRadiusKm(31, 500)).toBe(50);
    expect(storedRadiusKm(400, 500)).toBe(500);
    expect(storedRadiusKm(150, 200)).toBe(200);
  });
  it("formats nearby and farther saved-offer distances in miles", () => {
    expect(distanceMilesLabel(1.609344)).toBe("1.0 mi away");
    expect(distanceMilesLabel(0)).toBe("0.1 mi away");
    expect(distanceMilesLabel(50)).toBe("31 mi away");
  });
});