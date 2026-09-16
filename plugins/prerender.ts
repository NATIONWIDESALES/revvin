import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { PRERENDER_ROUTES, type PrerenderRoute } from "../src/content/seoRoutes";
import { PRICE_TEXT, MONTHLY_PRICE, ANNUAL_PRICE } from "../src/config/pricing";
import { buildBusinessManifest, businessManifestPath } from "../src/lib/webManifest";
import {
  APP_ID,
  CONTENT_AUTHOR,
  FOUNDER,
  FOUNDING_DATE,
  GUIDES_PUBLISHED_AT,
  GUIDES_UPDATED_AT,
  INDEXNOW_KEY,
  ORG_DISAMBIGUATION,
  ORG_ID,
  ORG_SAME_AS,
  SITE_ID,
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
  areaServed: ["US", "CA", "AE"],
  slogan: "Your customer list, working for you",
  disambiguatingDescription: ORG_DISAMBIGUATION,
  sameAs: ORG_SAME_AS,
  founder: {
    "@type": "Person",
    name: FOUNDER.name,
    jobTitle: FOUNDER.jobTitle,
  },
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
const SOFTWARE = {
  "@type": "SoftwareApplication",
  "@id": APP_ID,
  name: "Revvin",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web browser",
  url: SITE,
  publisher: { "@id": ORG_ID },
  description: `Referral software for service businesses. Publishing a referral page and taking referrals on it is free. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD, or ${PRICE_TEXT.annualPerYear} billed once, and adds customer list import, the bulk referral ask, reactivation campaigns, ROI reporting and custom page branding. Businesses pay their referrers directly off-platform; Revvin takes no cut.`,
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      url: `${SITE}/pricing`,
      description:
        "Your referral page on your own link, QR code and share tools, print pack, unlimited referral leads, lead inbox with status tracking, offers, payout tracking and a marketplace listing.",
    },
    {
      "@type": "Offer",
      name: "Revvin Pro, monthly",
      price: String(MONTHLY_PRICE),
      priceCurrency: "USD",
      url: `${SITE}/pricing`,
      description:
        "Customer list import, the bulk referral ask sent from your own email app, reactivation campaigns, ROI reporting with a monthly recap and custom page branding. Billed monthly, cancel any time.",
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
];

const titleCase = (segment: string) =>
  segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const breadcrumbs = (route: PrerenderRoute) => {
  const items = [{ name: "Home", item: SITE }];
  if (route.path !== "/") {
    const parent = PARENT_PAGES.find((p) => route.path.startsWith(p.prefix));
    if (parent && `${parent.prefix.replace(/\/$/, "")}` !== route.path) {
      items.push({ name: parent.name, item: parent.item });
    }
    items.push({
      name: titleCase(route.path.split("/").filter(Boolean).pop() ?? ""),
      item: `${SITE}${route.path}`,
    });
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
      primaryImageOfPage: `${SITE}/og-image.png`,
    },
    breadcrumbs(route),
  ];
  // The priced product description belongs on the pages that are actually about
  // buying it, not on every document.
  if (route.path === "/" || route.path === "/pricing" || route.path === "/for-businesses") {
    graph.push(SOFTWARE);
  }
  // Guides are written articles with a named author and a maintained date, so
  // they carry an Article node. The hub at /guides is a collection, not one.
  if (route.path.startsWith("/guides/")) {
    graph.push({
      "@type": "Article",
      "@id": `${url}#article`,
      headline: route.h1,
      description: route.description,
      mainEntityOfPage: { "@id": `${url}#webpage` },
      inLanguage: "en-US",
      author: {
        "@type": "Person",
        name: CONTENT_AUTHOR.name,
        jobTitle: CONTENT_AUTHOR.jobTitle,
      },
      publisher: { "@id": ORG_ID },
      datePublished: GUIDES_PUBLISHED_AT,
      dateModified: GUIDES_UPDATED_AT,
      image: `${SITE}/og-image.png`,
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
const FALLBACK_GUARD = `<script>(function(){var p=location.pathname;if(p==="/")return;var r=document.getElementById("root");if(r)r.textContent="";var c=document.querySelector('link[rel="canonical"]');if(c)c.parentNode.removeChild(c);var legacy=${JSON.stringify(
  LEGACY_STORE_PREFIXES,
)}.some(function(x){return p===x||p.indexOf(x+"/")===0||p.indexOf(x+"?")===0;});document.title=legacy?"Page not found | Revvin":"Revvin";var m=document.querySelector('meta[name="robots"]');if(!m){m=document.createElement("meta");m.setAttribute("name","robots");document.head.appendChild(m);}m.setAttribute("content",legacy?"noindex,nofollow":"noindex,follow");if(legacy&&r){var h=document.createElement("h1");h.textContent="Page not found";r.appendChild(h);var q=document.createElement("p");q.textContent="This address does not exist on revvin.co.";r.appendChild(q);}})();</script>`;

const bodyHtml = (route: PrerenderRoute) => {
  const parts: string[] = [`<h1>${esc(route.h1)}</h1>`];
  for (const s of route.sections) {
    parts.push(`<h2>${esc(s.heading)}</h2><p>${esc(s.body)}</p>`);
  }
  if (route.faqs?.length) {
    parts.push("<h2>Frequently asked questions</h2>");
    for (const f of route.faqs) {
      parts.push(`<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`);
    }
  }
  const links = PRERENDER_ROUTES.filter((r) => r.path !== route.path)
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

export const renderRoute = (template: string, route: PrerenderRoute) => {
  const url = `${SITE}${route.path === "/" ? "/" : route.path}`;
  let html = setHead(template, { title: route.title, description: route.description, url });

  // Every indexable document self references, including the homepage. The SPA
  // fallback is the same file as the homepage document, so the inline guard
  // removes this canonical whenever the served path is not "/".
  html = setCanonical(html, route.canonical ?? url);

  if (route.noindex) html = setRobots(html, "noindex, nofollow");

  html = replaceTag(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${jsonLd(route)}</script>`,
  );

  html = html.replace(/<div id="root">\s*<\/div>/, bodyHtml(route));

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
}

export const businessMeta = (biz: PublicBusiness) => {
  const where = [biz.city, biz.state].filter(Boolean).join(", ");
  const reward = biz.offer_amount ? `${biz.offer_amount}` : "a reward";
  const trigger = biz.offer_trigger ? ` when the job qualifies: ${biz.offer_trigger}.` : ".";
  const description =
    `Refer someone to ${biz.name}${where ? ` in ${where}` : ""} and ${biz.name} pays you ${reward}${trigger}` +
    ` Submit the referral on this page. ${biz.description ? biz.description.trim() : ""}`.trimEnd();
  return {
    title: `Refer a customer to ${biz.name} | Revvin`,
    description: description.slice(0, 300),
  };
};

/**
 * A published referral page, rendered at build time so link previews in
 * iMessage, WhatsApp and Facebook and crawlers that do not run JavaScript get
 * the business, not the Revvin homepage. Set to noindex, follow for now: these
 * pages belong to the businesses, not to the marketing site.
 */
export const renderBusinessDoc = (template: string, biz: PublicBusiness) => {
  const url = `${SITE}/r/${biz.slug}`;
  const { title, description } = businessMeta(biz);
  let html = setHead(template, {
    title,
    description,
    url,
    image: biz.logo_url || `${SITE}/og-image.png`,
  });
  html = setCanonical(html, url);
  html = setRobots(html, "noindex, follow");
  html = replaceTag(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        ORGANIZATION,
        {
          "@type": "WebPage",
          "@id": `${url}#webpage`,
          url,
          name: title,
          description,
          inLanguage: "en-US",
          isPartOf: { "@id": SITE_ID },
        },
      ],
    })}</script>`,
  );
  // A shortcut saved from this page must reopen this page, so it gets its own
  // manifest instead of the site one, which starts at the dashboard.
  html = html.replace(
    /<link rel="manifest" href="[^"]*"\s*\/?>/,
    `<link rel="manifest" href="${businessManifestPath(biz.slug)}" />`,
  );
  html = html.replace(
    /<div id="root">\s*<\/div>/,
    `<div id="root"><h1>Refer a customer to ${esc(biz.name)}</h1><p>${esc(description)}</p><p><a href="/r/${esc(
      biz.slug,
    )}">Open the referral form</a></p></div>`,
  );
  return stripNoscript(html);
};

