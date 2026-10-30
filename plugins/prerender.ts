import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { PRERENDER_ROUTES, CHECKED_LINE, type PrerenderRoute } from "../src/content/seoRoutes";
import { COMPARISONS_CHECKED_ON } from "../src/content/comparisons";
import { PRICE_TEXT, MONTHLY_PRICE, ANNUAL_PRICE } from "../src/config/pricing";
import { isRestrictedCategory } from "../src/lib/offerUtils";
import { PRERENDER_BUSINESS_COLS } from "../src/lib/publicReferralCols";
import { buildSitemapEntries, renderSitemap } from "./sitemap";
import { ogKind, ogUrl, writeOgImages, type OgCard } from "./og";
import { buildSsrRenderer, type SsrRender } from "./ssr";
import { FREE_FEATURES, PRO_FEATURES } from "../src/config/planFeatures";
import { buildBusinessManifest, businessManifestPath } from "../src/lib/webManifest";
import {
  APP_ID,
  FOUNDING_DATE,
  GUIDES_PUBLISHED_AT,
  GUIDES_UPDATED_AT,
  INDEXNOW_KEY,
  ORG_DISAMBIGUATION,
  FOUNDER_PERSON,
  FOUNDER_REF,
  ORG_ID,
  ORG_SAME_AS,
  SITE_ID,
  CANONICAL_SENTENCE,
} from "../src/config/brand";

const SITE = "https://revvin.co";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Private and authenticated surfaces. Lovable hosting serves the SPA fallback
 * for any path with no file behind it, and that fallback cannot carry a
 * per-path robots tag without JavaScript. Writing a real static document at
 * each of these paths means the raw HTML a crawler receives already says
 * noindex, with no JavaScript involved.
 *
 * These paths are deliberately NOT disallowed in robots.txt: a blocked URL is
 * never fetched, so Google would never read the noindex and would keep the
 * old listings. Once they drop out of the index they can be disallowed.
 */
export const PRIVATE_DOCS: { path: string; title: string; body: string }[] = [
  { path: "/auth", title: "Sign in | Revvin", body: "Sign in to Revvin." },
  { path: "/login", title: "Sign in | Revvin", body: "Sign in to Revvin." },
  { path: "/signup", title: "Create an account | Revvin", body: "Create a Revvin account." },
  { path: "/reset-password", title: "Reset your password | Revvin", body: "Reset your Revvin password." },
  { path: "/welcome", title: "Set up your page | Revvin", body: "Private setup pages for a Revvin account." },
  { path: "/dashboard", title: "Dashboard | Revvin", body: "Private Revvin dashboard." },
  { path: "/feedback", title: "Feedback | Revvin", body: "Private Revvin feedback page." },
  { path: "/print", title: "Print pack | Revvin", body: "Private Revvin print assets." },
  { path: "/r/status", title: "Referral status | Revvin", body: "Private referral status page." },
  { path: "/saved", title: "Saved offers | Revvin", body: "Private saved offers page." },
  { path: "/me", title: "Your referrals | Revvin", body: "Private referrer home." },
];

/**
 * Path prefixes left behind by the previous owner of this domain, which was an
 * online store. Google still has those URLs indexed and the SPA fallback was
 * answering them with the homepage, creating duplicates. A real static
 * not-found document at each prefix, plus the known deep URLs, replaces the
 * homepage with a noindex "Page not found" page.
 */
export const LEGACY_STORE_PREFIXES = [
  "/products",
  "/collections",
  "/cart",
  "/pages",
  "/blogs",
  "/account",
];

/** Deep legacy URLs known to be indexed. Add any others Search Console shows. */
export const LEGACY_STORE_URLS = ["/products/rossi-fan-t-shirt-white"];

const ORGANIZATION = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: "Revvin",
  url: SITE,
  logo: {
    "@type": "ImageObject",
    url: `${SITE}/android-chrome-192x192.png`,
    width: 192,
    height: 192,
  },
  image: `${SITE}/og-image.png`,
  email: "info@revvin.co",
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@revvin.co",
    contactType: "customer support",
    availableLanguage: "en",
  },
  areaServed: ["US", "CA"],
  knowsAbout: ["referral marketing", "referral programs", "home services marketing"],
  slogan: "Your customer list, working for you",
  disambiguatingDescription: ORG_DISAMBIGUATION,
  // The id points at the full Person node on /about; the name, profile and
  // disambiguation stay inline so every page names the founder on its own.
  founder: {
    ...FOUNDER_REF,
    sameAs: [...FOUNDER_PERSON.sameAs],
    disambiguatingDescription: FOUNDER_PERSON.disambiguatingDescription,
  },
  // Emitted only once real profile URLs exist; an empty sameAs says nothing.
  ...(ORG_SAME_AS.length ? { sameAs: ORG_SAME_AS } : {}),
  ...(FOUNDING_DATE ? { foundingDate: FOUNDING_DATE } : {}),
  // Prices come from the shared pricing facts so the structured data in every
  // built document, including the one that overwrites index.html, cannot drift
  // from the prices the pages show.
  description: `Referral software for service businesses. Turns a past-customer list into referrals. Publishing your referral page is free; Revvin Pro is a flat ${PRICE_TEXT.monthlyPerMonth} USD, or ${PRICE_TEXT.annualPerYear} billed once. No platform fees. Businesses pay their referrers directly off-platform.`,
};

