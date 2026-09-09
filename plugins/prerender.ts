import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { PRERENDER_ROUTES, type PrerenderRoute } from "../src/content/seoRoutes";
import { PRICE_TEXT, MONTHLY_PRICE, ANNUAL_PRICE } from "../src/config/pricing";

const SITE = "https://revvin.co";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Stable node identifiers. Every document points at the SAME @id for the
// organization, the website and the software, so a search engine or an answer
// engine reading two pages understands them as one entity rather than as two
// unrelated mentions of a similar name.
const ORG_ID = `${SITE}/#organization`;
const SITE_ID = `${SITE}/#website`;
const APP_ID = `${SITE}/#software`;

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
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
};

const jsonLd = (route: PrerenderRoute) => {
  const graph: unknown[] = [
    ORGANIZATION,
    {
      "@type": "WebPage",
      name: route.title,
      description: route.description,
      url: `${SITE}${route.path}`,
    },
    breadcrumbs(route),
  ];
  if (route.faqs?.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: route.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  return JSON.stringify(
    graph.map((g) => ({ "@context": "https://schema.org", ...(g as object) })),
  );
};

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

  // dist/index.html is also the SPA fallback for every unprerendered route
  // (/r/*, /dashboard, /auth, /i/*). Without this, those routes would flash the
  // homepage copy until React boots, and a crawler reading the fallback would
  // see homepage content and title under another URL. The guard also marks the
  // fallback noindex; SEOHead sets the real per-route tags once React boots. The script runs before first paint, so
  // crawlers on "/" still get the static content and real visitors elsewhere
  // never see it.
  const guard =
    route.path === "/"
      ? `<script>if(location.pathname!=="/"){var r=document.getElementById("root");if(r)r.textContent="";document.title="Revvin";var m=document.querySelector('meta[name="robots"]');if(!m){m=document.createElement("meta");m.setAttribute("name","robots");document.head.appendChild(m);}m.setAttribute("content","noindex,follow");}</script>`
      : "";
  return `<div id="root">${parts.join("")}</div>${guard}`;
};


const replaceTag = (html: string, pattern: RegExp, replacement: string) =>
  pattern.test(html) ? html.replace(pattern, replacement) : html;

const renderRoute = (template: string, route: PrerenderRoute) => {
  const title = esc(route.title);
  const desc = esc(route.description);
  const url = `${SITE}${route.path === "/" ? "" : route.path}`;
  let html = template;

  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = replaceTag(
    html,
    /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="description" content="${desc}">`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:title" content="${title}">`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:description" content="${desc}">`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:url" content="${esc(url)}">`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="twitter:title" content="${title}">`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="twitter:description" content="${desc}">`,
  );

  // Canonical: skip the root document because dist/index.html is also the SPA
  // fallback for every unprerendered route (e.g. business referral pages under
  // /r/*). A self-referential canonical on that fallback would tell crawlers
  // that every such route is a duplicate of the homepage.
  if (route.path !== "/") {
    html = html.replace(
      /<link rel="canonical"[\s\S]*?>\s*/,
      "",
    );
    html = html.replace(
      "</head>",
      `  <link rel="canonical" href="${esc(route.canonical ?? `${SITE}${route.path}`)}">\n  </head>`,
    );
  }

  // JSON-LD
  html = replaceTag(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${jsonLd(route)}</script>`,
  );

  // Prerendered body
  html = html.replace(/<div id="root">\s*<\/div>/, bodyHtml(route));

  // Remove the JS-disabled fallback; #root now carries real per-route content,
  // so the fallback would duplicate the homepage copy on every page.
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>\s*/, "");

  return html;
};

export default function prerenderPlugin(): Plugin {
  return {
    name: "revvin-prerender",
    apply: "build",
    closeBundle() {
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
        const dir = path.join(dist, route.path.replace(/^\//, ""));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
        count++;
      }

      if (rootHtml) {
        fs.writeFileSync(indexPath, rootHtml, "utf8");
        count++;
      }

      // A real static not-found document. The SPA fallback's inline script sets
      // a noindex meta tag on unprerendered paths, which is NOT an HTTP 404: the
      // server still answers 200. This file gives the host something correct to
      // serve with a 404 status for genuinely unknown paths. Wiring it up is
      // hosting configuration and is not done by this build; until then unknown
      // paths still return the SPA fallback with a 200 status. Dynamic app
      // routes (/r/*, /i/*, /dashboard, /guides/*) must continue to be served
      // the SPA fallback, never this file.
      const notFound = template
        .replace(/<title>[\s\S]*?<\/title>/, "<title>Page not found | Revvin</title>")
        .replace(
          /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/,
          '<meta name="description" content="This Revvin page does not exist. Find referral pages, guides and pricing from the links below.">',
        )
        .replace("</head>", '  <meta name="robots" content="noindex,follow">\n  </head>')
        .replace(
          /<div id="root">\s*<\/div>/,
          `<div id="root"><h1>Page not found</h1><p>The page you asked for does not exist on revvin.co. Publishing a referral page on Revvin is free; Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD.</p><nav aria-label="Site pages"><h2>Go to</h2><ul>${PRERENDER_ROUTES.map(
            (r) => `<li><a href="${esc(r.path)}">${esc(r.h1)}</a></li>`,
          ).join("")}</ul></nav></div>`,
        )
        .replace(/<noscript>[\s\S]*?<\/noscript>\s*/, "");
      fs.writeFileSync(path.join(dist, "404.html"), notFound, "utf8");

      console.log(
        `[prerender] wrote ${count} static route documents plus 404.html to dist/ (404 status requires host routing)`,
      );
    },

  };
}
