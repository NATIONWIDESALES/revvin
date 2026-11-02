// Prospect lookup for the outbound sales team. Given a Google Maps link or a
// "business name + city" query, fetches the public Google Places listing and
// returns a prefilled prospect draft the caller can edit before saving.
// Sales and admin roles only, rate limited to 60 lookups per user per hour.
// Only the place id and the basic listing fields are returned; reviews,
// ratings and photos are never fetched or stored (Google Places terms).

import { createClient } from "npm:@supabase/supabase-js@2.97.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.97.0/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const RATE_LIMIT_PER_HOUR = 60;

// Same normalization as public.fn_offer_is_restricted_category.
const RESTRICTED = ["finance", "insurance", "legal", "mortgage", "realestate"];
const isRestricted = (value: string | null | undefined) =>
  RESTRICTED.includes((value ?? "").toLowerCase().replace(/[^a-z]/g, ""));

// Google Places primaryType -> our trade list (src/content/previewTrades.ts).
const TYPE_TO_TRADE: Record<string, string> = {
  roofing_contractor: "roofing",
  hvac_contractor: "hvac",
  plumber: "plumbing",
  electrician: "electrical",
  landscaper: "landscaping",
  painter: "painting",
  pest_control_service: "pest-control",
  pool_service: "pool-service",
  garage_door_supplier: "garage-door",
  flooring_contractor: "flooring",
  window_installation_service: "window-replacement",
  tree_service: "tree-service",
  house_cleaning_service: "house-cleaning",
  general_contractor: "remodeling",
  fence_contractor: "fencing",
  pressure_washing_service: "pressure-washing",
  carpet_cleaning_service: "carpet-cleaning",
  handyman: "handyman",
  solar_energy_contractor: "solar",
  car_detailing_service: "auto-detailing",
};
const VALID_TRADES = new Set([...Object.values(TYPE_TO_TRADE), "other"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Pulls a place id out of a Google Maps link, or null when the link does not
// carry one (short links and plain search URLs fall back to text search).
function placeIdFromUrl(input: string): string | null {
  const m =
    input.match(/place_id=([A-Za-z0-9_-]{10,})/) ??
    input.match(/!1s([A-Za-z0-9_-]{20,})/) ??
    input.match(/^([A-Za-z0-9_-]{20,})$/);
  return m ? m[1] : null;
}

// "Joe's Roofing, Denver" or "Joe's Roofing Denver" -> { name, city }.
function splitNameCity(input: string): { name: string; city: string } {
  const parts = input.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { name: parts.slice(0, -1).join(", "), city: parts[parts.length - 1] };
  }
  return { name: input.trim(), city: "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GMAPS_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!LOVABLE_API_KEY || !GMAPS_KEY) {
      return json({ error: "Google Maps connector not configured" }, 500);
    }

    const anonClient = createClient(SUPABASE_URL, ANON);
    const { data: userRes } = await anonClient.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

    // Sales or admin only.
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "sales"]);
    if (!roles?.length) return json({ error: "forbidden" }, 403);

    // 60 lookups per user per hour, via the shared rate bucket table.
    const { data: allowed, error: rateErr } = await admin.rpc("fn_rate_bucket_hit", {
      p_key: `prospect_lookup:${user.id}`,
      p_window: "1 hour",
      p_limit: RATE_LIMIT_PER_HOUR,
    } as never);
    if (rateErr || allowed !== true) return json({ error: "rate_limited" }, 429);

    const body = await req.json().catch(() => ({}));
    const input = typeof body.query === "string" ? body.query.trim().slice(0, 300) : "";
    if (input.length < 2) return json({ error: "query required" }, 400);

    const gatewayHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GMAPS_KEY,
      "Content-Type": "application/json",
    };
    const fieldMask =
      "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.nationalPhoneNumber,places.websiteUri,places.primaryType";

    let place: any = null;
    const directId = placeIdFromUrl(input);
    if (directId) {
      const r = await fetch(`${GATEWAY_URL}/places/v1/places/${encodeURIComponent(directId)}`, {
        headers: { ...gatewayHeaders, "X-Goog-FieldMask": fieldMask.replaceAll("places.", "") },
      });
      if (r.ok) place = await r.json();
    }
    if (!place) {
      const { name, city } = splitNameCity(input.replace(/^https?:\/\/\S+$/, ""));
      const textQuery = city ? `${name} ${city}` : name || input;
      const r = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
        method: "POST",
        headers: { ...gatewayHeaders, "X-Goog-FieldMask": fieldMask },
        body: JSON.stringify({ textQuery, pageSize: 1 }),
      });
      if (!r.ok) {
        const errBody = await r.text();
        console.error(`Places search failed [${r.status}]: ${errBody}`);
        return json({ error: "lookup_failed", status: r.status }, 502);
      }
      const data = await r.json();
      place = data.places?.[0] ?? null;
    }
    if (!place) return json({ error: "no_match" }, 404);

    const components: any[] = place.addressComponents ?? [];
    const pick = (type: string) =>
      components.find((c) => (c.types ?? []).includes(type))?.shortText ?? null;
    const countryCode = pick("country") ?? "";
    const country = countryCode === "CA" ? "CA" : "US";

    const primaryType = typeof place.primaryType === "string" ? place.primaryType : "";
    if (isRestricted(primaryType)) {
      return json({ error: "restricted_category", type: primaryType }, 422);
    }
    const trade = TYPE_TO_TRADE[primaryType] ?? "other";
    if (!VALID_TRADES.has(trade)) return json({ error: "unsupported_trade" }, 422);

    return json({
      draft: {
        name: place.displayName?.text ?? "",
        trade,
        city: pick("locality") ?? pick("sublocality") ?? null,
        region: pick("administrative_area_level_1"),
        country,
        phone: place.nationalPhoneNumber ?? null,
        website: place.websiteUri ?? null,
        google_place_id: place.id ?? null,
      },
    });
  } catch (e) {
    console.error("prospect-lookup error:", e);
    return json({ error: "internal" }, 500);
  }
});