const WEBSITE = {
  "@type": "WebSite",
  "@id": SITE_ID,
  url: SITE,
  name: "Revvin",
  alternateName: "Revvin.co",
  inLanguage: "en-US",
  publisher: { "@id": ORG_ID },
  // /browse reads its query from ?q=, so this action describes a search that
  // actually works rather than an invented endpoint.
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE}/browse?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

/**
 * The product itself, priced from the single pricing source. Answer engines
 * asked "what does Revvin cost" read this: a free tier at 0 and Revvin Pro
 * with both the monthly and the annual price, in USD, with no platform fee.
 */
/**
 * Built from the plan feature lists the pricing page renders, so the product
 * description can never claim a feature sits on the wrong plan.
 */
export const SOFTWARE_DESCRIPTION = `Referral software for home-service businesses. Free includes: ${FREE_FEATURES.map((f) => f.label.toLowerCase()).join(", ")}. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD or ${PRICE_TEXT.annualPerYear} USD a year and adds ${PRO_FEATURES.map((f) => f.label.toLowerCase()).join(", ")}. Businesses pay their referrers directly; Revvin takes no cut.`;

const SOFTWARE = {
  "@type": "SoftwareApplication",
  "@id": APP_ID,
  name: "Revvin",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web browser",
  url: SITE,
  publisher: { "@id": ORG_ID },
  description: SOFTWARE_DESCRIPTION,
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      url: `${SITE}/pricing`,
      description: `${FREE_FEATURES.map((f) => f.label).join(", ")}.`,
    },
    {
      "@type": "Offer",
      name: "Revvin Pro, monthly",
      price: String(MONTHLY_PRICE),
      priceCurrency: "USD",
      url: `${SITE}/pricing`,
      description: `Everything in Free, plus: ${PRO_FEATURES.map((f) => f.label.toLowerCase()).join(", ")}. Billed monthly, cancel any time.`,
    },
    {
      "@type": "Offer",
      name: "Revvin Pro, annual",
      price: String(ANNUAL_PRICE),
      priceCurrency: "USD",
      url: `${SITE}/pricing`,
      description:
        "The same Revvin Pro tools, billed once for a year. Cancel any time; Pro keeps working to the end of the paid year and the free referral page stays live afterwards.",
    },
  ],
};

/**
 * A breadcrumb must only ever point at a URL that exists. Deriving ancestors
 * from path segments produced /referral-program, which is not a page: the hub
 * lives at /referral-programs. Ancestors are therefore mapped explicitly, and
 * a segment with no real parent page is skipped rather than invented.
 */
const PARENT_PAGES: { prefix: string; name: string; item: string }[] = [
  { prefix: "/referral-program/", name: "Referral Programs", item: `${SITE}/referral-programs` },
  { prefix: "/guides/", name: "Guides", item: `${SITE}/guides` },
  { prefix: "/docs/", name: "Documentation", item: `${SITE}/docs/zapier` },
  { prefix: "/tools/", name: "Contractor Growth Toolkit", item: `${SITE}/tools` },
  { prefix: "/compare/", name: "Compare", item: `${SITE}/compare` },
  { prefix: "/partners/", name: "Partners", item: `${SITE}/partners` },
];

/** Short breadcrumb names for pages whose H1 is a sentence rather than a name. */
const CRUMB_NAMES: Record<string, string> = {
  "/about": "About",
  "/pricing": "Pricing",
  "/how-it-works": "How it works",
  "/earn": "Earn",
  "/tools": "Contractor Growth Toolkit",
  "/guides": "Guides",
  "/guides/what-is-a-referral-program": "What is a referral program?",
  "/compare": "Compare",
  "/partners": "Partners",
  "/partners/terms": "Partner program terms",
  "/referral-programs": "Referral Programs",
  "/for-businesses": "For businesses",
  "/for-referrers": "For referrers",
  "/sample": "Demo",
  "/ask-kit": "Referral ask kit",
  "/trust": "Trust",
  "/privacy": "Privacy policy",
  "/terms": "Terms of service",
  "/docs/zapier": "Zapier and integrations",
};

/** The page's own name: articles use their headline, others a short label, else the title. */
export const crumbName = (route: PrerenderRoute) =>
  CRUMB_NAMES[route.path] ??
  (route.article || route.path.startsWith("/guides/") || route.path.startsWith("/referral-program/")
    ? route.h1
    : route.title.replace(/\s*\|\s*Revvin$/, ""));

