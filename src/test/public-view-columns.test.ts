import { describe, it, expect } from "vitest";
import fs from "node:fs";
import type { Database } from "@/integrations/supabase/types";
import { PUBLIC_REFERRAL_PAGE_COLS, PRERENDER_BUSINESS_COLS } from "@/lib/publicReferralCols";

type ViewRow = Database["public"]["Views"]["businesses_public"]["Row"];

// Compile-time guard: each column in the shared select strings must be a key of
// the generated view row. A missing column makes this a type error.
type Split<S extends string> = S extends `${infer H},${infer T}` ? H | Split<T> : S;
type MustBeKeys<K extends string> = [K] extends [keyof ViewRow] ? true : never;
const pageColsOk: MustBeKeys<Split<typeof PUBLIC_REFERRAL_PAGE_COLS>> = true;
const prerenderColsOk: MustBeKeys<Split<typeof PRERENDER_BUSINESS_COLS>> = true;

// Runtime guard against the same generated types file.
const typesSrc = fs.readFileSync("src/integrations/supabase/types.ts", "utf8");
const viewBlock = typesSrc.slice(typesSrc.indexOf("businesses_public: {"));
const rowBlock = viewBlock.slice(0, viewBlock.indexOf("Insert:"));
const viewCols = new Set([...rowBlock.matchAll(/^\s+(\w+): /gm)].map((m) => m[1]));

describe("businesses_public selects", () => {
  it("every column the referral page selects exists on the view", () => {
    expect(pageColsOk && prerenderColsOk).toBe(true);
    for (const c of PUBLIC_REFERRAL_PAGE_COLS.split(",")) expect(viewCols.has(c), c).toBe(true);
    for (const c of PRERENDER_BUSINESS_COLS.split(",")) expect(viewCols.has(c), c).toBe(true);
  });
  it("the view exposes no private contact or owner fields", () => {
    for (const c of ["business_email", "phone", "street_address", "stripe_customer_id", "invite_code", "partner_id"]) {
      expect(viewCols.has(c), c).toBe(false);
    }
  });
});

// Live, read-only check with the public anon key. Run with RUN_LIVE_API_TESTS=1.
const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/).map((l) => l.match(/^(\w+)\s*=\s*"?([^"]*)"?$/)).filter(Boolean).map((m) => [m![1], m![2]]),
);
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

describe.skipIf(!url || !key || process.env.RUN_LIVE_API_TESTS !== "1")("live referral pages (anon)", () => {
  for (const slug of ["next-property", "vancouver-realty-referrals"]) {
    it(`/r/${slug} returns a row with the page's exact select`, async () => {
      const res = await fetch(`${url}/rest/v1/businesses_public?select=${PUBLIC_REFERRAL_PAGE_COLS}&slug=eq.${slug}&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      expect(res.status).toBe(200);
      const rows = await res.json();
      expect(rows.length).toBe(1);
      expect(rows[0].slug).toBe(slug);
    });
  }
});
