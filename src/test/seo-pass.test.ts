// @vitest-environment node
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import {
  breadcrumbs,
  businessJsonLd,
  crumbName,
  renderBusinessDoc,
  renderRoute,
  renderRss,
  rssRoutes,
  addFontPreloads,
  SOFTWARE_DESCRIPTION,
} from "../../plugins/prerender";
import { ogFileName } from "../../plugins/og";
import { buildSitemapEntries } from "../../plugins/sitemap";
import { ORG_ID } from "@/config/brand";
import { COMPARISONS, ROUNDUP } from "@/content/comparisons";

const template = fs.readFileSync(path.resolve(__dirname, "../../index.html"), "utf8");
const graphOf = (html: string) =>
  JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1])["@graph"] as Record<string, any>[];
const live = PRERENDER_ROUTES.filter((r) => !r.redirectTo);

describe("title and description lengths", () => {
  for (const r of live) {
    it(`${r.path}: title 30 to 60, description 120 to 155`, () => {
      expect(r.title.length, r.title).toBeGreaterThanOrEqual(30);
      expect(r.title.length, r.title).toBeLessThanOrEqual(60);
      expect(r.description.length, r.description).toBeGreaterThanOrEqual(120);
      expect(r.description.length, r.description).toBeLessThanOrEqual(155);
      if (r.path === "/") expect(r.title).toBe("Revvin | Free referral program for home-service businesses");
      else expect(r.title.endsWith(" | Revvin"), r.title).toBe(true);
    });
  }
});

describe("head", () => {
  it("no Google Fonts stylesheet or preconnect in the template", () => {
    expect(template).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
  });

  it("every public route points og:image and twitter:image at its own 1200x630 card", () => {
    for (const r of live) {
      const html = renderRoute(template, r);
      const img = `https://revvin.co/og/${ogFileName(r.path)}`;
      expect(html).toContain(`<meta property="og:image" content="${img}">`);
      expect(html).toContain(`<meta name="twitter:image" content="${img}">`);
    }
  });

  it("guides pages link the RSS feed in the head; other pages do not", () => {
    expect(renderRoute(template, live.find((r) => r.path === "/guides")!)).toContain('type="application/rss+xml"');
    expect(renderRoute(template, live.find((r) => r.path.startsWith("/guides/"))!)).toContain("/guides/rss.xml");
    expect(renderRoute(template, live.find((r) => r.path === "/pricing")!)).not.toContain("rss+xml");
  });

  it("preloads Barlow Condensed 800 and Barlow 400 by their built file names", () => {
    const out = addFontPreloads('<head><script type="module" src="/a.js"></script></head>', [
      "barlow-condensed-latin-800-normal-AAA.woff2",
      "barlow-latin-400-normal-BBB.woff2",
      "barlow-latin-700-normal-CCC.woff2",
    ]);
    expect(out).toContain('href="/assets/barlow-condensed-latin-800-normal-AAA.woff2" as="font" type="font/woff2" crossorigin');
    expect(out).toContain('href="/assets/barlow-latin-400-normal-BBB.woff2"');
    expect(out).not.toContain("CCC");
  });
});