export const breadcrumbs = (route: PrerenderRoute) => {
  const items = [{ name: "Home", item: SITE }];
  if (route.path !== "/") {
    const parent = PARENT_PAGES.find((p) => route.path.startsWith(p.prefix));
    if (parent && `${parent.prefix.replace(/\/$/, "")}` !== route.path) {
      items.push({ name: parent.name, item: parent.item });
    }
    items.push({ name: crumbName(route), item: `${SITE}${route.path}` });
  }
  return {
    "@type": "BreadcrumbList",
    "@id": `${SITE}${route.path === "/" ? "/" : route.path}#breadcrumb`,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
};

export const jsonLd = (route: PrerenderRoute) => {
  const url = `${SITE}${route.path === "/" ? "/" : route.path}`;
  const graph: unknown[] = [
    ORGANIZATION,
    WEBSITE,
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: route.title,
      description: route.description,
      isPartOf: { "@id": SITE_ID },
      about: { "@id": ORG_ID },
      inLanguage: "en-US",
      breadcrumb: { "@id": `${url}#breadcrumb` },
      primaryImageOfPage: { "@type": "ImageObject", url: ogUrl(SITE, route.path), width: 1200, height: 630 },
    },
    breadcrumbs(route),
  ];
  // The founder's full Person node lives on /about; every author reference
  // elsewhere points at its id.
  if (route.path === "/about") graph.push(FOUNDER_PERSON);
  // The priced product description belongs on the pages that are actually about
  // buying it, not on every document.
  if (route.path === "/" || route.path === "/pricing" || route.path === "/for-businesses") {
    graph.push(SOFTWARE);
  }
  // Guides are written articles published by Revvin with a maintained date, so
  // they carry an Article node. The hub at /guides is a collection, not one.
  if (route.path.startsWith("/guides/") || route.article) {
    const dated = route.path.startsWith("/compare/") || Boolean(route.tables?.length);
    graph.push({
      "@type": "Article",
      "@id": `${url}#article`,
      headline: route.h1,
      description: route.description,
      mainEntityOfPage: { "@id": `${url}#webpage` },
      inLanguage: "en-US",
      author: FOUNDER_REF,
      publisher: { "@id": ORG_ID },
      datePublished: route.datePublished ?? (dated ? COMPARISONS_CHECKED_ON : GUIDES_PUBLISHED_AT),
      dateModified: route.dateModified ?? (dated ? COMPARISONS_CHECKED_ON : GUIDES_UPDATED_AT),
      image: { "@type": "ImageObject", url: ogUrl(SITE, route.path), width: 1200, height: 630 },
      ...(route.tables?.length
        ? { hasPart: route.tables.map((t) => ({ "@type": "Table", about: t.caption })) }
        : {}),
    });
  }
  if (route.definedTerms?.length) {
    graph.push({
      "@type": "DefinedTermSet",
      "@id": `${url}#terms`,
      name: route.h1,
      url,
      hasDefinedTerm: route.definedTerms.map((t) => ({
        "@type": "DefinedTerm",
        "@id": `${url}#${t.id}`,
        name: t.term,
        description: t.definition,
        url: `${url}#${t.id}`,
        inDefinedTermSet: { "@id": `${url}#terms` },
      })),
    });
  }
  if (route.faqs?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: route.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph,
  });
};

/**
 * Client side guard baked into the SPA fallback document (dist/index.html).
 * The fallback is served for every path with no static file behind it, so
 * without this a crawler that runs JavaScript would read the homepage copy,
 * title and canonical under some other URL. Old store paths additionally get
 * a real "Page not found" document. This runs before first paint, so visitors
 * never see it and requests for "/" itself are untouched.
 */
const FALLBACK_GUARD = `<script>(function(){var p=location.pathname;if(p==="/")return;var r=document.getElementById("root");if(r){r.textContent="";r.removeAttribute("data-ssr");}var c=document.querySelector('link[rel="canonical"]');if(c)c.parentNode.removeChild(c);var legacy=${JSON.stringify(
  LEGACY_STORE_PREFIXES,
)}.some(function(x){return p===x||p.indexOf(x+"/")===0||p.indexOf(x+"?")===0;});document.title=legacy?"Page not found | Revvin":"Revvin";var m=document.querySelector('meta[name="robots"]');if(!m){m=document.createElement("meta");m.setAttribute("name","robots");document.head.appendChild(m);}m.setAttribute("content",legacy?"noindex,nofollow":"noindex,follow");if(legacy&&r){var h=document.createElement("h1");h.textContent="Page not found";r.appendChild(h);var q=document.createElement("p");q.textContent="This address does not exist on revvin.co.";r.appendChild(q);}})();</script>`;

