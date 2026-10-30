// @vitest-environment node
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import { jsonLd, renderRoute, renderRss } from "../../plugins/prerender";
import { buildSitemapEntries } from "../../plugins/sitemap";
import { render } from "@/entry-server";
import { PERSON_ID } from "@/config/brand";
import { INDUSTRIES } from "@/content/industries";
import { NEW_GUIDES } from "@/content/guidesNew";
import { tradeScripts } from "@/content/tradeExtras";
import { relatedForCompare, relatedForGuide, relatedForTrade } from "@/content/related";
import { COMPARISONS } from "@/content/comparisons";

const template = fs.readFileSync(path.resolve(__dirname, "../../index.html"), "utf8");
const NEW_PATHS = [
  "/guides/referral-text-templates",
  "/guides/what-is-a-referral-program",
  "/guides/when-to-ask-for-a-referral",
  "/guides/how-to-get-paid-for-referrals",
  "/guides/referral-marketing-glossary",
];
const route = (p: string) => PRERENDER_ROUTES.find((r) => r.path === p)!;
const graph = (p: string) => JSON.parse(jsonLd(route(p)))["@graph"] as Record<string, any>[];
const types = (p: string) => graph(p).map((n) => n["@type"]);

describe("new guides", () => {
  const sitemap = buildSitemapEntries({ buildDate: "2026-10-30", businesses: [], metros: [] }).map((e) => e.loc);
  const rss = renderRss();

  for (const p of NEW_PATHS) {
    it(`${p} prerenders with metadata, schema, one H1, Related and author box`, async () => {
      const r = route(p);
      expect(r, p).toBeTruthy();
      expect(r.title.length).toBeGreaterThanOrEqual(30);
      expect(r.title.length).toBeLessThanOrEqual(60);
      expect(r.title).toMatch(/ \| Revvin$/);
      expect(r.description.length).toBeGreaterThanOrEqual(120);
      expect(r.description.length).toBeLessThanOrEqual(155);

      const article = graph(p).find((n) => n["@type"] === "Article")!;
      expect(article.author["@id"]).toBe(PERSON_ID);
      expect(article.dateModified).toBe("2026-10-30");
      const crumbs = graph(p).find((n) => n["@type"] === "BreadcrumbList")!;
      expect(crumbs.itemListElement.map((i: any) => i.name)).toEqual(["Home", "Guides", expect.any(String)]);

      const doc = renderRoute(template, r);
      expect(doc.match(/<title>/g)?.length).toBe(1);

      const html = await render(p);
      expect(html.match(/<h1[\s>]/g)?.length).toBe(1);
      expect(html).toContain('data-block="related"');
      expect(html).toContain('data-block="author"');
      expect(html).toContain('href="/about#karm-sandhu"');
      expect(html).toContain("Last updated October 30, 2026");

      expect(sitemap).toContain(`https://revvin.co${p}`);
      expect(rss).toContain(`<link>https://revvin.co${p}</link>`);
    }, 30000);
  }

  it("guides with an FAQ carry FAQPage; the glossary carries a 20-term DefinedTermSet and no FAQPage", () => {
    for (const p of NEW_PATHS.filter((x) => !x.endsWith("glossary"))) expect(types(p)).toContain("FAQPage");
    const g = "/guides/referral-marketing-glossary";
    expect(types(g)).not.toContain("FAQPage");
    const set = graph(g).find((n) => n["@type"] === "DefinedTermSet")!;
    expect(set.hasDefinedTerm).toHaveLength(20);
    expect(set.hasDefinedTerm[0]["@id"]).toBe("https://revvin.co/guides/referral-marketing-glossary#referral-program");
  });

  it("templates guide has twelve templates plus the referrer disclosure line", () => {
    const t = NEW_GUIDES.find((g) => g.slug === "referral-text-templates")!;
    expect(t.table!.rows).toHaveLength(12);
    const items = t.copyGroups!.flatMap((c) => c.items);
    expect(items).toHaveLength(13);
    expect(items.some((i) => /may get a reward/.test(i.text))).toBe(true);
  });

  it("referrer guide states the US $2,000 Form 1099 rule, cites it, and says it is not tax advice", () => {
    const g = NEW_GUIDES.find((x) => x.slug === "how-to-get-paid-for-referrals")!;
    const text = JSON.stringify(g);
    expect(text).toContain("$2,000 or more in a year on Form 1099");
    expect(text).toContain("January 1, 2026");
    expect(text).toContain("https://www.tremendous.com/blog/one-big-beautiful-bill-1099-tax-impact/");
    expect(text).toContain("not tax advice");
  });
});

