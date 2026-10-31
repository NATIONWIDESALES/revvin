import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");

describe("team identity", () => {
  it("uses the Organization as author and excludes personal identity from public sources", () => {
    for (const p of ["src/config/brand.ts", "src/pages/GuidePage.tsx", "src/pages/ComparePage.tsx", "src/pages/About.tsx", "plugins/prerender.ts", "public/llms.txt"]) {
      expect(read(p), p).not.toMatch(/Karm|Sandhu|linkedin\.com\/in\/karm/i);
    }
    expect(read("src/pages/GuidePage.tsx")).toContain("author: TEAM_REF");
    expect(read("src/pages/ComparePage.tsx")).toContain("author: TEAM_REF");
  });
  it("does not deny the job-done ask", () => {
    const s = read("src/content/seoRoutes.ts") + read("public/llms.txt");
    expect(s).not.toMatch(/no automatic asking engine|no automated review-request/i);
  });
});

describe("homepage labels", () => {
  it("uses the approved Free label and the truthful setup call label", () => {
    expect(read("src/config/planFeatures.ts")).toContain('FREE_CTA_LABEL = "Start free"');
    expect(read("src/pages/Index.tsx")).toContain("Book a free 30-minute setup call");
    expect(read("src/pages/Index.tsx")).not.toContain("overflow-x-clip");
  });
});
