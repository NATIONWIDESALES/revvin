import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");

describe("founder identity", () => {
  it("names Karm Sandhu as founder in brand facts, guides and structured data", () => {
    expect(read("src/config/brand.ts")).toMatch(/name: "Karm Sandhu"/);
    expect(read("src/pages/GuidePage.tsx")).toContain("By Karm Sandhu, Founder of Revvin");
    expect(read("src/pages/GuidePage.tsx")).toContain("author: FOUNDER_PERSON");
    expect(read("plugins/prerender.ts")).toContain("founder: FOUNDER_PERSON");
  });
  it("does not deny the job-done ask", () => {
    const s = read("src/content/seoRoutes.ts") + read("public/llms.txt");
    expect(s).not.toMatch(/no automatic asking engine|no automated review-request/i);
  });
});

describe("homepage labels", () => {
  it("uses the approved Free label and the truthful setup call label", () => {
    expect(read("src/config/planFeatures.ts")).toContain('FREE_CTA_LABEL = "Start free"');
    expect(read("src/pages/Index.tsx")).toContain("book a 30-minute setup call with Karm");
    expect(read("src/pages/Index.tsx")).not.toContain("overflow-x-clip");
  });
});
