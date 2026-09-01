import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { transformSync } from "esbuild";

/**
 * outreach.ts is a Deno module, so we evaluate the pure helpers directly from
 * source rather than importing esm.sh specifiers into vitest.
 */
const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/outreach.ts"),
  "utf8",
);

function extract(name: string): string {
  const start = source.indexOf(`export function ${name}(`);
  if (start === -1) throw new Error(`${name} not found in outreach.ts`);
  let i = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let j = i; j < source.length; j++) {
    if (source[j] === "{") depth++;
    else if (source[j] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, j + 1).replace("export ", "");
    }
  }
  throw new Error(`could not parse ${name}`);
}

const ESC_SRC = `const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");`;

const js = transformSync(
  `${extract("renderTokens")}\n${extract("emailFooter")}`,
  { loader: "ts" },
).code;

const factory = new Function(
  `${ESC_SRC}\n${js}\nreturn { renderTokens, emailFooter };`,
);
const OLD_FACTORY = new Function(
  `${ESC_SRC}\n${extract("renderTokens")}\n${extract("emailFooter")}\nreturn { renderTokens, emailFooter };`,
);
const { renderTokens, emailFooter } = factory() as {
  renderTokens: (i: string, t: Record<string, string>, e: boolean) => string;
  emailFooter: (
    name: string,
    url: string,
    address?: {
      street_address: string;
      city: string;
      postal_code: string;
      country: string;
    } | null,
  ) => string;
};

describe("renderTokens", () => {
  const tokens = { first_name: "Dana", business_name: "Summit Roofing" };

  it("substitutes single-brace tokens", () => {
    expect(renderTokens("Hi {first_name}, from {business_name}", tokens, false)).toBe(
      "Hi Dana, from Summit Roofing",
    );
  });

  it("substitutes double-brace tokens", () => {
    expect(renderTokens("Hi {{first_name}}, from {{ business_name }}", tokens, false)).toBe(
      "Hi Dana, from Summit Roofing",
    );
  });

  it("blanks unknown tokens instead of leaking them", () => {
    expect(renderTokens("Hi {nope} and {{also_nope}}", tokens, false)).toBe("Hi  and ");
  });

  it("escapes html when asked", () => {
    expect(renderTokens("{first_name}", { first_name: "<b>x</b>" }, true)).toBe(
      "&lt;b&gt;x&lt;/b&gt;",
    );
  });
});

describe("emailFooter postal address", () => {
  const address = {
    street_address: "12 Main St",
    city: "Austin",
    postal_code: "78701",
    country: "US",
  };

  it("renders the full postal line for campaign mail", () => {
    const html = emailFooter("Summit Roofing", "https://x/u?token=1", address);
    expect(html).toContain("12 Main St");
    expect(html).toContain("Austin");
    expect(html).toContain("78701");
    expect(html).toContain("Unsubscribe");
  });

  it("keeps the compact footer when no address is supplied", () => {
    const html = emailFooter("Summit Roofing", "https://x/u?token=1");
    expect(html).not.toContain("12 Main St");
    expect(html).toContain("Unsubscribe");
  });
});
