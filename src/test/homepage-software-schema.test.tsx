import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync } from "node:fs";
import { MONTHLY_PRICE, ANNUAL_PRICE } from "@/config/pricing";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import { jsonLd, renderRoute } from "../../plugins/prerender";

const captured = vi.hoisted(() => ({ nodes: [] as Record<string, any>[] }));
vi.mock("@/components/SEOHead", () => ({ default: ({ jsonLd }: { jsonLd: Record<string, any>[] }) => { captured.nodes = jsonLd; return null; } }));
vi.mock("@/lib/track", () => ({ track: vi.fn() }));
vi.mock("@/lib/earnLive", () => ({ useEarnLive: () => false }));
vi.mock("@/components/marketing/HeroYardSign", () => ({ default: () => null, SIGN_EXAMPLES: [{}] }));

import Index from "@/pages/Index";
import Pricing from "@/pages/Pricing";
import IndustryLanding from "@/pages/IndustryLanding";

describe("Revvin plan schema", () => {
  it("homepage describes Web business software with free and configured Pro offers, not a physical product", () => {
    render(<MemoryRouter><Index /></MemoryRouter>);
    const software = captured.nodes.find(n => n["@type"] === "SoftwareApplication");
    expect(software).toMatchObject({ name: "Revvin", url: "https://revvin.co", applicationCategory: "BusinessApplication", operatingSystem: "Web" });
    expect(software?.offers.map((offer: any) => [Number(offer.price), offer.priceCurrency])).toEqual([[0, "USD"], [MONTHLY_PRICE, "USD"]]);
    expect(captured.nodes.some(n => n["@type"] === "Product")).toBe(false);
    expect(software).not.toHaveProperty("aggregateRating");
    expect(software).not.toHaveProperty("review");
  });

  it("pricing retains software offers from the existing config", () => {
    render(<MemoryRouter><Pricing /></MemoryRouter>);
    const software = captured.nodes.find(n => n["@type"] === "SoftwareApplication");
    expect(software?.offers.map((offer: any) => [Number(offer.price), offer.priceCurrency])).toEqual([[0, "USD"], [MONTHLY_PRICE, "USD"], [ANNUAL_PRICE, "USD"]]);
    expect(captured.nodes.some(n => n["@type"] === "Product")).toBe(false);
  });

  it("trade pages describe a service rather than a physical product", () => {
    render(<MemoryRouter initialEntries={["/referral-program/roofing"]}><Routes><Route path="/referral-program/:industry" element={<IndustryLanding />} /></Routes></MemoryRouter>);
    expect(captured.nodes.some(n => n["@type"] === "Service")).toBe(true);
    expect(captured.nodes.some(n => n["@type"] === "Product")).toBe(false);
  });

  it("all prerendered routes exclude Product nodes and home/pricing retain configured software offers", () => {
    const template = readFileSync("index.html", "utf8");
    for (const route of PRERENDER_ROUTES) {
      const graph = JSON.parse(jsonLd(route))["@graph"];
      expect(graph.some((n: any) => n["@type"] === "Product"), route.path).toBe(false);
      if (route.path !== "/" && route.path !== "/pricing") continue;
      const html = renderRoute(template, route);
      const schema = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
      if (!schema) throw new Error("Missing static schema");
      const software = JSON.parse(schema)["@graph"].find((n: any) => n["@type"] === "SoftwareApplication");
      expect(software).toMatchObject({ applicationCategory: "BusinessApplication", operatingSystem: "Web" });
      expect(software.offers.map((offer: any) => [Number(offer.price), offer.priceCurrency])).toEqual([[0, "USD"], [MONTHLY_PRICE, "USD"], [ANNUAL_PRICE, "USD"]]);
      expect(software).not.toHaveProperty("aggregateRating");
      expect(software).not.toHaveProperty("review");
    }
  });
});