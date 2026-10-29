import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import { renderRoute, renderBusinessDoc, renderLlmsFull, businessMeta } from "../../plugins/prerender";
import { buildSitemapEntries, renderSitemap, indexableRoutes } from "../../plugins/sitemap";
import { checkSlug } from "@/lib/slugRules";

const h = vi.hoisted(() => ({ rpc: vi.fn(), insert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: h.rpc, from: () => ({ insert: h.insert }) },
}));
vi.mock("@/lib/track", () => ({ track: vi.fn() }));

const template = fs.readFileSync("index.html", "utf8");
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe("prerendered public routes", () => {
  for (const r of PRERENDER_ROUTES.filter((x) => !x.redirectTo)) {
    it(`${r.path}: one title, description, canonical, matching og tags, valid JSON-LD`, () => {
      const html = renderRoute(template, r);
      expect(count(html, /<title>/g)).toBe(1);
      expect(count(html, /<meta\s+name="description"/g)).toBe(1);
      expect(count(html, /<link rel="canonical"/g)).toBe(1);
      expect(html).not.toMatch(/name="keywords"/);
      const title = html.match(/<title>([\s\S]*?)<\/title>/)![1];
      const desc = html.match(/<meta name="description" content="([^"]*)"/)![1];
      expect(html).toContain(`<meta property="og:title" content="${title}">`);
      expect(html).toContain(`<meta property="og:description" content="${desc}">`);
      const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1];
      expect(() => JSON.parse(ld)).not.toThrow();
    });
  }

  it("Organization has founder with sameAs and disambiguation, no empty sameAs; WebSite has alternateName", () => {
    const html = renderRoute(template, PRERENDER_ROUTES.find((r) => r.path === "/")!);
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1])["@graph"];
    const org = graph.find((n: { "@type": string }) => n["@type"] === "Organization");
    expect(org.founder.name).toBe("Karm Sandhu");
    expect(org.founder.sameAs.length).toBeGreaterThan(0);
    expect(org.founder.disambiguatingDescription).toBeTruthy();
    expect("sameAs" in org).toBe(false);
    const site = graph.find((n: { "@type": string }) => n["@type"] === "WebSite");
    expect(site).toMatchObject({ name: "Revvin", alternateName: "Revvin.co" });
  });

  it("guides keep Article with Person author and Organization publisher", () => {
    const g = PRERENDER_ROUTES.find((r) => r.path.startsWith("/guides/"))!;
    const graph = JSON.parse(renderRoute(template, g).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1])["@graph"];
    const art = graph.find((n: { "@type": string }) => n["@type"] === "Article");
    expect(art.author["@type"]).toBe("Person");
    expect(art.publisher["@id"]).toContain("#organization");
  });

  it("index.html has no keywords meta tag", () => {
    expect(template).not.toMatch(/name="keywords"/);
  });
});

describe("robots.txt", () => {
  const robots = fs.readFileSync("public/robots.txt", "utf8");
  it("no longer disallows /signup, /login, /welcome but keeps /me and /dashboard", () => {
    for (const p of ["/signup", "/login", "/welcome"]) expect(robots).not.toMatch(new RegExp(`^Disallow: ${p}$`, "m"));
    expect(count(robots, /^Disallow: \/me$/gm)).toBe(3);
    expect(count(robots, /^Disallow: \/dashboard$/gm)).toBe(3);
  });
});

