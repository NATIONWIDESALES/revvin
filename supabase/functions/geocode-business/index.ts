import { isPlatformAdmin } from "../_shared/admin-auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkCronAuth } from "../_shared/cron-auth.ts";
import { cityQueryKey, cityQueryFromBusiness } from "../_shared/geocode-city.ts";

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
    if (!token && !req.headers.get("x-cron-secret")) return json({ error: "unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GMAPS_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!LOVABLE_API_KEY || !GMAPS_KEY) {
      return json({ error: "Google Maps connector not configured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const geo = (address: string) => googleGeocode(address, LOVABLE_API_KEY, GMAPS_KEY);

    // City-level backfill for listed businesses without coordinates.
    // Server credential only; cached per place and capped per call.
    if (body?.backfill === true) {
      if (!checkCronAuth(req).ok) {
        const { data: who } = await createClient(SUPABASE_URL, ANON).auth.getUser(token);
        const caller = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } });
        if (!who?.user || !(await isPlatformAdmin(null, who.user, caller))) return json({ error: "unauthorized" }, 401);
      }
      return json(await backfillCities(createClient(SUPABASE_URL, SERVICE), geo, Math.min(Number(body.limit) || 25, 50)));
    }

    const anonClient = createClient(SUPABASE_URL, ANON);
    const { data: userRes } = await anonClient.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

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
      const isAdmin = await isPlatformAdmin(admin, user, createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: `Bearer ${token}` } } }));
      if (!isAdmin) return json({ error: "forbidden" }, 403);
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

async function googleGeocode(address: string, lovableKey: string, mapsKey: string) {
  const r = await fetch(`${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}`, {
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": mapsKey },
  });
  const data = await r.json().catch(() => ({}));
  const loc = data?.results?.[0]?.geometry?.location;
  if (!r.ok || data.status !== "OK" || typeof loc?.lat !== "number" || typeof loc?.lng !== "number") {
    return { status: String(data?.status || `http_${r.status}`), lat: null, lng: null };
  }
  return { status: "ok", lat: loc.lat as number, lng: loc.lng as number };
}

// deno-lint-ignore no-explicit-any
async function backfillCities(admin: any, geo: (a: string) => Promise<{ status: string; lat: number | null; lng: number | null }>, limit: number) {
  const { data: rows } = await admin.from("businesses")
    .select("id,city,state,service_area,country")
    .is("latitude", null).eq("is_published", true).eq("marketplace_listed", true)
    .eq("is_demo", false).eq("is_internal", false).limit(200);
  let located = 0, cached = 0, looked_up = 0, skipped = 0, failed = 0;
  for (const b of rows ?? []) {
    const q = cityQueryFromBusiness(b);
    if (!q) { skipped++; continue; }
    const key = cityQueryKey(q);
    const { data: hit } = await admin.from("geocode_cache").select("latitude,longitude,status").eq("query_key", key).limit(1);
    let res = hit?.[0] ? { status: hit[0].status, lat: hit[0].latitude, lng: hit[0].longitude } : null;
    if (res) cached++;
    else {
      if (looked_up >= limit) { skipped++; continue; }
      looked_up++;
      res = await geo(q);
      await admin.from("geocode_cache").upsert({ query_key: key, latitude: res.lat, longitude: res.lng, status: res.status });
      await new Promise((r) => setTimeout(r, 200));
    }
    if (res.status === "ok" && res.lat !== null) {
      await admin.from("businesses").update({ latitude: res.lat, longitude: res.lng, geocode_status: "city", geocoded_at: new Date().toISOString() }).eq("id", b.id);
      located++;
    } else failed++;
  }
  return { ok: true, located, cached, looked_up, skipped, failed };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}