import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  RESEND_FROM_ADDRESS,
  RESEND_REPLY_TO,
  appUrl,
} from "../_shared/app-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("[notify-new-lead] RESEND_API_KEY not set; skipping");
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: leads } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .limit(1);
    const lead = leads?.[0];
    if (!lead) {
      return new Response(JSON.stringify({ error: "lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: bizRows } = await supabase
      .from("businesses")
      .select("id, name, user_id, business_email")
      .eq("id", lead.business_id)
      .limit(1);
    const biz = bizRows?.[0];
    if (!biz) {
      return new Response(JSON.stringify({ error: "business not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notification settings override + email toggle
    const { data: settingsRows } = await supabase
      .from("notification_settings")
      .select("email_notifications_enabled, notification_email")
      .eq("business_id", biz.id)
      .limit(1);
    const settings = settingsRows?.[0];
    if (settings && settings.email_notifications_enabled === false) {
      return new Response(JSON.stringify({ ok: true, skipped: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let toEmail = settings?.notification_email || biz.business_email || null;
    if (!toEmail) {
      const { data: ownerData } = await supabase.auth.admin.getUserById(
        biz.user_id
      );
      toEmail = ownerData?.user?.email || null;
    }
    if (!toEmail) {
      return new Response(JSON.stringify({ ok: true, skipped: "no email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dashboardUrl = appUrl("/dashboard");
    const subject = `New referral for ${biz.name}: ${lead.lead_name}`;
    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Inter',Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:13px;color:#15803d;font-weight:600;letter-spacing:.04em;text-transform:uppercase">Revvin</div>
    <h1 style="margin:8px 0 6px;font-size:22px;line-height:1.3">New referral for ${esc(biz.name)}</h1>
    <p style="margin:0 0 20px;color:#475569;font-size:14px">Someone just sent you a warm lead. Reach out today while it's hot.</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:16px">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:10px">The lead</div>
      <div style="font-size:16px;font-weight:600">${esc(lead.lead_name)}</div>
      <div style="font-size:14px;color:#334155;margin-top:4px">${esc(lead.lead_phone)}${lead.lead_email ? ` · ${esc(lead.lead_email)}` : ""}</div>
      <div style="font-size:14px;color:#334155;margin-top:12px;white-space:pre-wrap">${esc(lead.lead_need)}</div>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:24px">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:10px">Referred by</div>
      <div style="font-size:15px;font-weight:600">${esc(lead.referrer_name)}</div>
      <div style="font-size:14px;color:#334155;margin-top:4px">${esc(lead.referrer_email)}${lead.referrer_phone ? ` · ${esc(lead.referrer_phone)}` : ""}</div>
      ${lead.relationship_to_lead ? `<div style="font-size:13px;color:#64748b;margin-top:8px">Relationship: ${esc(lead.relationship_to_lead)}</div>` : ""}
    </div>
    <a href="${dashboardUrl}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px">Open dashboard</a>
    <p style="margin:28px 0 0;font-size:12px;color:#94a3b8">Reminder: once the deal closes, pay your referrer directly — Revvin doesn't take a cut of the payout.</p>
  </div>
</body></html>`;

    const idempotencyKey = `new-lead-${lead.id}`;

    await supabase.from("email_send_log").insert({
      message_id: idempotencyKey,
      template_name: "new-lead",
      recipient_email: toEmail,
      status: "pending",
      metadata: { business_id: biz.id, lead_id: lead.id },
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: RESEND_FROM_ADDRESS,
        to: toEmail,
        reply_to: lead.referrer_email || RESEND_REPLY_TO,
        subject,
        html,
      }),
    });

    const result = await res.json().catch(() => ({}));

    await supabase.from("email_send_log").insert({
      message_id: idempotencyKey,
      template_name: "new-lead",
      recipient_email: toEmail,
      status: res.ok ? "sent" : "failed",
      error_message: res.ok ? null : JSON.stringify(result).slice(0, 500),
      metadata: { business_id: biz.id, lead_id: lead.id },
    });

    return new Response(JSON.stringify({ ok: res.ok, result }), {
      status: res.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-new-lead] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});