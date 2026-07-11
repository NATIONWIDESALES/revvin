import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RESEND_FROM_ADDRESS } from "../_shared/app-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json(401, { ok: false, error: "missing token" });

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { ok: false, error: "invalid session" });

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: roleRows } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .limit(1);
    if (!roleRows || roleRows.length === 0) return json(403, { ok: false, error: "admin only" });

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Parse sending domain from RESEND_FROM_ADDRESS (e.g. "Revvin <info@revvin.co>")
    const fromMatch = RESEND_FROM_ADDRESS.match(/<([^>]+)>/);
    const fromEmail = fromMatch ? fromMatch[1] : RESEND_FROM_ADDRESS;
    const sendingDomain = fromEmail.includes("@") ? fromEmail.split("@")[1] : null;

    const checkedAt = new Date().toISOString();

    if (!lovableApiKey || !resendApiKey) {
      return json(200, {
        checkedAt,
        hasLovableKey: !!lovableApiKey,
        hasResendKey: !!resendApiKey,
        fromAddress: RESEND_FROM_ADDRESS,
        sendingDomain,
        domain: null,
        gatewayOk: false,
        error: "Resend gateway credentials not configured",
      });
    }

    const t0 = performance.now();
    const res = await fetch(`${GATEWAY_URL}/domains`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": resendApiKey,
      },
    });
    const latencyMs = Math.round(performance.now() - t0);
    const body = await res.json().catch(() => ({} as Record<string, unknown>));

    if (!res.ok) {
      return json(200, {
        checkedAt,
        hasLovableKey: true,
        hasResendKey: true,
        fromAddress: RESEND_FROM_ADDRESS,
        sendingDomain,
        domain: null,
        gatewayOk: false,
        latencyMs,
        error: `Resend gateway ${res.status}: ${JSON.stringify(body).slice(0, 400)}`,
      });
    }

    // Resend returns { data: [ { id, name, status, region, created_at } ] }
    const domains: Array<Record<string, unknown>> = Array.isArray((body as { data?: unknown }).data)
      ? ((body as { data: Array<Record<string, unknown>> }).data)
      : [];

    const match = sendingDomain
      ? domains.find((d) => String(d.name).toLowerCase() === sendingDomain.toLowerCase())
      : null;

    return json(200, {
      checkedAt,
      hasLovableKey: true,
      hasResendKey: true,
      fromAddress: RESEND_FROM_ADDRESS,
      sendingDomain,
      gatewayOk: true,
      latencyMs,
      domain: match
        ? {
            name: match.name,
            status: match.status,
            region: match.region,
            createdAt: match.created_at,
          }
        : null,
      allDomains: domains.map((d) => ({ name: d.name, status: d.status })),
      error: match ? null : `Sending domain ${sendingDomain} not found in Resend account`,
    });
  } catch (err) {
    return json(500, { ok: false, error: (err as Error).message });
  }
});