describe("generated sitemap", () => {
  const xml = renderSitemap(
    buildSitemapEntries({ buildDate: "2026-10-29", businesses: [{ slug: "good-roof", updated_at: "2026-10-01T00:00:00Z" }], metros: ["fraser-valley"] }),
  );
  it("contains the key pages and live extras", () => {
    for (const p of ["/", "/about", "/earn", "/pricing"]) expect(xml).toContain(`<loc>https://revvin.co${p}</loc>`);
    expect(xml).toContain("<loc>https://revvin.co/r/good-roof</loc>");
    expect(xml).toContain("<lastmod>2026-10-01</lastmod>");
    expect(xml).toContain("<loc>https://revvin.co/earn/fraser-valley</loc>");
  });
  it("every URL has a lastmod and no noindex, redirect or private route appears", () => {
    expect(count(xml, /<url>/g)).toBe(count(xml, /<lastmod>/g));
    for (const r of PRERENDER_ROUTES.filter((x) => x.noindex || x.redirectTo)) {
      expect(xml).not.toContain(`<loc>https://revvin.co${r.path}</loc>`);
    }
    for (const p of ["/me", "/signup", "/login", "/welcome", "/dashboard"]) expect(xml).not.toContain(`revvin.co${p}<`);
    expect(indexableRoutes().every((r) => !r.noindex)).toBe(true);
  });
  it("public/sitemap.xml is no longer hand-written", () => {
    expect(fs.existsSync("public/sitemap.xml")).toBe(false);
  });
});

describe("referral page documents", () => {
  const base = { slug: "good-roof", name: "Good Roof", city: "Langley", offer_amount: "$200", category: "Roofing" };
  it("title and description follow the template; city omitted when missing", () => {
    expect(businessMeta(base).title).toBe("Refer a customer to Good Roof in Langley, earn $200");
    expect(businessMeta({ ...base, city: null }).title).toBe("Refer a customer to Good Roof, earn $200");
    expect(businessMeta(base).description).toBe("Good Roof pays $200 when your referral turns into a job. Submit a referral or get your own link.");
  });
  it("normal page is indexable with LocalBusiness and Offer, canonical without query", () => {
    const html = renderBusinessDoc(template, base);
    expect(html).toMatch(/<meta name="robots" content="index, follow">/);
    expect(html).toContain('<link rel="canonical" href="https://revvin.co/r/good-roof">');
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1])["@graph"];
    const lb = graph.find((n: { "@type": string }) => n["@type"] === "LocalBusiness");
    expect(lb).toMatchObject({ name: "Good Roof", url: "https://revvin.co/r/good-roof", areaServed: { name: "Langley" } });
    expect(lb.makesOffer["@type"]).toBe("Offer");
  });
  it("demo and restricted pages are noindex", () => {
    expect(renderBusinessDoc(template, { ...base, is_demo: true })).toMatch(/content="noindex, follow"/);
    expect(renderBusinessDoc(template, { ...base, category: "Real Estate" })).toMatch(/content="noindex, follow"/);
  });
});

describe("llms files", () => {
  it("llms.txt opens with the canonical sentence", () => {
    const t = fs.readFileSync("public/llms.txt", "utf8");
    expect(t).toContain("> Revvin (revvin.co) is a free referral program and local referral network for home-service businesses.");
    expect(t).not.toContain("\u2014");
  });
  it("llms-full.txt covers about, pricing, how it works and guides", () => {
    const t = renderLlmsFull();
    for (const p of ["/about", "/pricing", "/how-it-works", "/guides/"]) expect(t).toContain(`https://revvin.co${p}`);
    expect(t).not.toContain("\u2014");
  });
});

describe("team waitlist", () => {
  beforeEach(() => { h.rpc.mockReset(); h.insert.mockReset(); });
  it("saves through fn_submit_earn_lead, not a direct insert", async () => {
    h.rpc.mockResolvedValue({ data: true, error: null });
    const { submitEmailLead } = await import("@/lib/emailLeads");
    expect(await submitEmailLead("a@b.co", "team_waitlist")).toEqual({ ok: true });
    expect(h.rpc).toHaveBeenCalledWith("fn_submit_earn_lead", { p_email: "a@b.co", p_source: "team_waitlist" });
    expect(h.insert).not.toHaveBeenCalled();
  });
});

describe("reserved slugs", () => {
  for (const s of ["earn", "me", "about", "partners", "pricing", "signup", "login", "welcome", "dashboard", "tools"]) {
    it(`refuses ${s}`, () => expect(checkSlug(s)).toMatchObject({ ok: false, reason: "reserved" }));
  }
});
