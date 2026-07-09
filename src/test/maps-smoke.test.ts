import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Smoke test for Google Maps Platform on the custom domain deployment.
// Invokes the smoke-maps edge function, which geocodes a stable address
// through the connector gateway using the same credentials the app uses at
// runtime. Passing means the connector is linked, the API key is valid, and
// the Geocoding API is enabled.
//
// The frontend browser key restrictions (referrer allowlist) are validated
// separately by loading revvin.co in a browser — this test does not simulate
// that. It covers the server-side half of the smoke check.
//
// Skips gracefully when env vars are missing (local dev without a linked
// Supabase project).

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const runIf = url && anon ? describe : describe.skip;

runIf("Google Maps smoke", () => {
  it("geocodes a known address and returns at least one result", async () => {
    const client = createClient(url!, anon!, { auth: { persistSession: false } });
    const { data, error } = await client.functions.invoke("smoke-maps", {
      body: {},
    });
    if (error) throw new Error(`smoke-maps invoke failed: ${error.message}`);

    expect(data).toBeTruthy();
    expect(data.google_status).toBe("OK");
    expect(typeof data.count).toBe("number");
    expect(data.count).toBeGreaterThanOrEqual(1);
    expect(data.first_formatted).toEqual(expect.stringMatching(/mountain view/i));
  }, 30_000);
});