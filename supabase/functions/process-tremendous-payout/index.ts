import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPER_ADMIN_EMAIL = "sales@nationwidesales.ca";
const TREMENDOUS_BASE_URL = "https://testflight.tremendous.com/api/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT — must be super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user || user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { payout_id } = await req.json();
    if (!payout_id) {
      return new Response(JSON.stringify({ error: "Missing payout_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get payout record
    const { data: payout, error: payoutErr } = await admin
      .from("payouts")
      .select("*")
      .eq("id", payout_id)
      .single();

    if (payoutErr || !payout) {
      return new Response(JSON.stringify({ error: "Payout not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payout.status !== "ready") {
      return new Response(JSON.stringify({ error: `Payout status is '${payout.status}', expected 'ready'` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get referrer's email from auth
    const { data: { user: referrerUser } } = await admin.auth.admin.getUserById(payout.referrer_id);
    const referrerEmail = referrerUser?.email;

    if (!referrerEmail) {
      return new Response(JSON.stringify({ error: "Referrer email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get referrer payout preferences (may override email)
    const { data: prefs } = await admin
      .from("referrer_payout_preferences")
      .select("method, email")
      .eq("user_id", payout.referrer_id)
      .maybeSingle();

    const recipientEmail = prefs?.email || referrerEmail;

    // Get referrer's name
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("user_id", payout.referrer_id)
      .maybeSingle();

    const recipientName = profile?.full_name || "Referrer";

    // Tremendous API setup
    const tremendousApiKey = Deno.env.get("TREMENDOUS_API_KEY");
    if (!tremendousApiKey) {
      return new Response(JSON.stringify({ error: "TREMENDOUS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional: use a campaign for branded redemption page
    const campaignId = Deno.env.get("TREMENDOUS_CAMPAIGN_ID");

    // Build order payload — singular "reward" for synchronous processing (HTTP 200)
    const rewardPayload: Record<string, any> = {
      value: {
        denomination: Number(payout.amount),
        currency_code: payout.currency || "CAD",
      },
      delivery: {
        method: "LINK", // Revvin controls notification UX, not Tremendous
      },
      recipient: {
        name: recipientName,
        email: recipientEmail,
      },
    };

    // If campaign is configured, use it (handles product selection + branding)
    if (campaignId) {
      rewardPayload.campaign_id = campaignId;
    }

    const orderPayload = {
      payment: {
        funding_source_id: "BALANCE",
      },
      reward: rewardPayload, // singular = synchronous
    };

    console.log("Creating Tremendous order:", JSON.stringify(orderPayload));

    const orderRes = await fetch(`${TREMENDOUS_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tremendousApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await orderRes.json();

    if (!orderRes.ok) {
      console.error("Tremendous order error:", orderData);

      await admin.from("payouts").update({
        status: "failed",
        notes: `Tremendous API error: ${JSON.stringify(orderData.errors || orderData)}`,
        updated_at: new Date().toISOString(),
      }).eq("id", payout_id);

      return new Response(JSON.stringify({ error: "Tremendous order failed", details: orderData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract IDs and the redemption LINK
    const orderId = orderData.order?.id;
    const reward = orderData.order?.rewards?.[0];
    const rewardId = reward?.id;
    const redemptionLink = reward?.delivery?.link;

    // Update payout record — includes tremendous_reward_id for direct webhook lookup
    await admin.from("payouts").update({
      status: "processing",
      method: "tremendous",
      provider_reference: orderId || rewardId || "unknown",
      tremendous_reward_id: rewardId,
      processed_by: user.id,
      updated_at: new Date().toISOString(),
    }).eq("id", payout_id);

    // Create audit entry
    await admin.from("audit_log").insert({
      referral_id: payout.referral_id,
      actor_id: user.id,
      event_type: "payout_tremendous_sent",
      payload: {
        payout_id,
        tremendous_order_id: orderId,
        tremendous_reward_id: rewardId,
        amount: payout.amount,
        currency: payout.currency,
        recipient_email: recipientEmail,
        delivery_method: "LINK",
      },
    });

    // Send payout notification email via Resend with the redemption link
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey && redemptionLink) {
      try {
        const firstName = recipientName.split(" ")[0];
        const amount = Number(payout.amount).toFixed(2);
        const curr = payout.currency || "CAD";

        const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
<tr><td style="padding:32px 24px;">
<p style="margin:0 0 24px 0;font-size:14px;font-weight:700;color:#15803D;text-transform:lowercase;">revvin</p>
<p style="margin:0 0 8px 0;font-size:20px;font-weight:600;color:#111827;">Your $${amount} ${curr} reward is ready!</p>
<p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.6;">Hi ${firstName}, your referral payout has been approved. Click below to choose how you'd like to receive your reward — gift card, PayPal, bank transfer, and more.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:8px 0 24px 0;">
<a href="${redemptionLink}" target="_blank" style="display:inline-block;background-color:#15803D;color:#FFFFFF;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Claim Your Reward</a>
</td></tr>
</table>
<p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.5;text-align:center;">This link is unique to you. If you have questions, reply to this email.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Revvin <updates@updates.revvin.co>",
            to: [recipientEmail],
            reply_to: "support@revvin.co",
            subject: `Your $${amount} ${curr} referral reward is ready`,
            html,
          }),
        });

        console.log(`📧 Payout notification sent to ${recipientEmail}`);
      } catch (emailErr) {
        console.error("Failed to send payout email:", emailErr);
        // Non-blocking — payout still succeeded
      }
    }

    // Log notification
    await admin.from("notifications_log").insert({
      type: "payout_sent",
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject: `Payout of $${payout.amount} ${payout.currency || "CAD"} sent`,
      body: `Tremendous order ${orderId}, reward ${rewardId}`,
      status: redemptionLink ? "sent" : "link_only",
    });

    // Create in-app notification for the referrer
    await admin.from("notifications").insert({
      user_id: payout.referrer_id,
      title: "Payout Ready!",
      body: `Your $${Number(payout.amount).toFixed(2)} ${payout.currency || "CAD"} reward is ready to claim.`,
      type: "payout_ready",
      referral_id: payout.referral_id,
    });

    return new Response(JSON.stringify({
      success: true,
      order_id: orderId,
      reward_id: rewardId,
      recipient_email: recipientEmail,
      has_link: !!redemptionLink,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-tremendous-payout error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
