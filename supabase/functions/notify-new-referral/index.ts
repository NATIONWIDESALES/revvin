import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // --- AUTH CHECK: require valid JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // --- END AUTH CHECK ---

    const { referral_id } = await req.json();
    if (!referral_id) {
      console.error("Missing referral_id");
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Get referral
    const { data: referral, error: refErr } = await supabase
      .from("referrals")
      .select("customer_name, customer_email, customer_phone, notes, business_id, referrer_id")
      .eq("id", referral_id)
      .maybeSingle();

    if (refErr || !referral) {
      console.error("Referral lookup failed:", refErr?.message || "not found");
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Authorization: caller must be the referrer who submitted this referral
    if (referral.referrer_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get business
    const { data: business } = await supabase
      .from("businesses")
      .select("name, user_id")
      .eq("id", referral.business_id)
      .maybeSingle();

    if (!business) {
      console.error("Business not found for id:", referral.business_id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Get business owner email via admin API
    const { data: { user: ownerUser }, error: userErr } = await supabase.auth.admin.getUserById(business.user_id);

    if (userErr || !ownerUser?.email) {
      console.warn("Business owner email not found, skipping notification");
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Get referrer name
    const { data: referrerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", referral.referrer_id)
      .maybeSingle();

    const referrerName = referrerProfile?.full_name || "A referrer";
    const ownerFirstName = ownerUser.email.split("@")[0]; // fallback
    const ownerMeta = ownerUser.user_metadata;
    const ownerFirst = ownerMeta?.full_name?.split(" ")[0] || ownerFirstName;
    const customerFirstName = referral.customer_name.split(" ")[0];

    // 5. Build HTML email
    const appUrl = "https://revvin.lovable.app";

    const detailRows: string[] = [];
    detailRows.push(`<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;width:140px;vertical-align:top;">Name</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(referral.customer_name)}</td></tr>`);
    if (referral.customer_phone) {
      detailRows.push(`<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top;">Phone</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(referral.customer_phone)}</td></tr>`);
    }
    if (referral.customer_email) {
      detailRows.push(`<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top;">Email</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(referral.customer_email)}</td></tr>`);
    }
    if (referral.notes) {
      detailRows.push(`<tr><td colspan="2" style="padding:12px 0 0 0;"><div style="border-top:1px solid #F3F4F6;padding-top:12px;"><span style="color:#6B7280;font-size:14px;">Note from referrer</span><p style="margin:4px 0 0 0;color:#111827;font-size:14px;line-height:1.5;">${escapeHtml(referral.notes)}</p></div></td></tr>`);
    }
    detailRows.push(`<tr><td colspan="2" style="padding:12px 0 0 0;"><div style="border-top:1px solid #F3F4F6;padding-top:12px;"><span style="color:#6B7280;font-size:14px;">Referred by</span><p style="margin:4px 0 0 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(referrerName)}</p></div></td></tr>`);

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
<p style="margin:0 0 8px 0;font-size:16px;color:#111827;">Hi ${escapeHtml(ownerFirst)},</p>
<p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.6;">Someone just referred a potential customer to <strong>${escapeHtml(business.name)}</strong> through Revvin. Here are their details:</p>

<!-- Detail card -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;">
<tr><td style="padding:20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${detailRows.join("\n")}
</table>
</td></tr>
</table>

<!-- CTA -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:24px 0 0 0;">
<a href="${appUrl}/dashboard" target="_blank" style="display:inline-block;background-color:#15803D;color:#FFFFFF;font-size:15px;font-weight:500;text-decoration:none;padding:12px 28px;border-radius:8px;">View Referral in Dashboard</a>
</td></tr>
</table>

<!-- Footer -->
<p style="margin:32px 0 0 0;font-size:13px;color:#9CA3AF;line-height:1.5;text-align:center;">You're receiving this because a referral was submitted to your business on Revvin. If you have questions, reply to this email.</p>

</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    // 6. Send via Resend
    const subject = `New referral: ${customerFirstName}`;
    let emailStatus = "sent";

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Revvin <updates@updates.revvin.co>",
          to: [ownerUser.email],
          reply_to: "support@revvin.co",
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

    // 7. Log to notifications_log
    await supabase.from("notifications_log").insert({
      type: "new_referral",
      recipient_email: ownerUser.email,
      recipient_name: ownerFirst,
      subject,
      body: `Referral from ${referrerName} for ${referral.customer_name}`,
      status: emailStatus,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-new-referral error:", err);
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
