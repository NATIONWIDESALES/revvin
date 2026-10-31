import { createClient } from "npm:@supabase/supabase-js@2.97.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.97.0/cors";
import { appUrl, RESEND_FROM_ADDRESS, RESEND_REPLY_TO } from "../_shared/app-config.ts";
import { esc } from "../_shared/email-format.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const neutral = () => new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const payload = await req.json();
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { data: allowed, error: rateError } = await db.rpc("fn_rate_bucket_hit", { p_key: `me_edge:${ip}`, p_window: "1 hour", p_max_hits: 5 });
    if (rateError || allowed !== true) return neutral();
    const { data: eligible, error } = await db.rpc("fn_me_email_eligible", { p_email: email });
    if (error || eligible !== true) return neutral();
    const { data, error: linkError } = await db.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: `${appUrl()}/me` } });
    if (linkError || !data.properties.action_link) return neutral();
    await sendEmailViaGateway({ from: RESEND_FROM_ADDRESS, reply_to: RESEND_REPLY_TO, to: email, subject: "Your Revvin sign-in link", html: `<p><a href="${esc(data.properties.action_link)}">Sign in to see your referrals</a></p>` });
  } catch { /* Always return the same response, including failures. */ }
  return neutral();
});