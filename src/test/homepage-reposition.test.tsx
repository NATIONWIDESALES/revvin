import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { readFileSync } from "node:fs";

vi.mock("@/lib/track", () => ({ track: vi.fn() }));
class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
vi.stubGlobal("IntersectionObserver", IO);
vi.mock("@/components/marketing/HeroPhoneScene", () => ({ default: () => null }));

import Index, { homeFaqJsonLd } from "@/pages/Index";
import { HOME_FAQS } from "@/content/homeFaqs";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import { renderRoute } from "../../plugins/prerender";
import { buildSitemapEntries, renderSitemap } from "../../plugins/sitemap";
const generatedSitemap = () => renderSitemap(buildSitemapEntries({ buildDate: "2026-10-29", dateFor: () => null }));


const TEMPLATE = readFileSync("index.html", "utf8");

describe("homepage", () => {
  it("renders the H1 and both hero CTAs", () => {
    render(<MemoryRouter><Index /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Your happy customers are your best salespeople. Put them to work.",
    );
    const start = screen.getAllByRole("link", { name: /Start free/ });
    expect(start[0].getAttribute("href")).toBe("/signup");
    expect(screen.getByRole("link", { name: "See a real referral page" }).getAttribute("href")).toBe("/sample");
    expect(screen.getByText("Free for your first 100 customers. No card.")).toBeTruthy();
  });

  it("has a FAQPage with exactly six questions", () => {
    expect(homeFaqJsonLd.mainEntity).toHaveLength(6);
    expect(HOME_FAQS.map((f) => f.q)).toEqual([
      "Is it really free?",
      "How do I pay my referrers?",
      "What if nobody refers?",
      "Can my techs and reps have their own links?",
      "Is it legal to pay for referrals in my industry?",
      "Does it work with Jobber or Housecall Pro?",
    ]);
    const home = PRERENDER_ROUTES.find((r) => r.path === "/")!;
    const html = renderRoute(TEMPLATE, home);
    const faq = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1])["@graph"].find((n: { "@type": string }) => n["@type"] === "FAQPage");
    expect(faq.mainEntity).toHaveLength(6);
  });
});

describe("prerendered /about and /earn", () => {
  it.each(["/about", "/earn"])("%s has one title and one self canonical", (path) => {
    const route = PRERENDER_ROUTES.find((r) => r.path === path)!;
    expect(route).toBeTruthy();
    const html = renderRoute(TEMPLATE, route);
    expect(html.match(/<title>/g)).toHaveLength(1);
    const canon = html.match(/<link rel="canonical" href="([^"]+)">/g)!;
    expect(canon).toHaveLength(1);
    expect(canon[0]).toContain(`https://revvin.co${path}"`);
    expect(html).toContain(`<h1>${route.h1}</h1>`);
  });
  it("about states the canonical sentence", () => {
    const html = renderRoute(TEMPLATE, PRERENDER_ROUTES.find((r) => r.path === "/about")!);
    expect(html).toContain("Revvin (revvin.co) is a free referral program and local referral network for home-service businesses.");
  });
});

describe("redirects", () => {
  const cases: [string, string][] = [["/about-revvin-llm", "/about"], ["/for-businesses", "/"], ["/trust", "/about"], ["/for-referrers", "/earn"]];
  it.each(cases)("prerendered %s points at %s", (from, to) => {
    const route = PRERENDER_ROUTES.find((r) => r.path === from)!;
    expect(route.redirectTo).toBe(to);
    const html = renderRoute(TEMPLATE, route);
    expect(html).toContain(`<meta http-equiv="refresh" content="0; url=${to}">`);
    expect(html).toContain(`<link rel="canonical" href="https://revvin.co${to}">`);
  });
  it.each(cases)("the app sends %s to %s", (from, to) => {
    const src = readFileSync("src/App.tsx", "utf8");
    expect(src).toContain(`<Route path="${from}" element={<Navigate to="${to}" replace />} />`);
  });
  it.each(cases)("client route %s lands on %s", (from, to) => {
    render(
      <MemoryRouter initialEntries={[from]}>
        <Routes>
          <Route path={from} element={<Navigate to={to} replace />} />
          <Route path={to} element={<p>landed {to}</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(`landed ${to}`)).toBeTruthy();
  });
  it("sitemap lists /about and /earn and none of the moved URLs", () => {
    const sm = generatedSitemap();
    expect(sm).toContain("<loc>https://revvin.co/about</loc>");
    expect(sm).toContain("<loc>https://revvin.co/earn</loc>");
    for (const [from] of cases) expect(sm).not.toContain(`<loc>https://revvin.co${from}</loc>`);
  });
});

describe("no em dashes in the new copy", () => {
  const files = [
    "src/pages/Index.tsx", "src/pages/About.tsx", "src/pages/Earn.tsx", "src/pages/Pricing.tsx",
    "src/components/Navbar.tsx", "src/components/marketing/TeamSection.tsx",
    "src/components/marketing/ReferralWorthCalculator.tsx", "src/components/marketing/LeadCaptureForm.tsx",
    "src/content/homeFaqs.ts", "src/content/aboutPage.ts", "src/content/earnPage.ts", "src/content/homeSeo.ts",
    "index.html", "public/llms.txt",
  ];
  it.each(files)("%s", (f) => {
    expect(readFileSync(f, "utf8")).not.toContain("\u2014");
  });
});
