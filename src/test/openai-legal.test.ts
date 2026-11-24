import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ADVERTISING_MEASUREMENT_NOTICE, PRIVACY_DOC, legalPrerenderSections } from "@/content/legal";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import { renderLlmsFull, renderRoute } from "../../plugins/prerender";

describe("OpenAI advertising disclosure parity", () => {
  it("shares the current signup and cookie disclosure across policy, prerender and llms", () => {
    const text = legalPrerenderSections(PRIVACY_DOC).map(section => section.body).join("\n");
    expect(text).toContain(ADVERTISING_MEASUREMENT_NOTICE);
    expect(text).toContain("OpenAI (ChatGPT Ads)");
    expect(text).toContain("signup-completed event for recognized home-service signups");
    expect(text).toContain("__oppref lasts 30 days after capture");
    expect(text).toContain("__obref lasts 365 days after creation");
    const route = PRERENDER_ROUTES.find(route => route.path === "/privacy");
    if (!route) throw Error("Missing privacy route");
    expect(renderRoute(readFileSync("index.html", "utf8"), route)).toContain("OpenAI (ChatGPT Ads)");
    expect(renderLlmsFull()).toContain(ADVERTISING_MEASUREMENT_NOTICE);
    expect(readFileSync("public/llms.txt", "utf8")).toContain("[Privacy](/privacy)");
  });
  it("does not require a CSP change: the existing policy restricts neither scripts nor connections", () => {
    const csp = readFileSync("index.html", "utf8").match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1];
    expect(csp).toBeDefined(); expect(csp).not.toMatch(/(?:^|;)\s*(?:default-src|script-src(?:-elem)?|connect-src)\b/);
  });
});