const bodyHtml = (route: PrerenderRoute, ssr?: string | null) => {
  if (ssr) return `<div id="root" data-ssr="1">${ssr}</div>${route.path === "/" ? FALLBACK_GUARD : ""}`;
  const parts: string[] = [`<h1>${esc(route.h1)}</h1>`];
  if (route.path.startsWith("/guides/") || route.article) parts.push(`<p>By ${esc(FOUNDER_REF.name)}, Founder of Revvin</p>`);
  for (const s of route.sections) {
    parts.push(`<h2>${esc(s.heading)}</h2><p>${esc(s.body)}</p>`);
  }
  for (const t of route.tables ?? []) {
    const head = t.head.map((h) => `<th scope="col">${esc(h)}</th>`).join("");
    const rows = t.rows
      .map((r) => `<tr><th scope="row">${esc(r[0])}</th>${r.slice(1).map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
      .join("");
    parts.push(`<table><caption>${esc(t.caption)}</caption><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table><p>${esc(CHECKED_LINE)}</p>`);
  }
  if (route.faqs?.length) {
    parts.push("<h2>Frequently asked questions</h2>");
    for (const f of route.faqs) {
      parts.push(`<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`);
    }
  }
  if (route.sources?.length) {
    parts.push(`<h2>Sources</h2><ul>${route.sources.map((x) => `<li><a href="${esc(x.url)}" rel="noopener">${esc(x.label)}</a></li>`).join("")}</ul>`);
  }
  const links = PRERENDER_ROUTES.filter((r) => r.path !== route.path && !r.redirectTo && !r.noindex)
    .map((r) => `<li><a href="${esc(r.path)}">${esc(r.h1)}</a></li>`)
    .join("");
  parts.push(`<nav aria-label="Site pages"><h2>More from Revvin</h2><ul>${links}</ul></nav>`);

  return `<div id="root">${parts.join("")}</div>${route.path === "/" ? FALLBACK_GUARD : ""}`;
};

const replaceTag = (html: string, pattern: RegExp, replacement: string) =>
  pattern.test(html) ? html.replace(pattern, replacement) : html;

const setHead = (
  html: string,
  { title, description, url, image }: { title: string; description: string; url: string; image?: string },
) => {
  const t = esc(title);
  const d = esc(description);
  let out = html;
  out = replaceTag(out, /<title>[\s\S]*?<\/title>/, `<title>${t}</title>`);
  out = replaceTag(
    out,
    /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="description" content="${d}">`,
  );
  out = replaceTag(
    out,
    /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:title" content="${t}">`,
  );
  out = replaceTag(
    out,
    /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:description" content="${d}">`,
  );
  out = replaceTag(
    out,
    /<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:url" content="${esc(url)}">`,
  );
  out = replaceTag(
    out,
    /<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="twitter:title" content="${t}">`,
  );
  out = replaceTag(
    out,
    /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="twitter:description" content="${d}">`,
  );
  if (image) {
    out = replaceTag(
      out,
      /<meta\s+property="og:image"\s+content="[\s\S]*?"\s*\/?>/,
      `<meta property="og:image" content="${esc(image)}">`,
    );
    out = replaceTag(
      out,
      /<meta\s+name="twitter:image"\s+content="[\s\S]*?"\s*\/?>/,
      `<meta name="twitter:image" content="${esc(image)}">`,
    );
  }
  return out;
};

/** Exactly one canonical per document, always self referencing unless told otherwise. */
const setCanonical = (html: string, href: string) =>
  html
    .replace(/<link rel="canonical"[\s\S]*?>\s*/g, "")
    .replace("</head>", `  <link rel="canonical" href="${esc(href)}">\n  </head>`);

const setRobots = (html: string, content: string) =>
  html
    .replace(/<meta\s+name="robots"\s+content="[\s\S]*?"\s*\/?>\s*/g, "")
    .replace("</head>", `  <meta name="robots" content="${content}">\n  </head>`);

const stripNoscript = (html: string) => html.replace(/<noscript>[\s\S]*?<\/noscript>\s*/, "");

/**
 * A moved page. This host has no server redirects, so the document carries an
 * immediate meta refresh (read by Google as a permanent redirect), a canonical
 * to the new address, and a plain link for anything that ignores both.
 */
export const renderRedirectDoc = (template: string, route: PrerenderRoute & { redirectTo: string }) => {
  const target = `${SITE}${route.redirectTo === "/" ? "/" : route.redirectTo}`;
  let html = setHead(template, { title: route.title, description: route.description, url: target });
  html = setCanonical(html, target);
  if (route.noindex) html = setRobots(html, "noindex, follow");
  html = html.replace("</head>", `  <meta http-equiv="refresh" content="0; url=${esc(route.redirectTo)}">\n  </head>`);
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/, "");
  html = html.replace(
    /<div id="root">\s*<\/div>/,
    `<div id="root"><h1>${esc(route.h1)}</h1><p>This page moved to <a href="${esc(route.redirectTo)}">${esc(target)}</a>.</p></div>`,
  );
  return stripNoscript(html);
};

