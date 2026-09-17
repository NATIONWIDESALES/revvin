// Public: validates a partner code and counts one click.
//
// No IP address and no user agent is ever stored. The rate limit is keyed on a
// random browser id the client generates, so a partner cannot be click-farmed
// from one browser and no personal identifier reaches the database.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePartnerCode } from "../_shared/partner-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const code = normalizePartnerCode(body?.code);
    if (!code) return json({ valid: false });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: partners } = await admin
      .from("partners")
      .select("id, status")
      .eq("code", code)
      .limit(1);
    const partner = partners?.[0];
    // Unknown or non-approved codes are ignored silently, and never confirmed.
    if (!partner || partner.status !== "approved") return json({ valid: false });

    const browser = String(body?.browser_id ?? "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
    const landedPath = String(body?.landed_path ?? "").slice(0, 200) || null;

    if (browser) {
      const { data: allowed } = await admin.rpc("fn_rate_bucket_hit", {
        p_key: `partner_click:${partner.id}:${browser}`,
        p_window: "24 hours",
        p_max_hits: 1,
      });
      if (allowed === false) return json({ valid: true, counted: false });
    }

    await admin.from("partner_clicks").insert({
      partner_id: partner.id,
      landed_path: landedPath,
    });

    return json({ valid: true, counted: true });
  } catch (err) {
    console.error("[partner-click]", err);
    return json({ valid: false });
  }
});
