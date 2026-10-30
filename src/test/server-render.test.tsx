// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { render } from "@/entry-server";

// The build renders public pages to HTML with this same function. These
// checks pin what the raw HTML holds before any JavaScript runs.
afterEach(() => {
  globalThis.__REVVIN_SSR__ = undefined;
});

describe("server render", () => {
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
    expect(html).toMatch(/They said it(&#x27;|')s okay to share their details with Acme Roofing/);
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
