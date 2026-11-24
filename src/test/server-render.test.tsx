// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { render } from "@/entry-server";
import fs from "node:fs";
import { JSDOM } from "jsdom";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import { renderRoute } from "../../plugins/prerender";

// The build renders public pages to HTML with this same function. These
// checks pin what the raw HTML holds before any JavaScript runs.
afterEach(() => {
  globalThis.__REVVIN_SSR__ = undefined;
});

describe("server render", () => {
  it("homepage raw document contains the requested headings without changing head metadata", async () => {
    const route = PRERENDER_ROUTES.find((r) => r.path === "/");
    if (!route) throw new Error("Missing homepage route");
    const template = fs.readFileSync("index.html", "utf8");
    const html = renderRoute(template, route, await render("/"));
    const doc = new JSDOM(html).window.document;
    expect(doc.getElementById("root")?.getAttribute("data-ssr")).toBe("1");
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    const h1 = doc.querySelector("h1");
    expect(h1?.firstElementChild?.textContent).toBe("Free referral program software for contractors, home services and any business that grows by word of mouth");
    expect(h1?.textContent?.replace(/\s+/g, " ").trim()).toBe("Free referral program software for contractors, home services and any business that grows by word of mouth Your happy customers are your best salespeople. Put them to work.");
    expect(doc.getElementById("journey-heading")?.textContent).toBe("How your customer list turns into booked jobs");
    expect(doc.getElementById("faq-heading")?.textContent).toBe("Referral program questions owners ask first");
    const headTags = (text: string) => text.match(/<title>[\s\S]*?<\/title>|<meta[^>]+(?:name="description"|property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/g);
    expect(headTags(html)).toEqual(headTags(renderRoute(template, route)));
    expect(doc.title).toBe("Revvin | Free referral program for home-service businesses");
    expect(doc.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("Turn happy customers into salespeople. A free referral page, personal links and an ask after every job. You pay a reward only when a job closes.");
  }, 30000);

  it("referral page renders the offer, form labels, consent and the Earn link", async () => {
    globalThis.__REVVIN_SSR__ = {
      business: {
        id: "b1",
        slug: "acme-roofing",
        name: "Acme Roofing",
        description: "Family roofing crew.",
        category: "Roofing",
        service_area: "Fraser Valley",
        logo_url: null,
        offer_amount: "$250",
        offer_trigger: "when the job is paid",
        offer_fine_print: null,
        city: "Abbotsford",
        state: "BC",
      } as never,
      earnMetro: "fraser-valley",
    };
    const html = await render("/r/acme-roofing");
    expect(html.match(/<h1/g)?.length).toBe(1);
    expect(html).toContain("Acme Roofing");
    expect(html).toContain("$250");
    expect(html).toContain("Your name");
    expect(html).toMatch(/They said it(&#x27;|')s okay to share their details with (<!-- -->)?Acme Roofing/);
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('href="/earn/fraser-valley"');
    expect(html).not.toContain("not live");
  }, 30000);

  it("calculator renders its inputs and results, not a loading state", async () => {
    const html = await render("/tools/referral-reward-calculator");
    expect(html.match(/<h1/g)?.length).toBe(1);
    expect(html).toMatch(/<input[^>]+/);
    expect(html).toMatch(/gross margin/i);
  }, 30000);
});