export const renderRoute = (template: string, route: PrerenderRoute, ssr?: string | null) => {
  if (route.redirectTo) return renderRedirectDoc(template, route as PrerenderRoute & { redirectTo: string });
  const url = `${SITE}${route.path === "/" ? "/" : route.path}`;
  let html = setHead(template, { title: route.title, description: route.description, url, image: ogUrl(SITE, route.path) });
  if (route.path === "/guides" || route.path.startsWith("/guides/")) {
    html = html.replace("</head>", `  <link rel="alternate" type="application/rss+xml" title="Revvin guides" href="/guides/rss.xml">\n  </head>`);
  }

  // Every indexable document self references, including the homepage. The SPA
  // fallback is the same file as the homepage document, so the inline guard
  // removes this canonical whenever the served path is not "/".
  html = setCanonical(html, route.canonical ?? url);

  if (route.noindex) html = setRobots(html, "noindex, nofollow");

  html = replaceTag(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${jsonLd(route).replace(/</g, "\\u003c")}</script>`,
  );

  html = html.replace(/<div id="root">\s*<\/div>/, bodyHtml(route, ssr));

  // The JS-disabled fallback would now duplicate the homepage copy on every
  // page, since #root already carries real per-route content.
  return stripNoscript(html);
};

/** A private surface: noindex in the raw HTML, no canonical, no structured data. */
export const renderPrivateDoc = (
  template: string,
  doc: { path: string; title: string; body: string },
) => {
  let html = setHead(template, {
    title: doc.title,
    description: doc.body,
    url: `${SITE}${doc.path}`,
  });
  html = html.replace(/<link rel="canonical"[\s\S]*?>\s*/g, "");
  html = setRobots(html, "noindex, nofollow");
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/, "");
  html = html.replace(
    /<div id="root">\s*<\/div>/,
    `<div id="root"><h1>${esc(doc.title.replace(" | Revvin", ""))}</h1><p>${esc(doc.body)}</p></div>`,
  );
  return stripNoscript(html);
};

/**
 * The not-found document. Lovable hosting has no way to return a real 404 or
 * 410 status and no redirect rules, so this is served with a 200 status; the
 * noindex tag is what removes the URL from the index.
 */
export const renderNotFoundDoc = (template: string) => {
  let html = setHead(template, {
    title: "Page not found | Revvin",
    description:
      "This Revvin page does not exist. Find referral pages, guides and pricing from the links below.",
    url: `${SITE}/404`,
  });
  html = html.replace(/<link rel="canonical"[\s\S]*?>\s*/g, "");
  html = setRobots(html, "noindex, nofollow");
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/, "");
  html = html.replace(
    /<div id="root">\s*<\/div>/,
    `<div id="root"><h1>Page not found</h1><p>The page you asked for does not exist on revvin.co. Publishing a referral page on Revvin is free; Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD.</p><nav aria-label="Site pages"><h2>Go to</h2><ul>${PRERENDER_ROUTES.filter(
      (r) => !r.noindex,
    )
      .map((r) => `<li><a href="${esc(r.path)}">${esc(r.h1)}</a></li>`)
      .join("")}</ul></nav></div>`,
  );
  return stripNoscript(html);
};

export interface PublicBusiness {
  slug: string;
  name: string;
  description?: string | null;
  offer_amount?: string | null;
  offer_trigger?: string | null;
  logo_url?: string | null;
  city?: string | null;
  state?: string | null;
  category?: string | null;
  is_demo?: boolean | null;
  updated_at?: string | null;
  service_area?: string | null;
  [key: string]: unknown;
}

export const businessMeta = (biz: PublicBusiness) => {
  const reward = biz.offer_amount?.trim() || "a reward";
  const city = biz.city?.trim();
  return {
    title: `Refer a customer to ${biz.name}${city ? ` in ${city}` : ""}, earn ${reward}`,
    description: `${biz.name} pays ${reward} when your referral turns into a job. Submit a referral or get your own link.`,
  };
};

/** Indexable only when published (the public view holds only live pages), not a demo and not restricted. */
export const businessIndexable = (biz: PublicBusiness) => !biz.is_demo && !isRestrictedCategory(biz.category);

export const businessJsonLd = (biz: PublicBusiness) => {
  const url = `${SITE}/r/${biz.slug}`;
  const reward = biz.offer_amount?.trim();
  return {
    "@type": "LocalBusiness",
    "@id": `${url}#business`,
    name: biz.name,
    url,
    ...((biz.service_area?.trim() || biz.city?.trim())
      ? { areaServed: biz.service_area?.trim() ? { "@type": "Place", name: biz.service_area.trim() } : { "@type": "City", name: biz.city!.trim() } }
      : {}),
    ...(biz.city?.trim()
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: biz.city.trim(),
            ...(biz.state?.trim() ? { addressRegion: biz.state.trim() } : {}),
          },
        }
      : {}),
    makesOffer: {
      "@type": "Offer",
      name: "Referral reward",
      description: reward
        ? `${biz.name} pays ${reward} when a referral turns into a job.${biz.offer_trigger ? ` ${biz.offer_trigger}` : ""}`.trim()
        : `${biz.name} pays a reward when a referral turns into a job.`,
    },
  };
};

/**
 * A published referral page, rendered at build time so link previews in
 * iMessage, WhatsApp and Facebook and crawlers that do not run JavaScript get
 * the business, not the Revvin homepage. Set to noindex, follow for now: these
 * pages belong to the businesses, not to the marketing site.
 */
