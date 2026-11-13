// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { PRICE_TEXT } from "@/config/pricing";
import { FREE_CONTACT_LIMIT } from "@/config/planFeatures";
import { RESERVED_SLUGS } from "@/lib/slugRules";
import { trialEmailData } from "../../supabase/functions/_shared/trial-notices";

const read = (p: string) => readFileSync(p, "utf8");
const files = (root: string): string[] => readdirSync(root, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? files(join(root, e.name)) : [join(root, e.name)]);

// Execute the actual TSX template. Only email layout primitives are replaced
// with HTML tags, so the real conditional copy and subject functions run.
function email(name: string, data: Record<string, unknown>) {
  const source = read(`supabase/functions/_shared/transactional-email-templates/${name}.tsx`);
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
  const exports: Record<string, any> = {};
  const require = (id: string) => {
    if (id === "npm:react@18.3.1") return React;
    if (id === "npm:@react-email/components@0.0.22") return { Text: "p" };
    if (id === "../install-copy.ts") return { INSTALL_EMAIL_TIP: "Install tip" };
    if (id === "./revvin-shell.tsx") return {
      RevvinShell: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
      ctaButton: (url: string, label: string) => createElement("a", { href: url }, label),
      heading: {}, paragraph: {}, quoted: {},
    };
    throw new Error(`Unexpected template dependency: ${id}`);
  };
  new Function("require", "exports", js)(require, exports);
  const template = exports.template;
  return { subject: typeof template.subject === "function" ? template.subject(data) : template.subject,
    text: renderToStaticMarkup(createElement(template.component, data)).replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/\s+/g, " ") };
}

describe("retired referral agreement", () => {
  it("redirects to Terms and keeps its slug reserved", () => {
    expect(read("src/App.tsx")).toContain('<Route path="/referral-agreement" element={<Navigate to="/terms" replace />} />');
    expect(RESERVED_SLUGS).toContain("referral-agreement");
  });
  it("never reintroduces platform exclusivity or links to the retired page", () => {
    const violations = files("src").filter(p => !p.startsWith("src/test/")).filter(p => {
      const source = read(p);
      return /exclusive to the platform/i.test(source) || /(?:to|href)\s*=\s*["']\/referral-agreement["']/.test(source);
    });
    expect(violations).toEqual([]);
  });
});

describe("trial email context and actual templates", () => {
  const now = Date.parse("2026-11-13T22:17:00Z");
  const ends = "2026-11-25T00:00:00Z";
  it("marks a future unpaid trial and formats the date in UTC", () => {
    expect(trialEmailData(ends, "free", now)).toEqual({ onTrial: true, trialEndsOn: "November 25" });
  });
  it("never marks paid Pro as a trial", () => {
    expect(trialEmailData(ends, "pro", now)).toEqual({ onTrial: false });
  });
  it.each([undefined, null, "invalid", "2026-11-13T22:17:00Z", "2026-11-12T00:00:00Z"])("does not mark missing or expired end %s as trial", end => {
    expect(trialEmailData(end, "free", now)).toEqual({ onTrial: false });
  });
  it("renders the requested trial welcome without a purchase claim", () => {
    const result = email("pro-welcome", { businessName: "Summit Roofing", ...trialEmailData(ends, "free", now) });
    expect(result.subject).toBe("Your 14-day Pro trial is on. Here is where to start");
    expect(result.text).toContain("Hi, it's the Revvin team. Summit Roofing has every Pro tool free until November 25. No card is on file and nothing is charged automatically. Three steps and your past customers are working for you.");
    expect(result.text).not.toContain("Thanks for going Pro");
  });
  it("preserves the paid welcome subject and opening", () => {
    const result = email("pro-welcome", { businessName: "Summit Roofing", onTrial: false });
    expect(result.subject).toBe("Welcome to Revvin Pro. Here is where to start");
    expect(result.text).toContain("Thanks for going Pro with Summit Roofing. Three steps and your past customers are working for you.");
  });
  it.each(["pro-no-import-d2", "pro-no-ask-d7"])("uses trial context only for trial data in %s", name => {
    const trial = email(name, { businessName: "Summit Roofing", onTrial: true, trialEndsOn: "November 25" });
    const paid = email(name, { businessName: "Summit Roofing", onTrial: false });
    expect(trial.text).toContain("your Pro trial");
    expect(trial.text).not.toContain("Thanks for going Pro");
    expect(paid.text).not.toContain("your Pro trial");
    expect(trial.subject).toBe(paid.subject);
    expect(paid.text).toContain(name === "pro-no-import-d2" ? "Summit Roofing is on Pro but there are no customers" : "Summit Roofing has customers imported but no ask has gone out yet.");
  });
});

describe("price source congruency", () => {
  it("has no literal standard Revvin prices anywhere in src outside config/tests/competitor facts", () => {
    const violations = files("src").filter(p => !p.startsWith("src/test/") && !["src/config/pricing.ts", "src/content/comparisons.ts"].includes(p))
      .filter(p => /\$97(?:0)?/.test(read(p)));
    expect(violations).toEqual([]);
  });
  it("static llms prices and customer cap match the config", () => {
    const llms = read("public/llms.txt");
    const prices = llms.match(/Revvin Pro is (\$[\d.]+)\/month USD, or (\$[\d.]+)\/year USD billed once/);
    expect(prices?.slice(1)).toEqual([PRICE_TEXT.monthly, PRICE_TEXT.annual]);
    expect(Number(llms.match(/Import and ask up to (\d+) customers/)?.[1])).toBe(FREE_CONTACT_LIMIT);
  });
  it("the static entry document's own Pro prices match the config", () => {
    const html = read("index.html");
    const monthly = [...html.matchAll(/(?:Revvin Pro (?:costs a flat|is)) (\$[\d.]+)\/month USD/g)].map(m => m[1]);
    expect(monthly).toHaveLength(2);
    expect(monthly).toEqual([PRICE_TEXT.monthly, PRICE_TEXT.monthly]);
  });
});
