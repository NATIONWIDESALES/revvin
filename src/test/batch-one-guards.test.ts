import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { milestoneContext } from "@/lib/analyticsPrivacy";

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

describe("signup measurement", () => {
  it("lets signup steps through on /signup only", () => {
    for (const e of ["signup_viewed", "signup_form_started", "signup_submitted", "signup_failed"]) {
      expect(milestoneContext("https://revvin.co/signup?invite=X#y", e)?.path).toBe("/signup");
    }
    expect(milestoneContext("https://revvin.co/signup", "unknown_event")).toBeNull();
  });
  it("sends no invite code with signup_form_started", () => {
    expect(read("src/components/signup/SignupForm.tsx")).not.toMatch(/signup_form_started", inviteCode/);
  });
});

describe("homepage demo button", () => {
  it("scrolls in place without a URL hash", () => {
    const s = read("src/pages/Index.tsx");
    expect(s).toContain('id="home-demo"');
    expect(s).toContain("scrollIntoView");
    expect(s).not.toMatch(/href="#home-demo"/);
  });
});