const fetchPublishedBusinesses = async (
  supabaseUrl: string,
  anonKey: string,
): Promise<PublicBusiness[]> => {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/businesses_public?select=slug,name,description,offer_amount,offer_trigger,logo_url,city,state,category&limit=1000`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as PublicBusiness[];
    return Array.isArray(rows) ? rows.filter((r) => r && typeof r.slug === "string") : [];
  } catch {
    return [];
  }
};

const writeDoc = (dist: string, routePath: string, html: string) => {
  const dir = path.join(dist, routePath.replace(/^\//, ""));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
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

export default function prerenderPlugin(): Plugin {
  return {
    name: "revvin-prerender",
    apply: "build",
    async closeBundle() {
      const dist = path.resolve(process.cwd(), "dist");
      const indexPath = path.join(dist, "index.html");
      if (!fs.existsSync(indexPath)) return;
      const template = fs.readFileSync(indexPath, "utf8");

      let count = 0;
      let rootHtml: string | null = null;

      for (const route of PRERENDER_ROUTES) {
        const html = renderRoute(template, route);
        if (route.path === "/") {
          rootHtml = html;
          continue;
        }
        writeDoc(dist, route.path, html);
        count++;
      }

      if (rootHtml) {
        fs.writeFileSync(indexPath, rootHtml, "utf8");
        count++;
      }

      // Private surfaces get real documents so their noindex is in the served
      // HTML rather than depending on JavaScript.
      for (const doc of PRIVATE_DOCS) {
        writeDoc(dist, doc.path, renderPrivateDoc(template, doc));
        count++;
      }

      // Old store paths from the previous owner of the domain.
      const notFound = renderNotFoundDoc(template);
      for (const legacy of [...LEGACY_STORE_PREFIXES, ...LEGACY_STORE_URLS]) {
        writeDoc(dist, legacy, notFound);
        count++;
      }
      fs.writeFileSync(path.join(dist, "404.html"), notFound, "utf8");

      // Published referral pages, so link previews and non-JavaScript crawlers
      // see the business. If the public view cannot be read at build time the
      // pages simply fall back to the SPA, which still renders correctly for
      // real visitors.
      const env = readBuildEnv();
      const supabaseUrl = env.VITE_SUPABASE_URL;
      const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
      let businessCount = 0;
      if (supabaseUrl && anonKey) {
        const businesses = await fetchPublishedBusinesses(supabaseUrl, anonKey);
        for (const biz of businesses) {
          writeDoc(dist, `/r/${biz.slug}`, renderBusinessDoc(template, biz));
          fs.mkdirSync(path.join(dist, "manifests"), { recursive: true });
          fs.writeFileSync(
            path.join(dist, `manifests/r-${biz.slug}.webmanifest`),
            JSON.stringify(
              buildBusinessManifest({ slug: biz.slug, name: biz.name, logoUrl: biz.logo_url }),
              null,
              2,
            ),
            "utf8",
          );
          businessCount++;
        }
      }

      // IndexNow verification key file, read by Bing, Yandex and Seznam when a
      // URL submission arrives.
      fs.writeFileSync(path.join(dist, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY, "utf8");

      console.log(
        `[prerender] wrote ${count} static documents, ${businessCount} referral pages, 404.html and the IndexNow key to dist/ (404 status codes are not available on this host)`,
      );
    },
  };
}
