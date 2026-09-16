/**
 * Guards the HTML that Lovable hosting actually serves. These render the same
 * documents the build writes, from the real index.html template, and fail if an
 * indexable page loses its title, description, canonical or H1, if a private or
 * legacy path loses its noindex, or if the structured data stops parsing.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import {
  LEGACY_STORE_PREFIXES,
  PRIVATE_DOCS,
  jsonLd,
  renderBusinessDoc,
  renderNotFoundDoc,
  renderPrivateDoc,
  renderRoute,
} from "../../plugins/prerender";

const template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf8");

const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

const TITLE = /<title>[\s\S]*?<\/title>/g;
const DESCRIPTION = /<meta\s+name="description"\s+content="/g;
const CANONICAL = /<link rel="canonical"/g;
const H1 = /<h1[\s>]/g;
const NOINDEX = /<meta\s+name="robots"\s+content="noindex/;

const MAIN_ROUTES = [
  "/",
  "/how-it-works",
  "/pricing",
  "/for-businesses",
  "/guides",
  "/tools",
  "/referral-programs",
  "/referral-program/roofing",
  "/guides/how-much-to-pay-for-a-referral",
  "/tools/referral-reward-calculator",
];

describe("prerendered public documents", () => {
  const indexable = PRERENDER_ROUTES.filter((r) => !r.noindex);

  it("covers the main public routes", () => {
    for (const p of MAIN_ROUTES) {
      expect(PRERENDER_ROUTES.some((r) => r.path === p)).toBe(true);
    }
  });

  it("each indexable page has exactly one title, description, canonical and H1", () => {
    for (const route of indexable) {
      const html = renderRoute(template, route);
      expect(count(html, TITLE), `${route.path} title`).toBe(1);
      expect(count(html, DESCRIPTION), `${route.path} description`).toBe(1);
      expect(count(html, CANONICAL), `${route.path} canonical`).toBe(1);
      expect(count(html, H1), `${route.path} h1`).toBe(1);
      expect(html, `${route.path} robots`).not.toMatch(NOINDEX);
      expect(html, `${route.path} title text`).toContain(`<title>`);
    }
  });

  it("the homepage document carries a self referencing canonical", () => {
    const home = PRERENDER_ROUTES.find((r) => r.path === "/")!;
    const html = renderRoute(template, home);
    expect(html).toContain('<link rel="canonical" href="https://revvin.co/">');
  });

  it("the SPA fallback drops the homepage canonical and content on other paths", () => {
    const html = renderRoute(template, PRERENDER_ROUTES.find((r) => r.path === "/")!);
    expect(html).toContain('link[rel="canonical"]');
    expect(html).toContain("noindex,follow");
    expect(html).toContain("Page not found | Revvin");
  });

  it("routes marked noindex say so in the served HTML", () => {
    for (const route of PRERENDER_ROUTES.filter((r) => r.noindex)) {
      expect(renderRoute(template, route), route.path).toMatch(NOINDEX);
    }
  });

  it("structured data parses and has no duplicate @id", () => {
    for (const route of PRERENDER_ROUTES) {
      const parsed = JSON.parse(jsonLd(route)) as { "@graph": { "@id"?: string }[] };
      const ids = parsed["@graph"].map((n) => n["@id"]).filter(Boolean);
      expect(new Set(ids).size, `${route.path} duplicate @id`).toBe(ids.length);
    }
  });
});

describe("private and not-found documents", () => {
  it("every private surface is noindex with no canonical", () => {
    for (const doc of PRIVATE_DOCS) {
      const html = renderPrivateDoc(template, doc);
      expect(html, doc.path).toMatch(NOINDEX);
      expect(count(html, CANONICAL), doc.path).toBe(0);
      expect(count(html, TITLE), doc.path).toBe(1);
    }
  });

  it("covers the auth and account paths that must never be indexed", () => {
    for (const p of [
      "/auth",
      "/login",
      "/signup",
      "/reset-password",
      "/welcome",
      "/dashboard",
      "/r/status",
      "/feedback",
      "/print",
    ]) {
      expect(PRIVATE_DOCS.some((d) => d.path === p), p).toBe(true);
    }
  });

  it("the not-found document is noindex and titled Page not found", () => {
    const html = renderNotFoundDoc(template);
    expect(html).toMatch(NOINDEX);
    expect(html).toContain("<title>Page not found | Revvin</title>");
    expect(count(html, CANONICAL)).toBe(0);
    expect(count(html, H1)).toBe(1);
  });

  it("keeps the old store paths in the legacy list", () => {
    for (const p of ["/products", "/collections", "/cart", "/pages", "/blogs", "/account"]) {
      expect(LEGACY_STORE_PREFIXES).toContain(p);
    }
  });
});

describe("published referral pages", () => {
  const biz = {
    slug: "summit-roofing",
    name: "Summit Roofing",
    description: "Residential roofing",
    offer_amount: "$500",
    offer_trigger: "Per closed job",
    logo_url: null,
    city: "Denver",
    state: "CO",
    category: "Roofing",
  };

  it("describes the business, not the homepage, and stays out of the index", () => {
    const html = renderBusinessDoc(template, biz);
    expect(html).toContain("<title>Refer a customer to Summit Roofing | Revvin</title>");
    expect(html).toContain('<link rel="canonical" href="https://revvin.co/r/summit-roofing">');
    expect(html).toContain('content="noindex, follow"');
    expect(html).toMatch(/<meta property="og:title" content="Refer a customer to Summit Roofing/);
    expect(html).toMatch(/<meta property="og:description" content="[^"]*\$500/);
    expect(count(html, H1)).toBe(1);
    expect(count(html, TITLE)).toBe(1);
  });
});