describe("trade pages", () => {
  it("all 20 trades get the three new FAQ items in FAQPage JSON-LD", () => {
    expect(INDUSTRIES).toHaveLength(20);
    for (const i of INDUSTRIES) {
      const faq = graph(`/referral-program/${i.slug}`).find((n) => n["@type"] === "FAQPage")!;
      const qs = faq.mainEntity.map((q: any) => q.name);
      expect(qs).toContain(`When should a ${i.trade} company ask for referrals?`);
      expect(qs).toContain("Should the reward be cash or a discount?");
      expect(qs).toContain("What if the referred job does not close?");
    }
  });

  it("every trade has three scripts with no leftover generic trade phrase", () => {
    for (const i of INDUSTRIES) {
      const s = tradeScripts(i.slug);
      expect(s.map((x) => x.label)).toEqual(["Right after the job", "One week later", "Seasonal check-in"]);
      for (const x of s) expect(x.text).toContain("[your link]");
    }
  });

  it("roofing renders the reward and text sections, worksheet example label, copy buttons and Related", async () => {
    const html = await render("/referral-program/roofing");
    expect(html).toContain("How much should a roofing business pay for a referral?");
    expect(html).toContain("What to text a roofing customer after the job");
    expect(html).toContain("Example: change these to your numbers");
    expect(html.match(/aria-label="Copy: /g)?.length).toBe(3);
    expect(html).toContain('href="/guides/how-much-to-pay-for-a-referral"');
    expect(html).toContain('href="/guides/referral-text-templates"');
    expect(html).toContain('data-block="related"');
  }, 30000);

  it("comparison pages render Related and the author box", async () => {
    const html = await render("/compare/referralwise");
    expect(html).toContain('data-block="related"');
    expect(html).toContain('data-block="author"');
  }, 30000);
});

describe("related blocks hold 3 to 5 links", () => {
  const all = [
    ...NEW_PATHS.map((p) => relatedForGuide(p.replace("/guides/", ""))),
    ...INDUSTRIES.map((i) => relatedForTrade(i.slug)),
    ...COMPARISONS.map((c) => relatedForCompare(`/compare/${c.slug}`)),
  ];
  it("each block", () => {
    for (const links of all) {
      expect(links.length).toBeGreaterThanOrEqual(3);
      expect(links.length).toBeLessThanOrEqual(5);
    }
  });
  it("comparisons link to the roundup and pricing", () => {
    const l = relatedForCompare("/compare/clicki").map((x) => x.to);
    expect(l).toContain("/guides/best-referral-software-for-contractors-2026");
    expect(l).toContain("/pricing");
  });
});

describe("content guards on the new content files", () => {
  const files = [
    "src/content/guidesNew.ts",
    "src/content/tradeExtras.ts",
    "src/components/content/ContentBlocks.tsx",
  ].map((f) => fs.readFileSync(path.resolve(__dirname, "../..", f), "utf8"));
  it("no em dashes", () => {
    for (const f of files) expect(f).not.toMatch(/\u2014/);
  });
  it("no statistic patterns or 'most businesses' claims", () => {
    for (const f of files) {
      expect(f).not.toMatch(/\d+(\.\d+)?\s?%\s+of\s+\w+/i);
      expect(f).not.toMatch(/\d+(\.\d+)?\s?(percent)\s+of/i);
      expect(f).not.toMatch(/\bmost (businesses|contractors|owners|customers|homeowners)\b/i);
    }
  });
});
