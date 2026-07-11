import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ADMIN_NOTIFICATION_EMAIL,
  RESEND_FROM_ADDRESS,
  RESEND_REPLY_TO,
} from "../_shared/app-config.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // AuthN: extract user from bearer token
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json(401, { ok: false, error: "missing token" });

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json(401, { ok: false, error: "invalid session" });
    }

    // AuthZ: require admin role
    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: roleRows } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .limit(1);
    if (!roleRows || roleRows.length === 0) {
      return json(403, { ok: false, error: "admin only" });
    }

    // Env presence
    const hasLovableKey = !!Deno.env.get("LOVABLE_API_KEY");
    const hasResendKey = !!Deno.env.get("RESEND_API_KEY");

    if (!hasLovableKey || !hasResendKey) {
      return json(200, {
        ok: false,
        step: "env",
        hasLovableKey,
        hasResendKey,
        from: RESEND_FROM_ADDRESS,
        to: ADMIN_NOTIFICATION_EMAIL,
        error: "Resend gateway credentials not configured",
      });
    }

    const stamp = new Date().toISOString();
    const subject = `Revvin Email Health Check ${stamp}`;
    const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:24px;color:#111827;">
<p style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#15803D;text-transform:lowercase;">revvin</p>
<h2 style="margin:0 0 12px 0;font-size:18px;">Email delivery health check</h2>
<p style="margin:0 0 8px 0;">This message confirms Resend is delivering mail to <strong>${ADMIN_NOTIFICATION_EMAIL}</strong>.</p>
<p style="margin:0 0 8px 0;">Triggered by: ${userData.user.email}</p>
<p style="margin:0;color:#6B7280;font-size:12px;">Timestamp: ${stamp}</p>
</body></html>`;

    const t0 = performance.now();
    const result = await sendEmailViaGateway({
      from: RESEND_FROM_ADDRESS,
      to: ADMIN_NOTIFICATION_EMAIL,
      reply_to: RESEND_REPLY_TO,
      subject,
      html,
      idempotencyKey: `health-check-${stamp}`,
    });
    const latencyMs = Math.round(performance.now() - t0);

    // Log outcome
    await service.from("notifications_log").insert({
      type: "email_health_check",
      recipient_email: ADMIN_NOTIFICATION_EMAIL,
      recipient_name: "Admin",
      subject,
      body: `Health check triggered by ${userData.user.email}`,
      status: result.success ? "sent" : "failed",
    });

    return json(200, {
      ok: result.success,
      step: "send",
      hasLovableKey,
      hasResendKey,
      from: RESEND_FROM_ADDRESS,
      to: ADMIN_NOTIFICATION_EMAIL,
      latencyMs,
      messageId: result.id,
      error: result.error,
      subject,
    });
  } catch (err) {
    console.error("email-health-check error:", err);
    return json(500, { ok: false, error: (err as Error).message });
  }
});