describe("structured data", () => {
  it("Organization: logo ImageObject, contact point, US and CA, knowsAbout, founder by id", () => {
    const org = graphOf(renderRoute(template, live.find((r) => r.path === "/")!)).find((n) => n["@type"] === "Organization")!;
    expect(org.logo).toMatchObject({ "@type": "ImageObject", width: 192, height: 192 });
    expect(org.contactPoint).toMatchObject({ email: "info@revvin.co", contactType: "customer support" });
    expect(org.areaServed).toEqual(["US", "CA"]);
    expect(org.knowsAbout).toEqual(["referral marketing", "referral programs", "home services marketing"]);
    expect(org.founder["@id"]).toBe("https://revvin.co/about#karm-sandhu");
    expect(org.founder.sameAs).toEqual(["https://www.linkedin.com/in/karm"]);
  });

  it("the full Person node is on /about with job title, employer, LinkedIn and bio", () => {
    const person = graphOf(renderRoute(template, live.find((r) => r.path === "/about")!)).find((n) => n["@type"] === "Person")!;
    expect(person["@id"]).toBe(ORG_ID);
    expect(person.jobTitle).toBe("Founder");
    expect(person.worksFor).toEqual({ "@id": "https://revvin.co/#organization" });
    expect(person.sameAs).toEqual(["https://www.linkedin.com/in/karm"]);
    expect(person.description).toMatch(/door to door in 2016/);
  });

  it("every guide and comparison Article: author by id, dates, mainEntityOfPage, own image", () => {
    const articles = live.filter((r) => r.article || r.path.startsWith("/guides/"));
    expect(articles.length).toBeGreaterThan(10);
    for (const r of articles) {
      const art = graphOf(renderRoute(template, r)).find((n) => n["@type"] === "Article")!;
      expect(art.author["@id"], r.path).toBe(ORG_ID);
      expect(art.author.name).toBe("Karm Sandhu");
      expect(art.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(art.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(art.mainEntityOfPage).toEqual({ "@id": `https://revvin.co${r.path}#webpage` });
      expect(art.image.url).toBe(`https://revvin.co/og/${ogFileName(r.path)}`);
    }
  });

  it("SoftwareApplication matches the plans: Free imports and asks up to 100 and gives every referrer a link", () => {
    expect(SOFTWARE_DESCRIPTION).toMatch(/Free includes: [^.]*import and ask up to 100 customers/);
    expect(SOFTWARE_DESCRIPTION).toMatch(/Free includes: [^.]*a personal link for every referrer/);
    expect(SOFTWARE_DESCRIPTION).toMatch(/adds unlimited customers, imported and asked, [^.]*reactivation email campaigns, roi reporting and monthly recap, custom page branding/);
    for (const p of ["/", "/pricing"]) {
      const sw = graphOf(renderRoute(template, live.find((r) => r.path === p)!)).find((n) => n["@type"] === "SoftwareApplication")!;
      expect(sw.description).toBe(SOFTWARE_DESCRIPTION);
    }
  });

  it("breadcrumbs use real page names; comparisons go Home > Compare > page", () => {
    const rw = live.find((r) => r.path === "/compare/referralwise")!;
    expect(breadcrumbs(rw).itemListElement.map((i) => i.name)).toEqual(["Home", "Compare", "Revvin vs ReferralWise"]);
    expect(breadcrumbs(rw).itemListElement[1].item).toBe("https://revvin.co/compare");
    expect(crumbName(live.find((r) => r.path === "/guides/how-much-to-pay-for-a-referral")!)).toBe("How much should you pay for a referral?");
    // No slug-cased names such as "How Much To Pay For A Referral".
    for (const r of live) {
      for (const it of breadcrumbs(r).itemListElement) expect(it.name, r.path).not.toMatch(/-/);
    }
  });

  it("referral page: includes the WebSite it references, and areaServed from service area or city", () => {
    const biz = { slug: "acme", name: "Acme Roofing", city: "Abbotsford", state: "BC", service_area: "Fraser Valley", offer_amount: "$250", category: "Roofing" };
    const graph = graphOf(renderBusinessDoc(template, biz));
    expect(graph.find((n) => n["@type"] === "WebSite")?.["@id"]).toBe("https://revvin.co/#website");
    const lb = businessJsonLd(biz);
    expect(lb.areaServed).toEqual({ "@type": "Place", name: "Fraser Valley" });
    expect(lb.address).toMatchObject({ addressLocality: "Abbotsford", addressRegion: "BC" });
    expect(businessJsonLd({ slug: "b", name: "B", city: "Mission" }).areaServed).toEqual({ "@type": "City", name: "Mission" });
    expect("areaServed" in businessJsonLd({ slug: "c", name: "C" })).toBe(false);
  });

  it("referral page with server markup is hydrated with the same business data", () => {
    const biz = { slug: "acme", name: "Acme Roofing", offer_amount: "$250" };
    const html = renderBusinessDoc(template, biz, "<main><h1>Acme Roofing</h1><label>Your name</label></main>", "fraser-valley");
    expect(html).toContain('<div id="root" data-ssr="1"><main><h1>Acme Roofing</h1><label>Your name</label></main></div>');
    expect(html).toContain('window.__REVVIN_SSR__={"business":{"slug":"acme"');
    expect(html).toContain('"earnMetro":"fraser-valley"');
  });
});

describe("compare hub, sitemap and RSS", () => {
  it("/compare is prerendered, indexable and in the sitemap", () => {
    const hub = live.find((r) => r.path === "/compare");
    expect(hub && !hub.noindex).toBe(true);
    const locs = buildSitemapEntries({ buildDate: "2026-10-30", businesses: [], metros: [] }).map((e) => e.loc);
    expect(locs).toContain("https://revvin.co/compare");
  });

  it("RSS 2.0 lists every guide and comparison with title, link, description and pubDate", () => {
    const xml = renderRss();
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss version="2.0"/);
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    expect(items.length).toBe(rssRoutes().length);
    for (const c of COMPARISONS) expect(xml).toContain(`<link>https://revvin.co/compare/${c.slug}</link>`);
    expect(xml).toContain(`<link>https://revvin.co/guides/${ROUNDUP.slug}</link>`);
    for (const it of items) {
      expect(it).toMatch(/<title>[^<]+<\/title>/);
      expect(it).toMatch(/<description>[^<]+<\/description>/);
      expect(it).toMatch(/<pubDate>\w{3}, \d{2} \w{3} \d{4} 12:00:00 GMT<\/pubDate>/);
    }
  });
});
