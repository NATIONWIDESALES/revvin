import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");

describe("brand-led public identity", () => {
  it("has no personal bylines or founder nodes in public sources", () => {
    for (const f of ["src/pages/GuidePage.tsx", "plugins/prerender.ts", "src/config/brand.ts", "src/content/seoRoutes.ts", "public/llms.txt", "src/components/marketing/FounderNote.tsx"]) {
      const s = read(f);
      expect(s, f).not.toMatch(/Karm/);
      expect(s, f).not.toMatch(/"@type": "Person"/);
    }
  });
  it("does not deny the job-done ask", () => {
    const s = read("src/content/seoRoutes.ts") + read("public/llms.txt");
    expect(s).not.toMatch(/no automatic asking engine|no automated review-request/i);
  });
});

describe("homepage demo button", () => {
  it("scrolls in place without a URL hash", () => {
    const s = read("src/pages/Index.tsx");
    expect(s).toContain('id="home-demo"');
    expect(s).toContain("scrollIntoView");
    expect(s).not.toMatch(/href="#home-demo"/);
    expect(s).toContain('id="home-demo-heading" tabIndex={-1}');
    expect(s).toContain('href="/sample"');
  });
  it("uses the approved Free label and the truthful setup call label", () => {
    expect(read("src/config/planFeatures.ts")).toContain('FREE_CTA_LABEL = "Create my free referral page"');
    expect(read("src/pages/Index.tsx")).toContain("Book a 30-minute setup call");
    expect(read("src/pages/Index.tsx")).not.toContain("overflow-x-clip");
  });
});
