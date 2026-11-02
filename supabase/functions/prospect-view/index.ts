// Public entry point for prebuilt prospect preview pages. Anon-invokable:
// filters obvious bots, then calls the rate-limited fn_prospect_view RPC,
// which counts the view, marks the prospect viewed and queues the first-view
// alert email. Unknown, removed or expired codes return the same neutral
// not_found so the page never leaks whether a code exists.

import { createClient } from "npm:@supabase/supabase-js@2.97.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.97.0/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BOT_UA =
  /bot|crawler|spider|slurp|curl|wget|python-requests|headless|lighthouse|pingdom|uptime|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|discordbot/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^[A-Za-z0-9_-]{10,64}$/.test(code)) return json({ error: "not_found" }, 404);

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const ua = req.headers.get("user-agent") ?? "";
    const isBot = BOT_UA.test(ua);

    // Bots read the preview without counting a view or firing alerts.
    const { data, error } = isBot
      ? await db.rpc("fn_prospect_peek", { p_code: code } as never)
      : await db.rpc("fn_prospect_view", { p_code: code } as never);

    if (error) {
      const msg = String(error.message ?? "");
      if (msg.includes("rate_limited")) return json({ error: "rate_limited" }, 429);
      return json({ error: "not_found" }, 404);
    }
    return json({ prospect: data });
  } catch (e) {
    console.error("prospect-view error:", e);
    return json({ error: "internal" }, 500);
  }
});
