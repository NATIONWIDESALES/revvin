// Build-time sitemap. Generated from the prerendered route list so it can never
// list a page that is not built, a redirect stub or a noindex document.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PRERENDER_ROUTES, type PrerenderRoute } from "../src/content/seoRoutes";

const SITE = "https://revvin.co";

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

/** Paths that must never appear in the sitemap, whatever the route list says. */
const NEVER = ["/me", "/dashboard", "/signup", "/login", "/welcome", "/auth", "/reset-password"];

export const indexableRoutes = (routes: PrerenderRoute[] = PRERENDER_ROUTES) =>
  routes.filter((r) => !r.noindex && !r.redirectTo && !r.canonical && !NEVER.some((p) => r.path === p || r.path.startsWith(`${p}/`)));

/** Content modules that feed a route family, alongside its page component. */
const CONTENT_SOURCES: { match: (p: string) => boolean; file: string }[] = [
  { match: (p) => p.startsWith("/compare/") || p.includes("best-referral-software"), file: "src/content/comparisons.ts" },
  { match: (p) => p.startsWith("/guides"), file: "src/content/guides.ts" },
  { match: (p) => p.startsWith("/referral-program"), file: "src/content/industries.ts" },
  { match: (p) => p === "/privacy" || p === "/terms", file: "src/content/legal.ts" },
  { match: (p) => p.startsWith("/partners/terms"), file: "src/content/partnerTerms.ts" },
  { match: (p) => p === "/about", file: "src/content/aboutPage.ts" },
  { match: (p) => p === "/earn", file: "src/content/earnPage.ts" },
];

/** Maps each route path pattern in App.tsx to the page file it renders. */
export const routeComponentFiles = (appSource: string): { pattern: string; file: string }[] => {
  const files = new Map<string, string>();
  for (const m of appSource.matchAll(/import\s+(\w+)\s+from\s+"\.\/(pages\/[^"]+)"/g)) files.set(m[1], m[2]);
  for (const m of appSource.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\("\.\/(pages\/[^"]+)"\)\)/g)) files.set(m[1], m[2]);
  const out: { pattern: string; file: string }[] = [];
  for (const m of appSource.matchAll(/<Route\s+path=\{?"([^"]+)"\}?\s+element=\{<(?:ProtectedRoute>\s*<)?(\w+)/g)) {
    const f = files.get(m[2]);
    if (!f) continue;
    const base = `src/${f}`;
    const file = [".tsx", ".ts"].map((x) => base + x).find((c) => fs.existsSync(c)) ?? `${base}.tsx`;
    if (m[1].startsWith("/")) out.push({ pattern: m[1], file });
  }
  return out;
};

const matches = (pattern: string, p: string) =>
  new RegExp(`^${pattern.replace(/:[^/]+/g, "[^/]+")}$`).test(p);

export const sourceFilesFor = (routePath: string, appRoutes: { pattern: string; file: string }[]) => {
  const files = appRoutes.filter((r) => matches(r.pattern, routePath)).map((r) => r.file);
  for (const c of CONTENT_SOURCES) if (c.match(routePath)) files.push(c.file);
  return files.length ? files : ["src/content/seoRoutes.ts"];
};

/** Most recent commit date (YYYY-MM-DD) that touched any of the files, or null. */
export const gitDate = (files: string[]): string | null => {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", ...files], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
};

const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const renderSitemap = (entries: SitemapEntry[]) => {
  const seen = new Set<string>();
  const body = entries
    .filter((e) => (seen.has(e.loc) ? false : (seen.add(e.loc), true)))
    .map((e) => `  <url>\n    <loc>${xmlEsc(e.loc)}</loc>\n${e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : ""}  </url>\n`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}</urlset>\n`;
};

export const buildSitemapEntries = (input: {
  buildDate: string;
  businesses?: { slug: string; updated_at?: string | null }[];
  metros?: string[];
  routes?: PrerenderRoute[];
  dateFor?: (files: string[]) => string | null;
}): SitemapEntry[] => {
  const dateFor = input.dateFor ?? gitDate;
  const appRoutes = routeComponentFiles(fs.readFileSync(path.resolve(process.cwd(), "src/App.tsx"), "utf8"));
  const pageEntries = indexableRoutes(input.routes).map((r) => ({
    loc: `${SITE}${r.path === "/" ? "/" : r.path}`,
    lastmod: dateFor(sourceFilesFor(r.path, appRoutes)) ?? input.buildDate,
  }));
  const biz = (input.businesses ?? []).map((b) => ({
    loc: `${SITE}/r/${b.slug}`,
    lastmod: b.updated_at && /^\d{4}-\d{2}-\d{2}/.test(b.updated_at) ? b.updated_at.slice(0, 10) : input.buildDate,
  }));
  const metros = (input.metros ?? []).map((s) => ({
    loc: `${SITE}/earn/${s}`,
    lastmod: dateFor(["src/pages/EarnMetro.tsx"]) ?? input.buildDate,
  }));
  return [...pageEntries, ...biz, ...metros];
};
