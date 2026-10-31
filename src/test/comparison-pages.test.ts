import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import { renderRoute } from "../../plugins/prerender";
import { buildSitemapEntries } from "../../plugins/sitemap";
import { COMPARISONS, ROUNDUP } from "@/content/comparisons";

const template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf8");
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

const COMPARE_PATHS = [
  "/compare/get-the-referral",
  "/compare/referralwise",
  "/compare/clicki",
  "/compare/snoball",
  "/compare/jobber-referrals",
];
const ROUNDUP_PATH = "/guides/best-referral-software-for-contractors-2026";
const ALL = [...COMPARE_PATHS, ROUNDUP_PATH];

const graphOf = (html: string) => {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? [];
  return m.flatMap((s) => {
    const j = JSON.parse(s.replace(/<script[^>]*>|<\/script>/g, ""));
    return j["@graph"] ?? [j];
  });
};

describe("comparison pages and roundup", () => {
  for (const p of ALL) {
    it(`${p} prerenders with required head, body and JSON-LD`, () => {
      const route = PRERENDER_ROUTES.find((r) => r.path === p);
      expect(route).toBeTruthy();
      const html = renderRoute(template, route!);
      expect(count(html, /<h1[\s>]/g)).toBe(1);
      expect(count(html, /<title>[\s\S]*?<\/title>/g)).toBe(1);
      expect(count(html, /<link rel="canonical" href="https:\/\/revvin\.co[^"]*"/g)).toBe(1);
      expect(html).toContain(`<link rel="canonical" href="https://revvin.co${p}"`);
      expect(html).toContain("<table>");
      expect(html).toContain("checked October 29, 2026");
      expect(html).toContain("Revvin wrote this page. We&#39;ve tried to be fair; tell us at info@revvin.co if anything is out of date.");
      expect(html).not.toContain("\u2014");
      const graph = graphOf(html);
      const art = graph.find((n: { "@type": string }) => n["@type"] === "Article");
      expect(art?.author?.name).toBe("Revvin");
      expect(art?.publisher).toBeTruthy();
      const hasFaq = graph.some((n: { "@type": string }) => n["@type"] === "FAQPage");
      expect(hasFaq).toBe(p !== ROUNDUP_PATH);
    });
  }

  it("each comparison links its competitor source", () => {
    for (const c of COMPARISONS) {
      const html = renderRoute(template, PRERENDER_ROUTES.find((r) => r.path === `/compare/${c.slug}`)!);
      expect(html).toContain(c.sources[0].url);
      expect(c.chooseThem).toHaveLength(3);
      expect(c.chooseRevvin).toHaveLength(3);
      expect(c.faqs).toHaveLength(3);
      expect(c.answer.split(/\s+/).length).toBeLessThanOrEqual(60);
    }
    expect(ROUNDUP.tools.map((t) => t.name)).toEqual([
      "Revvin", "ReferralWise", "Jobber Referrals", "Clicki", "Get The Referral", "Snoball",
    ]);
  });

  it("sitemap includes all six", () => {
    const entries = buildSitemapEntries({ buildDate: "2026-10-29", dateFor: () => null });
    const locs = entries.map((e: { loc: string }) => e.loc);
    for (const p of ALL) expect(locs).toContain(`https://revvin.co${p}`);
  });
});
