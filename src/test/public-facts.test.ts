/**
 * Guards on public claims. These exist because marketing copy drifted ahead of
 * the product more than once.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import { TERMS_DOC, PRIVACY_DOC, legalPrerenderSections } from "@/content/legal";
import { MONTHLY_PRICE, ANNUAL_PRICE, ANNUAL_TERMS_COPY } from "@/config/pricing";

const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), "utf8");

/**
 * Public copy with source comments stripped. Comments state what the product
 * does NOT do ("no auto-ask engine"), which would otherwise trip these guards.
 */
const stripComments = (src: string) =>
  src.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

const allCopy = () =>
  ["src/content/industries.ts", "src/content/guides.ts", "src/content/seoRoutes.ts"]
    .map((f) => stripComments(read(f)))
    .join("\n");

describe("pricing facts", () => {
  it("keeps one source of truth for the prices", () => {
    expect(MONTHLY_PRICE).toBe(49);
    expect(ANNUAL_PRICE).toBe(450);
  });

  it("says Pro runs to the end of the paid term and the free page stays live", () => {
    expect(ANNUAL_TERMS_COPY).toMatch(/paid|term|year/i);
    expect(ANNUAL_TERMS_COPY.toLowerCase()).toContain("free");
  });

  it("puts both prices in the prerendered pricing document", () => {
    const pricing = PRERENDER_ROUTES.find((r) => r.path === "/pricing")!;
    const text = JSON.stringify(pricing);
    expect(text).toContain("$49");
    expect(text).toContain("$450");
  });
});

describe("channel claims", () => {
  it("never claims Revvin sends SMS on a business's behalf", () => {
    const copy = allCopy() + stripComments(read("src/content/legal.ts"));
    expect(copy).not.toMatch(/we (?:will )?text your customers/i);
    expect(copy).not.toMatch(/Revvin sends (?:the )?(?:text|SMS)/i);
  });

  it("does not deny email sending outright, because Pro campaigns are sent by Revvin", () => {
    const copy = allCopy();
    expect(copy).not.toMatch(/Revvin never sends email/i);
    expect(copy).not.toMatch(/we never send anything on your behalf/i);
  });

  it("describes campaign email with its compliance facts somewhere public", () => {
    const copy = allCopy().toLowerCase();
    expect(copy).toContain("unsubscribe");
    expect(copy).toContain("postal address");
  });

  it("makes no automation, webhook or public API promise", () => {
    const copy = allCopy();
    // Denials are fine ("no public API"); a promise is not.
    expect(copy).not.toMatch(/(?<!no )auto-ask engine/i);
    expect(copy).not.toMatch(/our public API|Revvin's public API|connect via webhook/i);
    expect(copy).not.toMatch(/automatic(?:ally)? (?:asks|texts|requests a review)/i);
  });
});

describe("payout claims", () => {
  it("never claims Revvin pays, holds or guarantees reward money", () => {
    const copy = allCopy() + stripComments(read("src/content/legal.ts"));
    expect(copy).not.toMatch(/we pay your referrers/i);
    expect(copy).not.toMatch(/guaranteed payout/i);
    expect(copy).not.toMatch(/we hold the (?:reward|money)/i);
  });

  it("states in the terms that rewards are paid directly and Revvin takes no cut", () => {
    const rewards = TERMS_DOC.sections.find((s) => /Referrer rewards/i.test(s.heading))!;
    const text = JSON.stringify(rewards);
    expect(text).toMatch(/directly/);
    expect(text).toMatch(/no fee|take no fee/);
  });
});

describe("legal content is shared, not summarised twice", () => {
  it("prerenders the same sections the pages render", () => {
    for (const doc of [TERMS_DOC, PRIVACY_DOC]) {
      const route = PRERENDER_ROUTES.find((r) => r.path === doc.path)!;
      expect(route.h1).toBe(doc.h1);
      expect(route.sections).toHaveLength(doc.sections.length);
      expect(route.sections.map((s) => s.heading)).toEqual(doc.sections.map((s) => s.heading));
    }
  });

  it("flattens every paragraph and bullet into the prerendered body", () => {
    const section = legalPrerenderSections(TERMS_DOC).find((s) => /Subscription/i.test(s.heading))!;
    expect(section.body).toContain("$49 per month");
    expect(section.body).toContain("$450 per year");
  });

  it("says in the terms that Revvin sends reactivation campaign email", () => {
    const outreach = TERMS_DOC.sections.find((s) => /Contacting your own customers/i.test(s.heading))!;
    const text = JSON.stringify(outreach);
    expect(text).toMatch(/Reactivation campaigns/);
    expect(text).toMatch(/unsubscribe/i);
    expect(text).toMatch(/postal address/i);
    expect(text).toMatch(/never sends SMS/i);
  });
});

describe("robots.txt", () => {
  const robots = read("public/robots.txt");
  const groups = robots
    .split(/\n\s*\n/)
    .filter((b) => /^User-agent:/m.test(b));

  it("repeats the private-path exclusions in every crawl group, because named groups do not inherit them", () => {
    expect(groups.length).toBeGreaterThan(1);
    for (const group of groups) {
      expect(group, group.split("\n")[0]).toMatch(/Disallow: \/dashboard/);
      expect(group).toMatch(/Disallow: \/admin\//);
      expect(group).toMatch(/Disallow: \/r\/status\//);
    }
  });

  it("still points at the sitemap", () => {
    expect(robots).toContain("Sitemap: https://revvin.co/sitemap.xml");
  });
});
