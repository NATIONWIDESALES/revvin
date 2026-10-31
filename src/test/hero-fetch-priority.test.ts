// @vitest-environment node
import { describe, expect, it } from "vitest";
import { addFontPreloads } from "../../plugins/prerender";

const assets = [
  "barlow-condensed-latin-800-normal-heading.woff2",
  "barlow-latin-400-normal-body.woff2",
];
const template = '<head><script type="module" src="/assets/app.js"></script><link rel="modulepreload" href="/assets/react.js"></head>';

describe("text hero fetch priority", () => {
  it("prioritizes both hero fonts ahead of the entry and module preloads", () => {
    const html = addFontPreloads(template, assets, true);
    expect(html.match(/fetchpriority="high"/g)).toHaveLength(2);
    expect(html).toContain('<script fetchpriority="low" type="module" src="/assets/app.js">');
    expect(html).toContain('fetchpriority="low" rel="modulepreload"');
    expect(html.indexOf('as="font"')).toBeLessThan(html.indexOf('<script'));
  });

  it("leaves other routes' script and font priorities unchanged", () => {
    const html = addFontPreloads(template, assets);
    expect(html).not.toContain("fetchpriority");
    expect(html).toContain('<script type="module" src="/assets/app.js">');
  });
});