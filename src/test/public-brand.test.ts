// @vitest-environment node
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { assertPublicBrand, validatePublicBrandSources } from "@/content/publicBrandGuard";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import { TEAM_BIO, TEAM_REF, ORG_ID } from "@/config/brand";
import { EARN_COPY } from "@/content/earnPage";
import { render } from "@/entry-server";
import { renderRoute, renderLlmsFull, renderRss, jsonLd } from "../../plugins/prerender";
import { FOUNDER_STORY_APPROVED, LIFECYCLE_FROM } from "../../supabase/functions/_shared/lifecycle-config";

describe("public team identity", () => {
  it.each(["Karm", "Sandhu", "https://www.linkedin.com/in/karm"])("rejects retired identity %s", (value) => {
    expect(() => assertPublicBrand(value, "fixture")).toThrow(/Retired personal identity/);
  });
  it("validates every public source", () => {
    expect(() => validatePublicBrandSources(process.cwd())).not.toThrow();
  });
  it("authors articles as the organization", () => {
    expect(TEAM_REF).toMatchObject({ "@type": "Organization", "@id": ORG_ID, name: "Revvin" });
    for (const r of PRERENDER_ROUTES) {
      const graph = JSON.parse(jsonLd(r))["@graph"];
      expect(graph.some((n: Record<string, unknown>) => n["@type"] === "Person"), r.path).toBe(false);
      for (const n of graph) {
        if (n["@type"] === "Organization") expect(n).not.toHaveProperty("founder");
        if (n["@type"] === "Article") expect(n.author).toEqual(TEAM_REF);
      }
    }
  });
  it("validates prerendered pages, RSS and AI text", async () => {
    const template = fs.readFileSync("index.html", "utf8");
    const regional = /Pitt Meadows|Fraser Valley|Langley|Surrey|Maple Ridge|Abbotsford|Vancouver|British Columbia|\bBC\b/;
    for (const r of PRERENDER_ROUTES.filter((r) => !r.redirectTo)) {
      const body = await render(r.path);
      const html = renderRoute(template, r, body);
      expect(() => assertPublicBrand(html, r.path)).not.toThrow();
      expect(html, r.path).not.toMatch(regional);
      expect(html, r.path).not.toContain("\u2014");
    }
    for (const text of [renderLlmsFull(), renderRss(), fs.readFileSync("public/llms.txt", "utf8")]) {
      expect(() => assertPublicBrand(text, "generated text")).not.toThrow();
      expect(text).not.toMatch(regional);
    }
  }, 60000);
  it("keeps the supplied team experience and country rollout", () => {
    expect(TEAM_BIO).toContain("120+ reps, selling 8,000+ accounts a year");
    expect(EARN_COPY.rollout).toBe("Revvin is opening city by city across the US and Canada. Join the list and we'll tell you when businesses near you are live.");
  });
  it("keeps the legacy story send gate disabled and uses the brand sender", () => {
    expect(FOUNDER_STORY_APPROVED).toBe(false);
    expect(LIFECYCLE_FROM).toBe("Revvin <info@revvin.co>");
  });
});