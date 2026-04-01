import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPER_ADMIN_EMAIL = "sales@nationwidesales.ca";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(null, { status: 404, headers: corsHeaders });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await anonClient.auth.getUser();

    if (userError || !user) {
      return new Response(null, { status: 404, headers: corsHeaders });
    }

    const email = user.email;
    if (!email || email.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return new Response(null, { status: 404, headers: corsHeaders });
    }

    // Authenticated as super admin — use service role
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const bizId = url.searchParams.get("biz_id");
    const action = url.searchParams.get("action");

    // Handle business approval/rejection
    if (req.method === "POST" && action === "update_business_status") {
      const body = await req.json();
      const { business_id, account_status } = body;
      if (!business_id || !["approved", "rejected", "pending_approval"].includes(account_status)) {
        return new Response(JSON.stringify({ error: "Invalid params" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await admin
        .from("businesses")
        .update({ account_status })
        .eq("id", business_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send email notification to the business owner
      if (account_status === "approved" || account_status === "rejected") {
        try {
          const { data: biz } = await admin.from("businesses").select("user_id, name").eq("id", business_id).single();
          if (biz) {
            const { data: { user: ownerUser } } = await admin.auth.admin.getUserById(biz.user_id);
            const ownerEmail = ownerUser?.email;
            const ownerName = ownerUser?.user_metadata?.full_name || ownerEmail?.split("@")[0] || "there";
            const businessName = biz.name || "Your Business";

            if (ownerEmail) {
              const resendApiKey = Deno.env.get("RESEND_API_KEY");
              if (resendApiKey) {
                const isApproved = account_status === "approved";
                const subject = isApproved
                  ? `Your business "${businessName}" has been approved on Revvin!`
                  : `Update on your Revvin application for "${businessName}"`;

                const appUrl = "https://revvin.lovable.app";
                const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
<tr><td style="padding:24px;">
<p style="margin:0 0 24px 0;font-size:14px;font-weight:700;color:#15803D;text-transform:lowercase;">revvin</p>
${isApproved ? `
<p style="margin:0 0 8px 0;font-size:20px;font-weight:600;color:#15803D;">🎉 You're Approved!</p>
<p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">Hi ${escapeHtml(ownerName)},</p>
<p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">Great news! Your business <strong>${escapeHtml(businessName)}</strong> has been approved on Revvin. Your profile and offers are now live on the marketplace.</p>
<p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.6;">Referrers can now discover your offers and start sending you qualified leads.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:8px 0 0 0;">
<a href="${appUrl}/dashboard" target="_blank" style="display:inline-block;background-color:#15803D;color:#FFFFFF;font-size:15px;font-weight:500;text-decoration:none;padding:12px 28px;border-radius:8px;">Go to Your Dashboard</a>
</td></tr>
</table>
` : `
<p style="margin:0 0 8px 0;font-size:20px;font-weight:600;color:#DC2626;">Application Update</p>
<p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">Hi ${escapeHtml(ownerName)},</p>
<p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">Thank you for your interest in Revvin. After reviewing your application for <strong>${escapeHtml(businessName)}</strong>, we're unable to approve it at this time.</p>
<p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.6;">If you believe this was made in error or would like to provide additional information, please reach out to us at <a href="mailto:support@revvin.co" style="color:#15803D;">support@revvin.co</a>.</p>
`}
<p style="margin:32px 0 0 0;font-size:13px;color:#9CA3AF;line-height:1.5;text-align:center;">— The Revvin Team</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

                const res = await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${resendApiKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    from: "Revvin <updates@updates.revvin.co>",
                    to: [ownerEmail],
                    reply_to: "support@revvin.co",
                    subject,
                    html,
                  }),
                });

                const emailStatus = res.ok ? "sent" : "failed";
                if (!res.ok) console.error("Status email failed:", await res.text());

                await admin.from("notifications_log").insert({
                  type: `business_${account_status}`,
                  recipient_email: ownerEmail,
                  recipient_name: ownerName,
                  subject,
                  body: `Business ${account_status}: ${businessName}`,
                  status: emailStatus,
                });

                console.log(`📧 Business ${account_status} email [${emailStatus}] to ${ownerEmail}`);
              }
            }
          }
        } catch (emailErr) {
          console.error("Failed to send status email:", emailErr);
          // Don't fail the status update if email fails
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle note update
    if (req.method === "POST" && action === "update_notes") {
      const body = await req.json();
      const { referral_id, notes } = body;
      if (!referral_id) {
        return new Response(JSON.stringify({ error: "Missing referral_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await admin
        .from("referrals")
        .update({ notes })
        .eq("id", referral_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lazy load referrals for a specific business
    if (bizId) {
      const { data: referrals } = await admin
        .from("referrals")
        .select("*, offers(title, payout, payout_type)")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false })
        .limit(500);

      const { data: auditLog } = await admin
        .from("audit_log")
        .select("*")
        .in(
          "referral_id",
          (referrals || []).map((r: any) => r.id)
        )
        .order("created_at", { ascending: false })
        .limit(200);

      const { data: payouts } = await admin
        .from("payouts")
        .select("*")
        .eq("business_id", bizId);

      return new Response(
        JSON.stringify({ referrals: referrals || [], audit_log: auditLog || [], payouts: payouts || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Full overview load
    const [
      { data: businesses },
      { data: profiles },
      { data: referralCounts },
      { data: payouts },
      { data: offers },
    ] = await Promise.all([
      admin.from("businesses").select("*").order("created_at", { ascending: false }),
      admin.from("profiles").select("*"),
      admin.from("referrals").select("id, business_id, status, payout_status"),
      admin.from("payouts").select("id, business_id, status, amount"),
      admin.from("offers").select("id, business_id, status, title"),
    ]);

    return new Response(
      JSON.stringify({
        businesses: businesses || [],
        profiles: profiles || [],
        referral_summary: referralCounts || [],
        payouts: payouts || [],
        offers: offers || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(null, { status: 404, headers: corsHeaders });
  }
});
