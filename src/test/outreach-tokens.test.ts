import { describe, it, expect } from "vitest";
// outreach.ts is a Deno module, but its only import is type-only, so vitest can
// load it directly. This keeps the test honest about the real shipped helpers.
import { renderTokens, emailFooter } from "../../supabase/functions/_shared/outreach";

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