export const renderBusinessDoc = (template: string, biz: PublicBusiness, ssr?: string | null, earnMetro?: string | null) => {
  const url = `${SITE}/r/${biz.slug}`;
  const { title, description } = businessMeta(biz);
  let html = setHead(template, {
    title,
    description,
    url,
    image: ogUrl(SITE, `/r/${biz.slug}`),
  });
  html = setCanonical(html, url);
  html = setRobots(html, businessIndexable(biz) ? "index, follow" : "noindex, follow");
  html = replaceTag(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        ORGANIZATION,
        WEBSITE,
        businessJsonLd(biz),
        {
          "@type": "WebPage",
          "@id": `${url}#webpage`,
          url,
          name: title,
          description,
          inLanguage: "en-US",
          isPartOf: { "@id": SITE_ID },
          about: { "@id": `${url}#business` },
        },
      ],
    }).replace(/</g, "\\u003c")}</script>`,
  );
  // A shortcut saved from this page must reopen this page, so it gets its own
  // manifest instead of the site one, which starts at the dashboard.
  html = html.replace(
    /<link rel="manifest" href="[^"]*"\s*\/?>/,
    `<link rel="manifest" href="${businessManifestPath(biz.slug)}" />`,
  );
  if (ssr) {
    // The page component reads this instead of fetching, so the browser
    // hydrates the same markup the server produced.
    const data = JSON.stringify({ business: biz, earnMetro: earnMetro ?? null }).replace(/</g, "\\u003c");
    html = html.replace(/<div id="root">\s*<\/div>/, `<div id="root" data-ssr="1">${ssr}</div>`);
    html = html.replace("</body>", `<script>window.__REVVIN_SSR__=${data};</script>\n  </body>`);
  } else {
    html = html.replace(
      /<div id="root">\s*<\/div>/,
      `<div id="root"><h1>Refer a customer to ${esc(biz.name)}</h1><p>${esc(description)}</p><p><a href="/r/${esc(
        biz.slug,
      )}">Open the referral form</a></p></div>`,
    );
  }
  return stripNoscript(html);
};

export interface EarnMetroDoc { name: string; slug: string; businesses: { slug: string; name: string; trade: string | null; city: string | null; reward: string | null }[] }

/** A live Earn city: title, canonical and an ItemList of LocalBusiness items with an Offer for the reward. */
export const renderEarnMetroDoc = (template: string, metro: EarnMetroDoc) => {
  const url = `${SITE}/earn/${metro.slug}`;
  const title = `Get paid for referrals in ${metro.name} | Revvin`;
  const description = `Local businesses in ${metro.name} that pay a reward when your referral turns into a job. Get your own link to each one, free.`;
  let html = setHead(template, { title, description, url, image: ogUrl(SITE, `/earn/${metro.slug}`) });
  html = setCanonical(html, url);
  html = setRobots(html, "index, follow");
  html = replaceTag(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        ORGANIZATION,
        {
          "@type": "ItemList",
          "@id": `${url}#list`,
          name: `Businesses that pay for referrals in ${metro.name}`,
          itemListElement: metro.businesses.map((b, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "LocalBusiness",
              name: b.name,
              url: `${SITE}/r/${b.slug}`,
              ...(b.city ? { address: { "@type": "PostalAddress", addressLocality: b.city } } : {}),
              makesOffer: { "@type": "Offer", name: "Referral reward", description: `${b.reward ?? ""} when a referred job closes`.trim() },
            },
          })),
        },
      ],
    }).replace(/</g, "\\u003c")}</script>`,
  );
  const items = metro.businesses
    .map((b) => `<li><a href="/r/${esc(b.slug)}">${esc(b.name)}</a>${b.trade ? `, ${esc(b.trade)}` : ""}${b.city ? `, ${esc(b.city)}` : ""}. Reward: ${esc(b.reward ?? "")}</li>`)
    .join("");
  html = html.replace(/<div id="root">\s*<\/div>/, `<div id="root"><h1>Get paid for referrals in ${esc(metro.name)}</h1><p>${esc(description)}</p><ul>${items}</ul></div>`);
  return stripNoscript(html);
};

/** Live metros and their eligible businesses, read through the public functions only. */
const fetchLiveMetros = async (supabaseUrl: string, anonKey: string): Promise<EarnMetroDoc[]> => {
  const call = async (fn: string, body: unknown) => {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok ? res.json() : [];
  };
  try {
    const metros = (await call("fn_earn_metros", {})) as { name: string; slug: string }[];
    const out: EarnMetroDoc[] = [];
    for (const m of Array.isArray(metros) ? metros : []) {
      const businesses = await call("fn_earn_businesses", { p_metro_slug: m.slug });
      out.push({ name: m.name, slug: m.slug, businesses: Array.isArray(businesses) ? businesses : [] });
    }
    return out;
  } catch {
    return [];
  }
};

const fetchPublishedBusinesses = async (
  supabaseUrl: string,
  anonKey: string,
): Promise<PublicBusiness[]> => {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/businesses_public?select=${PRERENDER_BUSINESS_COLS}&limit=1000`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as PublicBusiness[];
    return Array.isArray(rows) ? rows.filter((r) => r && typeof r.slug === "string") : [];
  } catch {
    return [];
  }
};

