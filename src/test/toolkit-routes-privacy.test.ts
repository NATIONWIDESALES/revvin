import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import { analyticsContext, analyticsEventAllowed, safeAnalyticsMeta } from "@/lib/analyticsPrivacy";
import { TOOLKIT_CTA_LABELS } from "@/lib/toolkit/analytics";

const TOOL_PATHS = [
  "/tools",
  "/tools/referral-program-grader",
  "/tools/referral-reward-calculator",
  "/tools/referral-message-generator",
];

describe("toolkit routes", () => {
  it("prerenders all four pages with unique titles, descriptions and H1s", () => {
    for (const path of TOOL_PATHS) {
      const route = PRERENDER_ROUTES.find((r) => r.path === path);
      expect(route, `missing prerender route for ${path}`).toBeTruthy();
      expect(route!.title.length).toBeLessThanOrEqual(75);
      expect(route!.description.length).toBeLessThanOrEqual(185);
      expect(route!.h1.length).toBeGreaterThan(10);
    }
    const tools = PRERENDER_ROUTES.filter((r) => TOOL_PATHS.includes(r.path));
    expect(new Set(tools.map((r) => r.title)).size).toBe(4);
    expect(new Set(tools.map((r) => r.description)).size).toBe(4);
    expect(new Set(tools.map((r) => r.h1)).size).toBe(4);
  });

  it("only carries FAQ schema where the page has visible questions", () => {
    const hub = PRERENDER_ROUTES.find((r) => r.path === "/tools")!;
    expect(hub.faqs?.length).toBe(4);
    for (const path of TOOL_PATHS.slice(1)) {
      expect(PRERENDER_ROUTES.find((r) => r.path === path)!.faqs).toBeUndefined();
    }
  });

  it("lists all four pages in the sitemap and the AI index", () => {
    const sitemap = readFileSync("public/sitemap.xml", "utf8");
    const llms = readFileSync("public/llms.txt", "utf8");
    for (const path of TOOL_PATHS) {
      expect(sitemap).toContain(`https://revvin.co${path}<`);
      expect(llms).toContain(`(${path})`);
    }
  });

  it("registers every route in the app router", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    for (const path of TOOL_PATHS) expect(app).toContain(`path="${path}"`);
  });
});

describe("toolkit analytics stays anonymous", () => {
  const context = (path: string) => analyticsContext(`https://revvin.co${path}`, "anonymous");

  it("treats every toolkit page as approved marketing traffic", () => {
    for (const path of TOOL_PATHS) {
      const ctx = context(path);
      expect(ctx, `${path} should be measurable`).not.toBeNull();
      expect(ctx!.path).toBe(path);
      expect(ctx!.traffic).toBe("marketing");
      expect(analyticsEventAllowed("cta_clicked", ctx!)).toBe(true);
    }
  });

  it("keeps every toolkit label low-cardinality and free of figures", () => {
    for (const label of TOOLKIT_CTA_LABELS) {
      expect(label).toMatch(/^[a-z_]+$/);
      expect(label.length).toBeLessThan(40);
    }
    expect(new Set(TOOLKIT_CTA_LABELS).size).toBe(TOOLKIT_CTA_LABELS.length);
  });

  it("carries the approved label and drops everything else", () => {
    const ctx = context("/tools/referral-reward-calculator")!;
    const meta = safeAnalyticsMeta("cta_clicked", ctx, {
      cta: TOOLKIT_CTA_LABELS[0],
      score: 75,
      reward: 200,
      margin: 40,
      name: "Dana",
      business: "Northside Roofing",
      message: "Hi Dana, if you know anyone...",
      link: "revvin.co/r/northside",
    });
    expect(meta.cta).toBe(TOOLKIT_CTA_LABELS[0]);
    expect(Object.keys(meta).sort()).toEqual(["cta", "is_demo", "traffic"]);
  });

  it("drops an unapproved label such as one carrying a score", () => {
    const meta = safeAnalyticsMeta("cta_clicked", context("/tools")!, { cta: "tool_grader_score_75" });
    expect(meta.cta).toBeUndefined();
  });

  it("stays closed for signed-in visitors and for non-production hosts", () => {
    expect(analyticsContext("https://revvin.co/tools", "signed-in")).toBeNull();
    expect(analyticsContext("http://localhost:8080/tools", "anonymous")).toBeNull();
  });

  it("stays closed when the address carries an unknown query parameter", () => {
    expect(analyticsContext("https://revvin.co/tools?reward=200", "anonymous")).toBeNull();
  });
});
