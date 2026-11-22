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
import { PRICING_FAQS } from "@/content/pricingFaqs";
import { PARTNER_FAQS } from "@/config/partners";
import { ROUNDUP } from "@/content/comparisons";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import Pricing from "@/pages/Pricing";
import { RoundupPage } from "@/pages/ComparePage";
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

  it("retains the static Meta domain verification tag on the homepage and every prerendered page", () => {
    const tag = '<meta name="facebook-domain-verification" content="dzc0pqlka372ynrcrut83cyljfv2dn" />';
    const home = PRERENDER_ROUTES.find((r) => r.path === "/");
    if (!home) throw new Error("Missing homepage route");
    for (const route of [home, ...PRERENDER_ROUTES.filter((r) => r.path !== "/")]) {
      const html = renderRoute(template, route);
      const head = html.match(/<head[\s>][\s\S]*?<\/head>/)?.[0];
      expect(head, route.path).toContain(tag);
      expect(count(html, /name="facebook-domain-verification"/g), route.path).toBe(1);
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

  it.each(["/", "/about", "/terms", "/privacy"])("%s identifies the legal operator in static Organization data", (routePath) => {
    const route = PRERENDER_ROUTES.find((r) => r.path === routePath);
    if (!route) throw new Error(`Missing route ${routePath}`);
    const doc = new DOMParser().parseFromString(renderRoute(template, route), "text/html");
    const schema = doc.querySelector('script[type="application/ld+json"]')?.textContent;
    if (!schema) throw new Error("Missing static schema");
    const org = JSON.parse(schema)["@graph"].find((n: { "@type": string }) => n["@type"] === "Organization");
    expect(org).toMatchObject({ name: "Revvin", legalName: "Nationwide Sales Group Inc.", url: "https://revvin.co" });
    expect(org.sameAs).toEqual(["https://www.instagram.com/revvin.co/", "https://www.facebook.com/profile.php?id=61596547626844", "https://www.linkedin.com/company/revvinco"]);
  });
});

describe("pricing and roundup FAQ static HTML parity", () => {
  for (const [routePath, Page, faqs] of [
    ["/pricing", Pricing, PRICING_FAQS],
    [`/guides/${ROUNDUP.slug}`, RoundupPage, ROUNDUP.faqs],
  ] as const) {
    it(`${routePath} includes every answer in full-page SSR and fallback HTML with matching FAQPage`, () => {
      const route = PRERENDER_ROUTES.find((r) => r.path === routePath);
      if (!route) throw new Error(`Missing route ${routePath}`);
      expect(faqs).toHaveLength(5);
      const ssr = renderToString(createElement(MemoryRouter, { initialEntries: [routePath] }, createElement(Page)));
      for (const html of [renderRoute(template, route, ssr), renderRoute(template, route)]) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        for (const f of faqs) {
          expect(doc.getElementById("root")?.textContent).toContain(f.q);
          expect(doc.getElementById("root")?.textContent).toContain(f.a);
        }
        const schemaText = doc.querySelector('script[type="application/ld+json"]')?.textContent;
        if (!schemaText) throw new Error("Missing static schema");
        const graph = JSON.parse(schemaText)["@graph"];
        const faq = graph.find((n: { "@type": string }) => n["@type"] === "FAQPage");
        expect(faq.mainEntity.map((f: { name: string; acceptedAnswer: { text: string } }) => ({ q: f.name, a: f.acceptedAnswer.text })))
          .toEqual(faqs.map(({ q, a }) => ({ q, a })));
      }
    });
  }
});

describe("partner FAQ static HTML", () => {
  it("/partners serves all eight questions in the document and in FAQPage", () => {
    const route = PRERENDER_ROUTES.find((r) => r.path === "/partners");
    if (!route) throw new Error("Missing route /partners");
    const doc = new DOMParser().parseFromString(renderRoute(template, route), "text/html");
    const root = doc.getElementById("root")?.textContent ?? "";
    for (const f of PARTNER_FAQS) {
      expect(root, f.q).toContain(f.q);
      expect(root, f.a).toContain(f.a);
    }
    const schemaText = doc.querySelector('script[type="application/ld+json"]')?.textContent;
    if (!schemaText) throw new Error("Missing static schema");
    const graph = JSON.parse(schemaText)["@graph"];
    const faq = graph.find((n: { "@type": string }) => n["@type"] === "FAQPage");
    expect(
      faq.mainEntity.map((f: { name: string; acceptedAnswer: { text: string } }) => ({
        q: f.name,
        a: f.acceptedAnswer.text,
      })),
    ).toEqual(PARTNER_FAQS.map(({ q, a }) => ({ q, a })));
  });
});

describe("private and not-found documents", () => {  it("every private surface is noindex with no canonical", () => {
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
    index_approved: true,
    name: "Summit Roofing",
    description: "Residential roofing",
    offer_amount: "$500",
    offer_trigger: "Per closed job",
    logo_url: null,
    city: "Denver",
    state: "CO",
    category: "Roofing",
  };

  it("describes the business, not the homepage, and is indexable", () => {
    const html = renderBusinessDoc(template, biz);
    expect(html).toContain("<title>Refer a customer to Summit Roofing in Denver, earn $500</title>");
    expect(html).toContain('<link rel="canonical" href="https://revvin.co/r/summit-roofing">');
    expect(html).toContain('content="index, follow"');
    expect(html).toMatch(/<meta property="og:title" content="Refer a customer to Summit Roofing/);
    expect(html).toMatch(/<meta property="og:description" content="[^"]*\$500/);
    expect(count(html, H1)).toBe(1);
    expect(count(html, TITLE)).toBe(1);
  });
});
