import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ADMIN_NOTIFICATION_EMAIL,
  appUrl,
  RESEND_FROM_ADDRESS,
  RESEND_REPLY_TO,
} from "../_shared/app-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Database webhook sends { type, table, record, ... }
    const payload = await req.json();
    const record = payload.record;

    if (!record) {
      console.error("No record in webhook payload");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Look up the business owner's email and name
    const { data: { user: ownerUser }, error: userErr } =
      await supabase.auth.admin.getUserById(record.user_id);

    const ownerEmail = ownerUser?.email || "Unknown";
    const ownerName =
      ownerUser?.user_metadata?.full_name || ownerEmail.split("@")[0];

    const businessName = record.name || "Unnamed Business";
    const industry = record.industry || "Not specified";
    const city = record.city || "Not specified";
    const state = record.state || "";
    const phone = record.phone || "Not provided";
    const signupTime = new Date(record.created_at).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const serviceArea = [city, state].filter(Boolean).join(", ") || "Not specified";

    // Build HTML email
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
<tr><td style="padding:24px;">

<!-- Logo text -->
<p style="margin:0 0 24px 0;font-size:14px;font-weight:700;color:#15803D;text-transform:lowercase;">revvin</p>

<!-- Greeting -->
<p style="margin:0 0 8px 0;font-size:16px;color:#111827;">New Business Signup</p>
<p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.6;">A new business has registered on Revvin and is awaiting approval.</p>

<!-- Detail card -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;">
<tr><td style="padding:20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;width:140px;vertical-align:top;">Business Name</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(businessName)}</td></tr>
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top;">Owner</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(ownerName)}</td></tr>
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top;">Email</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(ownerEmail)}</td></tr>
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top;">Industry</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(industry)}</td></tr>
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top;">Service Area</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(serviceArea)}</td></tr>
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top;">Phone</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(phone)}</td></tr>
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top;">Signed Up</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(signupTime)}</td></tr>
</table>
</td></tr>
</table>

<!-- CTA -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:24px 0 0 0;">
<a href="${appUrl("/__sa")}" target="_blank" style="display:inline-block;background-color:#15803D;color:#FFFFFF;font-size:15px;font-weight:500;text-decoration:none;padding:12px 28px;border-radius:8px;">Review &amp; Approve</a>
</td></tr>
</table>

<!-- Footer -->
<p style="margin:32px 0 0 0;font-size:13px;color:#9CA3AF;line-height:1.5;text-align:center;">This business is pending approval. Log in to the Super Admin dashboard to review and approve.</p>

</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    // Send via Resend
    const subject = `New Business Signup: ${businessName}`;
    let emailStatus = "sent";

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: RESEND_FROM_ADDRESS,
          to: [ADMIN_NOTIFICATION_EMAIL],
          reply_to: RESEND_REPLY_TO,
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error("Resend API error:", res.status, errBody);
        emailStatus = "failed";
      }
    } catch (sendErr) {
      console.error("Resend send error:", sendErr);
      emailStatus = "failed";
    }

    // Log to notifications_log
    await supabase.from("notifications_log").insert({
      type: "business_signup",
      recipient_email: "info@revvin.co",
      recipient_name: "Admin",
      subject,
      body: `New business signup: ${businessName} by ${ownerName} (${ownerEmail})`,
      status: emailStatus,
    });

    console.log(`📧 Business signup notification [${emailStatus}]: ${businessName}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-business-signup error:", err);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
