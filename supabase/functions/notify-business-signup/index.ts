import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import {
  ADMIN_NOTIFICATION_EMAIL,
  appUrl,
  RESEND_FROM_ADDRESS,
  RESEND_REPLY_TO,
} from "../_shared/app-config.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";
import { sendLifecycleEmail } from "../_shared/lifecycle-email.ts";
import { attributeBusinessToPartner } from "../_shared/partner-attribution.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2.97.0/cors";
import { checkCronAuth } from "../_shared/cron-auth.ts";
import { acquisitionSubject } from "../_shared/acquisition-notification.ts";


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accepts either:
    //   - Database-webhook payload: { type, table, record, ... }
    //   - Direct invocation:        { user_id }
    const payload = await req.json().catch(() => ({}));
    let record: any = null;
    const published = payload.event === "published";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    if (!checkCronAuth(req).ok) {
      const token = req.headers.get("Authorization")?.replace(/^Bearer /, "");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (!token || !anonKey) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const anonClient = createClient(supabaseUrl, anonKey);
      const { data: { user }, error } = await anonClient.auth.getUser(token);
      if (error || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (payload.user_id && payload.user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      payload.user_id = user.id;
    }
    if (published) {
      const token = req.headers.get("Authorization")?.replace(/^Bearer /, "");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (!token || !anonKey) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const anonClient = createClient(supabaseUrl, anonKey);
      const { data: { user }, error } = await anonClient.auth.getUser(token);
      if (error || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data } = await supabase.from("businesses").select("*").eq("user_id", user.id).eq("is_published", true).limit(1);
      record = data?.[0];
    }

    if (!published && !record && typeof payload.user_id === "string" && /^[0-9a-f-]{36}$/i.test(payload.user_id)) {
      // Direct invocation: load the most recently created business for this user.
      const { data: bizRows } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", payload.user_id)
        .order("created_at", { ascending: false })
        .limit(1);
      record = bizRows?.[0];
    }

    if (!record) {
      console.error("notify-business-signup: no record found", payload);
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Partner attribution, before the at-most-once notification claim so a
    // repeat call still attributes a business the first call could not.
    // Written with the service role: a client can never set these columns.
    try {
      const { data: attrData } = await supabase.auth.admin.getUserById(record.user_id);
      // A code that arrives with a click timestamp is treated as a stored click
      // (so the 60 day window applies). A code with no timestamp was typed.
      const rawCode = typeof payload.partner_code === "string" ? payload.partner_code : null;
      const clickedAt = typeof payload.partner_clicked_at === "string"
        ? payload.partner_clicked_at
        : null;
      if (rawCode) {
        const outcome = await attributeBusinessToPartner({
          db: supabase,
          business: record,
          ownerEmail: attrData?.user?.email ?? null,
          typedCode: clickedAt ? null : rawCode,
          clickCode: clickedAt ? rawCode : null,
          clickedAt,
        });
        console.log("[notify-business-signup] partner attribution", outcome);
      }
    } catch (attrErr) {
      console.error("[notify-business-signup] partner attribution failed", attrErr);
    }

    // Authenticated at-most-once notification claim.
    const { data: claimed } = await supabase
      .from("businesses")
      .update(published ? { published_notified_at: new Date().toISOString() } : { signup_notified_at: new Date().toISOString() })
      .eq("id", record.id)
      .is(published ? "published_notified_at" : "signup_notified_at", null)
      .select("id");
    if (!claimed?.length) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "already_notified" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Look up the business owner's email and name
    const { data: { user: ownerUser }, error: userErr } =
      await supabase.auth.admin.getUserById(record.user_id);

    const ownerEmail = ownerUser?.email || "Unknown";
    const ownerName =
      ownerUser?.user_metadata?.full_name || ownerEmail.split("@")[0];

    const businessName = record.name || "Unnamed Business";
    const industry = record.category || record.industry || "Not specified";
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
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top;">Reward</td><td>${escapeHtml(String(record.offer_amount || "Not set"))}</td></tr>
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top;">Acquisition</td><td>${escapeHtml(JSON.stringify(record.acquisition || {}))}</td></tr>
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top;">Signed Up</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(signupTime)}</td></tr>
</table>
</td></tr>
</table>

<!-- CTA -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:24px 0 0 0;">
<a href="${appUrl(`/__sa?business=${record.id}`)}" target="_blank" style="display:inline-block;background-color:#15803D;color:#FFFFFF;font-size:15px;font-weight:500;text-decoration:none;padding:12px 28px;border-radius:8px;">Open business record</a>
${record.slug ? `<p><a href="${appUrl(`/r/${encodeURIComponent(record.slug)}`)}">Open public page</a></p>` : "<p>Public page link not set yet.</p>"}
${phone !== "Not provided" ? `<p><a href="tel:${escapeHtml(phone.replace(/[^+0-9]/g, ""))}">Call the owner</a></p><p>${published && record.slug ? `<a href="sms:${escapeHtml(phone.replace(/[^+0-9]/g, ""))}?body=${encodeURIComponent(`Your Revvin page is live: ${appUrl(`/r/${record.slug}`)}`)}">Text the page link</a>` : ""}</p>` : ""}
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

    // Send via Resend connector gateway
    const subject = acquisitionSubject(published ? "published" : "signup", businessName, industry);
    let emailStatus = "sent";

    const result = await sendEmailViaGateway({
      from: RESEND_FROM_ADDRESS,
      to: ADMIN_NOTIFICATION_EMAIL,
      reply_to: RESEND_REPLY_TO,
      subject,
      html,
      idempotencyKey: `${published ? "published" : "signup"}-${record.id}`,
    });

    if (!result.success) {
      console.error("Resend gateway send error:", result.error);
      emailStatus = "failed";
    }

    // Log to notifications_log
    await supabase.from("notifications_log").insert({
      type: published ? "business_published" : "business_signup",
      recipient_email: "info@revvin.co",
      recipient_name: "Admin",
      subject,
      body: `New business signup: ${businessName} by ${ownerName} (${ownerEmail})`,
      status: emailStatus,
    });

    console.log(`📧 Business signup notification [${emailStatus}]: ${businessName}`);

    // Welcome email to the owner. The admin notification above is unchanged;
    // this is a second, separate send and a failure here never fails signup.
    // The unique claim row keeps it at most once per business.
    try {
      if (!published && record.is_demo !== true && ownerUser?.email) {
        const { error: claimErr } = await supabase
          .from("business_lifecycle_emails")
          .insert({ business_id: record.id, template: "welcome" });
        if (!claimErr) {
          await sendLifecycleEmail({
            supabase,
            businessId: record.id,
            templateName: "welcome",
            to: ownerUser.email,
            idempotencyKey: `welcome-${record.id}`,
            data: {
              businessName,
              publicUrl: record.slug ? appUrl(`/r/${record.slug}`) : null,
              publishUrl: appUrl("/dashboard?tab=page"),
              isPublished: record.is_published === true,
            },
          });
        }
      }
    } catch (welcomeErr) {
      console.error("notify-business-signup welcome email failed:", welcomeErr);
    }


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
