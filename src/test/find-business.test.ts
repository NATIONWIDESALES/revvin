import { describe, expect, it } from "vitest";
import { bandCountLine, clusterSpots } from "@/lib/findBusiness";
import { panelColumns } from "@/lib/directory";

describe("homepage find-your-business band", () => {
  it("shows the live count with thousands separators", () => {
    expect(bandCountLine(99980)).toBe("99,980 local businesses across the US and Canada are listed. Find yours and claim it free, or add it in a minute.");
  });
  it("drops the number when the count fails", () => {
    expect(bandCountLine(null).startsWith("Thousands of local businesses across")).toBe(true);
  });
  it("keeps at most 8 clusters, largest first", () => {
    const c = Array.from({ length: 12 }, (_, i) => ({ lat: 40, lng: -100, count: i + 1 }));
    const s = clusterSpots(c, [[-135, 22], [-55, 62]]);
    expect(s).toHaveLength(8);
    expect(s[0].count).toBe(12);
  });
});

describe("marketplace results columns", () => {
  it("uses 1 column under 560px, 2 from 560px, 3 from 980px", () => {
    expect(panelColumns(559)).toBe(1);
    expect(panelColumns(560)).toBe(2);
    expect(panelColumns(979)).toBe(2);
    expect(panelColumns(980)).toBe(3);
  });
});
