// Marketplace "Get quotes": one request to up to 3 claimed local businesses.
// Matching, storage, the per-visitor limit and all emails happen in the
// service-only fn_quote_broadcast_submit, using the existing email queue.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, max) : "");

async function visitorHash(req: Request) {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`quote_broadcast:${ip}`));
  return Array.from(new Uint8Array(d).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let r: Record<string, unknown>;
  try { r = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
  if (!r || typeof r !== "object") return json({ error: "invalid_body" }, 400);
  // Honeypot: answer like a success so bots learn nothing.
  if (str(r.website, 200)) return json({ ok: true, sent: [], saved: false });
  const lat = Number(r.lat), lng = Number(r.lng);
  const slugs = Array.isArray(r.slugs) ? r.slugs.filter((s) => typeof s === "string" && /^[a-z0-9-]{1,100}$/.test(s)).slice(0, 3) : [];
  const timing = ["asap", "month", "planning"].includes(String(r.timing)) ? String(r.timing) : "asap";
  const details = str(r.details, 1001);
  if (details.length < 20 || details.length > 1000) return json({ error: "invalid_details" }, 400);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json({ error: "invalid_location" }, 400);

  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Server configuration error" }, 500);
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("fn_quote_broadcast_submit", {
    p: {
      trade: str(r.trade, 60), details, city: str(r.city, 80), lat, lng,
      name: str(r.name, 120), email: str(r.email, 254), phone: str(r.phone, 40) || null, timing,
      slugs, share_later: r.share_later === true, visitor_hash: await visitorHash(req),
    },
  });
  if (error) {
    const m = error.message ?? "";
    if (m.includes("rate_limited")) return json({ error: "rate_limited" }, 429);
    const known = m.match(/(invalid_[a-z]+|nothing_to_send)/);
    if (known) return json({ error: known[1] }, 400);
    console.error("quote broadcast failed");
    return json({ error: "unavailable" }, 503);
  }
  return json(data);
});
