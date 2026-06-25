import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

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

    const body = await req.json().catch(() => ({}));
    const businessId = body.business_id as string | undefined;
    if (!businessId) return json({ error: "business_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Authorize: caller must own the business or be admin.
    const { data: biz } = await admin
      .from("businesses")
      .select("id,user_id,street_address,city,state,postal_code,country")
      .eq("id", businessId)
      .limit(1);
    const b = biz?.[0];
    if (!b) return json({ error: "business not found" }, 404);

    if (b.user_id !== user.id) {
      const { data: roleRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1);
      if (!roleRow?.length) return json({ error: "forbidden" }, 403);
    }

    const parts = [b.street_address, b.city, b.state, b.postal_code, b.country]
      .map((p) => (p ?? "").trim())
      .filter(Boolean);
    if (parts.length === 0) return json({ error: "no address on business" }, 400);
    const address = parts.join(", ");

    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}`;
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GMAPS_KEY,
      },
    });
    const data = await r.json();
    if (!r.ok || data.status !== "OK" || !data.results?.length) {
      await admin
        .from("businesses")
        .update({ geocode_status: data.status || `http_${r.status}`, geocoded_at: new Date().toISOString() })
        .eq("id", businessId);
      return json({ error: "geocode_failed", status: data.status, results: data.results?.length ?? 0 }, 422);
    }

    const top = data.results[0];
    const lat = top.geometry?.location?.lat;
    const lng = top.geometry?.location?.lng;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return json({ error: "no coordinates returned" }, 422);
    }

    await admin
      .from("businesses")
      .update({
        latitude: lat,
        longitude: lng,
        geocode_status: "ok",
        geocoded_at: new Date().toISOString(),
      })
      .eq("id", businessId);

    return json({ ok: true, latitude: lat, longitude: lng, formatted: top.formatted_address });
  } catch (err) {
    console.error("[geocode-business]", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}