/** Plain text of /about, /pricing, /how-it-works and every guide, for AI readers. */
export const renderLlmsFull = () => {
  const picked = PRERENDER_ROUTES.filter(
    (r) => !r.redirectTo && !r.noindex && (["/about", "/pricing", "/how-it-works"].includes(r.path) || r.path.startsWith("/guides/")),
  );
  const parts = [`# Revvin, full text`, "", CANONICAL_SENTENCE, ""];
  for (const r of picked) {
    parts.push(`## ${r.h1}`, `URL: ${SITE}${r.path}`, "", r.description, "");
    for (const sec of r.sections) parts.push(`### ${sec.heading}`, sec.body, "");
    for (const f of r.faqs ?? []) parts.push(`Q: ${f.q}`, `A: ${f.a}`, "");
  }
  return parts.join("\n");
};

/**
 * Read the build environment without importing Vite at module scope: this file
 * is also imported by tests, and pulling Vite (and esbuild) in there is not
 * worth it for two variables. Process env wins over .env, as Vite does.
 */
const readBuildEnv = (): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const file of [".env", ".env.local", ".env.production"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]) {
    const v = process.env[key];
    if (v) out[key] = v;
  }
  return out;
};

/** Article routes (guides and comparisons) for the RSS feed, newest first. */
export const rssRoutes = () =>
  PRERENDER_ROUTES.filter(
    (r) => !r.redirectTo && !r.noindex && (r.path.startsWith("/guides/") || r.path.startsWith("/compare/")),
  );

const rfc822 = (iso: string) => new Date(`${iso}T12:00:00Z`).toUTCString();

