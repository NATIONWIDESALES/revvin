// Server-side smoke test for the Google Maps Platform connector.
// Geocodes a stable, well-known address via the Lovable connector gateway and
// reports back the number of results. Used by the frontend Vitest smoke test
// (src/test/maps-smoke.test.ts) so the check can also run in CI without a
// browser. Public (verify_jwt = false) so it can be curled from anywhere; it
// only issues a read-only Geocoding request and returns no secrets.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
// Stable, unambiguous address that Google has geocoded consistently for years.
const DEFAULT_ADDRESS = "1600 Amphitheatre Parkway, Mountain View, CA";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing Google Maps connector credentials" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let address = DEFAULT_ADDRESS;
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("address");
    if (q && q.length <= 200) address = q;
  } catch { /* keep default */ }

  const started = Date.now();
  const res = await fetch(
    `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}`,
    {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
      },
    },
  );
  const body = await res.text();
  if (!res.ok) {
    return new Response(
      JSON.stringify({ ok: false, status: res.status, details: body }),
      { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let parsed: any = null;
  try { parsed = JSON.parse(body); } catch { /* leave null */ }
  const results = Array.isArray(parsed?.results) ? parsed.results : [];
  const first = results[0];

  return new Response(
    JSON.stringify({
      ok: results.length > 0,
      address,
      count: results.length,
      google_status: parsed?.status ?? null,
      first_formatted: first?.formatted_address ?? null,
      first_location: first?.geometry?.location ?? null,
      latency_ms: Date.now() - started,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});