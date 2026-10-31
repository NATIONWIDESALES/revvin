import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RESTRICTED_CATEGORIES } from "@/lib/offerUtils";
import { partnerSearchFor } from "@/components/partners/PartnerCapture";
import { renderEarnMetroDoc } from "../../plugins/prerender";
import { analyticsContext } from "@/lib/analyticsPrivacy";

const h = vi.hoisted(() => ({ live: false }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (fn: string) => {
      if (fn === "fn_earn_metro") return { data: [{ name: "Fraser Valley, BC", slug: "fraser-valley", is_live: h.live }], error: null };
      if (fn === "fn_earn_waiting_count") return { data: 0, error: null };
      if (fn === "fn_earn_businesses") return { data: [{ slug: "good-roof", name: "Good Roof", trade: "Roofing", city: "Langley", reward: "$200" }], error: null };
      return { data: null, error: null };
    },
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
  },
}));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
import EarnMetro from "@/pages/EarnMetro";
import { buildSitemapEntries, renderSitemap } from "../../plugins/sitemap";

const sql = readFileSync("drizzle/migrations/0003_earn_metros.sql", "utf8");
const fnBody = (name: string) => sql.slice(sql.indexOf(`FUNCTION public.${name}`), sql.indexOf("$$;", sql.indexOf(`FUNCTION public.${name}`)));
const metroPage = () => render(<MemoryRouter initialEntries={["/earn/fraser-valley"]}><Routes><Route path="/earn/:metro" element={<EarnMetro />} /></Routes></MemoryRouter>);

describe("Earn eligibility", () => {
  it("excludes every restricted trade, demo accounts and businesses without a reward", () => {
    const rule = fnBody("fn_earn_eligible");
    const list = rule.match(/NOT IN \(([^)]+)\)/)![1].replace(/'/g, "").split(",").map((x) => x.trim()).sort();
    expect(list).toEqual(RESTRICTED_CATEGORIES.map((c) => c.toLowerCase().replace(/[^a-z]/g, "")).sort());
    expect(rule).toContain("coalesce(b.is_demo, false) = false");
    expect(rule).toContain("b.show_on_earn");
    expect(rule).toContain("nullif(btrim(coalesce(b.offer_amount, '')), '') IS NOT NULL");
  });
  it("every Earn list, lookup and count uses the shared rule", () => {
    for (const fn of ["fn_earn_businesses", "fn_business_metro", "fn_earn_get_link", "fn_admin_metros"]) expect(fnBody(fn)).toContain("fn_earn_eligible(b, m)");
  });
  it("the public list returns only slug, name, trade, city and reward", () => {
    const fn = fnBody("fn_earn_businesses");
    expect(fn).toContain("RETURNS TABLE(slug text, name text, trade text, city text, reward text)");
    expect(fn).not.toMatch(/email|phone|user_id/);
  });
  it("only admins can set is_live", () => {
    expect(sql).toContain("RAISE EXCEPTION 'only_admins_set_is_live'");
    expect(sql).toMatch(/CREATE POLICY "Admins update metros"[\s\S]*has_role\(auth\.uid\(\), 'admin'\)/);
    expect(fnBody("fn_earn_get_link")).toContain("lower(email) = _email");
  });
});

describe("/earn/{metro}", () => {
  it("not live: noindex and the waitlist, no business list", async () => {
    h.live = false;
    metroPage();
    await screen.findByText(/Revvin is opening city by city across the US and Canada/);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toMatch(/noindex/);
    expect(screen.queryByTestId("earn-business")).toBeNull();
    expect((screen.getByLabelText("City") as HTMLInputElement).value).toBe("Fraser Valley, BC");
    expect(screen.queryByText(/waiting/)).toBeNull();
  });
  it("live: lists businesses with Get my link", async () => {
    h.live = true;
    metroPage();
    expect(await screen.findByTestId("earn-business")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Get my link" })).toBeTruthy();
  });
  it("only live metros go into the built sitemap", () => {
    const xml = renderSitemap(buildSitemapEntries({ buildDate: "2026-10-29", metros: ["fraser-valley"], dateFor: () => null }));
    expect(xml).toContain("<loc>https://revvin.co/earn/fraser-valley</loc>");
    expect(renderSitemap(buildSitemapEntries({ buildDate: "2026-10-29", dateFor: () => null }))).not.toContain("/earn/fraser-valley");
  });
  it("live page doc: title, canonical and ItemList of LocalBusiness with Offer", () => {
    const html = renderEarnMetroDoc(readFileSync("index.html", "utf8"), { name: "Fraser Valley, BC", slug: "fraser-valley", businesses: [{ slug: "good-roof", name: "Good Roof", trade: "Roofing", city: "Langley", reward: "$200" }] });
    expect(html.match(/<title>/g)?.length).toBe(1);
    expect(html).toContain("<title>Get paid for referrals in Fraser Valley, BC | Revvin</title>");
    expect(html).toContain('<link rel="canonical" href="https://revvin.co/earn/fraser-valley">');
    expect(html).toContain('"@type":"ItemList"');
    expect(html).toContain('"makesOffer":{"@type":"Offer"');
    expect(html).not.toContain("—");
  });
});

describe("links and privacy", () => {
  it("?ref= on /r/* is not captured as a partner code; ?via= still is", () => {
    expect(partnerSearchFor("/r/summit", "?ref=AbCdEfGhIjKlMnOpQrStUv12")).toBeNull();
    expect(partnerSearchFor("/r/summit", "?via=jo")).toBe("?via=jo");
    expect(partnerSearchFor("/pricing", "?ref=jo")).toBe("?ref=jo");
  });
  it("/earn/{metro} is counted as one fixed path", () => {
    expect(analyticsContext("https://revvin.co/earn/fraser-valley", "anonymous")?.path).toBe("/earn/:metro");
  });
  it("no em dashes in the new Earn files", () => {
    for (const f of ["src/pages/EarnMetro.tsx", "src/components/earn/GetMyLink.tsx", "src/components/earn/InviteBusinessForm.tsx", "src/lib/earn.ts", "src/components/admin/MetrosPanel.tsx"]) {
      expect(readFileSync(f, "utf8")).not.toContain("—");
    }
  });
});