/** RSS 2.0 feed of the guides and comparisons. */
export const renderRss = () => {
  const items = rssRoutes()
    .map((r) => {
      const dated = r.path.startsWith("/compare/") || Boolean(r.tables?.length);
      const date = r.datePublished ?? (dated ? COMPARISONS_CHECKED_ON : GUIDES_PUBLISHED_AT);
      return { r, date };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .map(
      ({ r, date }) =>
        `    <item>\n      <title>${esc(r.h1)}</title>\n      <link>${SITE}${r.path}</link>\n      <guid isPermaLink="true">${SITE}${r.path}</guid>\n      <description>${esc(r.description)}</description>\n      <pubDate>${rfc822(date)}</pubDate>\n    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Revvin guides and comparisons</title>
    <link>${SITE}/guides</link>
    <atom:link href="${SITE}/guides/rss.xml" rel="self" type="application/rss+xml" />
    <description>Referral program guides and honest software comparisons for home-service businesses, from Revvin.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>
`;
};

/** Preload the two above-the-fold font files (hashed names read from the build). */
export const addFontPreloads = (html: string, assetNames: string[]) => {
  const pick = (prefix: string) => assetNames.find((n) => n.startsWith(prefix) && n.endsWith(".woff2"));
  const links = [pick("barlow-condensed-latin-800-normal"), pick("barlow-latin-400-normal")]
    .filter(Boolean)
    .map((n) => `<link rel="preload" href="/assets/${n}" as="font" type="font/woff2" crossorigin>`)
    .join("\n    ");
  if (!links) return html;
  return html.replace(/(\s*)(<script type="module")/, `$1${links}$1$2`);
};

export default function prerenderPlugin(): Plugin {
  return {
    name: "revvin-prerender",
    apply: "build",
    async closeBundle() {
      const root = process.cwd();
      const dist = path.resolve(root, "dist");
      const indexPath = path.join(dist, "index.html");
      if (!fs.existsSync(indexPath)) return;
      const template = fs.readFileSync(indexPath, "utf8");
      const assetNames = fs.existsSync(path.join(dist, "assets")) ? fs.readdirSync(path.join(dist, "assets")) : [];

      // Real page markup for public routes. Falls back to the text documents
      // if the server build or one route's render fails.
      const ssrRender: SsrRender | null = process.env.REVVIN_NO_SSR ? null : await buildSsrRenderer(root);
      let ssrOk = 0;
      const ssrFailed: string[] = [];
      const renderSsr = async (url: string) => {
        if (!ssrRender) return null;
        try {
          const out = await ssrRender(url);
          ssrOk++;
          return out;
        } catch (err) {
          ssrFailed.push(`${url}: ${String(err).split("\n")[0].slice(0, 200)}`);
          return null;
        }
      };

      // Every document is collected first, then finished in one pass: font
      // preloads everywhere, critical CSS inlined on the server-rendered ones.
      const docs: { file: string; html: string; inlineCss: boolean }[] = [];
      const addDoc = (routePath: string, html: string, inlineCss = false) => {
        const file = routePath === "/" ? indexPath : path.join(dist, routePath.replace(/^\//, ""), "index.html");
        docs.push({ file, html, inlineCss });
      };
      const ogCards: OgCard[] = [];

      let count = 0;
      for (const route of PRERENDER_ROUTES) {
        const ssr = route.redirectTo ? null : await renderSsr(route.path);
        addDoc(route.path, renderRoute(template, route, ssr), Boolean(ssr));
        if (!route.redirectTo) ogCards.push({ path: route.path, title: route.title, kind: ogKind(route.path) });
        count++;
      }

      for (const doc of PRIVATE_DOCS) {
        addDoc(doc.path, renderPrivateDoc(template, doc));
        count++;
      }

      const notFound = renderNotFoundDoc(template);
      for (const legacy of [...LEGACY_STORE_PREFIXES, ...LEGACY_STORE_URLS]) {
        addDoc(legacy, notFound);
        count++;
      }
      docs.push({ file: path.join(dist, "404.html"), html: notFound, inlineCss: false });

      const env = readBuildEnv();
      const supabaseUrl = env.VITE_SUPABASE_URL;
      const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Live Earn cities. Non-live cities are never written or listed, so they
      // stay noindex single-page-app routes and out of the sitemap.
      let metros: EarnMetroDoc[] = [];
      if (supabaseUrl && anonKey) {
        metros = await fetchLiveMetros(supabaseUrl, anonKey);
        for (const m of metros) {
          addDoc(`/earn/${m.slug}`, renderEarnMetroDoc(template, m));
          ogCards.push({ path: `/earn/${m.slug}`, title: `Get paid for referrals in ${m.name}`, kind: "Earn" });
          count++;
        }
      }

      // Published referral pages, rendered in full with the business data.
      let businessCount = 0;
      let businesses: PublicBusiness[] = [];
      if (supabaseUrl && anonKey) {
        businesses = await fetchPublishedBusinesses(supabaseUrl, anonKey);
        for (const biz of businesses) {
          const earnMetro = metros.find((m) => m.businesses.some((b) => b.slug === biz.slug))?.slug ?? null;
          (globalThis as Record<string, unknown>).__REVVIN_SSR__ = { business: biz, earnMetro };
          const ssr = await renderSsr(`/r/${biz.slug}`);
          (globalThis as Record<string, unknown>).__REVVIN_SSR__ = undefined;
          addDoc(`/r/${biz.slug}`, renderBusinessDoc(template, biz, ssr, earnMetro), Boolean(ssr));
          ogCards.push({ path: `/r/${biz.slug}`, title: businessMeta(biz).title, kind: "Referral reward" });
          fs.mkdirSync(path.join(dist, "manifests"), { recursive: true });
          fs.writeFileSync(
            path.join(dist, `manifests/r-${biz.slug}.webmanifest`),
            JSON.stringify(buildBusinessManifest({ slug: biz.slug, name: biz.name, logoUrl: biz.logo_url }), null, 2),
            "utf8",
          );
          businessCount++;
        }
      }

      const { default: Beasties } = await import("beasties");
      const beasties = new Beasties({
        path: dist,
        publicPath: "/",
        preload: "swap",
        inlineFonts: true,
        preloadFonts: false,
        pruneSource: false,
        reduceInlineStyles: false,
        mergeStylesheets: true,
        compress: true,
        logLevel: "silent",
      });
      for (const doc of docs) {
        let html = addFontPreloads(doc.html, assetNames);
        if (doc.inlineCss) {
          try {
            html = await beasties.process(html);
          } catch (err) {
            console.warn(`[prerender] critical CSS skipped for ${doc.file}: ${String(err).slice(0, 200)}`);
          }
        }
        fs.mkdirSync(path.dirname(doc.file), { recursive: true });
        fs.writeFileSync(doc.file, html, "utf8");
      }

      const og = await writeOgImages(dist, ogCards).catch((err) => {
        console.warn(`[prerender] Open Graph images failed: ${String(err).slice(0, 300)}`);
        return { written: [] as string[], failed: ogCards.map((c) => c.path) };
      });
      // Pages whose share image was not written must not reference a missing
      // file: point their meta and JSON-LD at the static og-image.png instead.
      for (const failedPath of og.failed) {
        const file = failedPath === "/" ? indexPath : path.join(dist, failedPath.replace(/^\//, ""), "index.html");
        if (!fs.existsSync(file)) continue;
        const html = fs.readFileSync(file, "utf8");
        fs.writeFileSync(file, html.split(ogUrl(SITE, failedPath)).join(`${SITE}/og-image.png`), "utf8");
      }
      const ogCount = og.written.length;

      const entries = buildSitemapEntries({
        buildDate: new Date().toISOString().slice(0, 10),
        businesses: businesses.filter(businessIndexable),
        metros: metros.map((m) => m.slug),
      });
      fs.writeFileSync(path.join(dist, "sitemap.xml"), renderSitemap(entries), "utf8");
      fs.writeFileSync(path.join(dist, "llms-full.txt"), renderLlmsFull(), "utf8");
      fs.mkdirSync(path.join(dist, "guides"), { recursive: true });
      fs.writeFileSync(path.join(dist, "guides", "rss.xml"), renderRss(), "utf8");
      fs.writeFileSync(path.join(dist, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY, "utf8");

      console.log(
        `[prerender] wrote ${count} static documents (${ssrOk} with full page markup), ${businessCount} referral pages, ${ogCount} share images, sitemap.xml with ${entries.length} URLs, rss.xml, llms-full.txt, 404.html and the IndexNow key to dist/`,
      );
      if (ssrFailed.length) console.warn(`[prerender] text fallback for ${ssrFailed.length} routes:\n  ${ssrFailed.join("\n  ")}`);
    },
  };
}
