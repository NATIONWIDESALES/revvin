import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { PRERENDER_ROUTES, type PrerenderRoute } from "../src/content/seoRoutes";

const SITE = "https://revvin.co";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const ORGANIZATION = {
  "@type": "Organization",
  name: "Revvin",
  url: SITE,
  logo: `${SITE}/android-chrome-192x192.png`,
  sameAs: [SITE],
  slogan: "Your customer list, working for you",
  description:
    "Referral software for service businesses. Turns a past-customer list into referrals. Publishing your referral page is free; Revvin Pro is a flat $49/month USD. No platform fees. Businesses pay their referrers directly off-platform.",
};

const breadcrumbs = (route: PrerenderRoute) => {
  const items = [{ name: "Home", item: SITE }];
  if (route.path !== "/") {
    const parts = route.path.replace(/^\//, "").split("/");
    let acc = "";
    for (const part of parts) {
      acc += `/${part}`;
      items.push({
        name: part.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        item: `${SITE}${acc}`,
      });
    }
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
  return `<div id="root">${parts.join("")}</div>`;
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
      `  <link rel="canonical" href="${esc(`${SITE}${route.path}`)}">\n  </head>`,
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

      console.log(`[prerender] wrote ${count} static route documents to dist/`);
    },
  };
}
