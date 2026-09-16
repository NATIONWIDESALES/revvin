/**
 * Source-level consistency guards. These read files and route data; they are
 * NOT browser interaction tests and prove nothing about rendering.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import { SAMPLE_META } from "@/content/samplePage";
import { PRICE_TEXT } from "@/config/pricing";
import { FREE_FEATURES, PRO_FEATURES } from "@/config/planFeatures";

const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), "utf8");

describe("homepage claims", () => {
  const index = read("src/pages/Index.tsx");

  it("does not repeat Pro features as unavailable rows under Free", () => {
    expect(index).not.toContain("(not included in Free)");
  });

  it("drops the manual add-lead claim, since no such workflow exists in the dashboard", () => {
    expect(index).not.toMatch(/add it as a lead yourself/i);
    const dashboard = read("src/pages/dashboard/BusinessDashboard.tsx");
    expect(dashboard).not.toMatch(/from\((["'])leads\1\)\s*\.insert/);
  });
});

describe("print pack entitlement", () => {
  // Ungated in the dashboard: PrintPack renders inside the Share tab with no
  // plan check, so it belongs to Free everywhere it is described.
  it("is not gated on the Pro plan in the dashboard", () => {
    expect(read("src/components/dashboard/PrintPack.tsx")).not.toMatch(/isPro|plan\s*===/);
    const dashboard = read("src/pages/dashboard/BusinessDashboard.tsx");
    const shareTab = dashboard.match(/<TabsContent value="share">[\s\S]*?<\/TabsContent>/)![0];
    expect(shareTab).not.toMatch(/isPro|ProUpsell/);
  });

  it("is listed under Free, and not under Pro", () => {
    expect(FREE_FEATURES.some((feature) => /print pack/i.test(feature.label))).toBe(true);
    expect(PRO_FEATURES.some((feature) => /print pack/i.test(`${feature.label} ${feature.description}`))).toBe(false);
  });

  it("has both public pages render the same shared Free and Pro lists", () => {
    for (const file of ["src/pages/Index.tsx", "src/pages/Pricing.tsx"]) {
      const source = read(file);
      expect(source).toContain('<PlanFeatureList features={FREE_FEATURES} />');
      expect(source).toContain('<PlanFeatureList features={PRO_FEATURES} />');
    }
  });
});

describe("/sample metadata", () => {
  const route = PRERENDER_ROUTES.find((r) => r.path === "/sample")!;

  it("shares one title, description and heading with the page", () => {
    expect(route.title).toBe(SAMPLE_META.title);
    expect(route.description).toBe(SAMPLE_META.description);
    expect(route.h1).toBe(SAMPLE_META.h1);
  });

  it("passes its own path to SEOHead so it does not canonical to the homepage", () => {
    const sample = read("src/pages/Sample.tsx");
    expect(sample).toMatch(/path=\{SAMPLE_META\.path\}/);
    expect(SAMPLE_META.path).toBe("/sample");
  });

  it("leaves dynamic routes without a hardcoded canonical", () => {
    for (const file of ["src/pages/PublicReferralPage.tsx", "src/pages/InviteLanding.tsx"]) {
      expect(read(file)).not.toMatch(/canonicalUrl="https:\/\/revvin\.co\/?"/);
    }
  });
});

describe("pricing facts are not duplicated by hand", () => {
  it("has no doubled currency suffix in the route copy", () => {
    expect(read("src/content/seoRoutes.ts")).not.toMatch(/USD USD/);
    expect(JSON.stringify(PRERENDER_ROUTES)).not.toMatch(/USD USD/);
  });

  it("derives the prerendered organization description and default meta from the shared prices", () => {
    expect(read("plugins/prerender.ts")).toMatch(/PRICE_TEXT\.monthlyPerMonth/);
    expect(read("src/components/SEOHead.tsx")).toMatch(/PRICE_TEXT\.monthlyPerMonth/);
  });

  it("keeps the static index.html shell on the current prices", () => {
    // index.html cannot import TypeScript, so this guard fails if the shared
    // prices change and the shell is not updated with them.
    const html = read("index.html");
    expect(html).toContain(`${PRICE_TEXT.monthly}/month`);
    expect(html).not.toMatch(/\$\d+\/month USD USD/);
  });
});
