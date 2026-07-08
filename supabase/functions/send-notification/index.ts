import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl, RESEND_FROM_ADDRESS, RESEND_REPLY_TO } from "../_shared/app-config.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationPayload {
  type:
    | "referral_submitted"
    | "referral_accepted"
    | "referral_declined"
    | "deal_closed"
    | "deal_lost"
    | "payout_released"
    | "dispute_submitted"
    | "dispute_resolved"
    | "welcome"
    | "business_invite";
  recipientEmail?: string;
  recipientName?: string;
  recipientUserId?: string;
  recipientBusinessId?: string;
  data?: Record<string, string>;
}

const templates: Record<
  string,
  { subject: string; body: (data: Record<string, string>) => string }
> = {
  welcome: {
    subject: "Welcome to Revvin!",
    body: (d) =>
      `Hi ${d.name},\n\nWelcome to Revvin, the complete referral program for service businesses.\n\n${
        d.role === "business"
          ? "You can now create referral offers and start receiving qualified leads from our referrer network."
          : "Browse high-paying referral opportunities and start earning commissions today."
      }\n\nGet started: ${appUrl("/dashboard")}\n\n— The Revvin Team`,
  },
  business_invite: {
    subject: "You've been invited to Revvin — ${businessName}",
    body: (d) =>
      `Hi ${d.name},\n\nSomeone thinks ${d.businessName} should be on Revvin, the referral program platform for service businesses. Flat $49/month USD, branded referral page, QR code, and a simple lead inbox.\n\nCreate your free account: ${d.signupUrl || appUrl("/auth?mode=signup&role=business")}\n\n— The Revvin Team`,
  },
  referral_submitted: {
    subject: "New Referral Submitted — ${offerTitle}",
    body: (d) =>
      `Hi ${d.businessName},\n\nA new referral has been submitted for your offer "${d.offerTitle}".\n\nCustomer: ${d.customerName}\nSubmitted by: ${d.referrerName}\n\nLog in to review and accept: ${appUrl("/dashboard")}\n\n— Revvin`,
  },
  referral_accepted: {
    subject: "Your Referral Was Accepted!",
    body: (d) =>
      `Hi ${d.referrerName},\n\nGreat news! Your referral for ${d.customerName} to "${d.offerTitle}" has been accepted.\n\nYou'll be paid directly by the business when the deal closes.\n\nTrack progress: ${appUrl("/dashboard")}\n\n— Revvin`,
  },
  deal_closed: {
    subject: "Deal Closed — Payout Incoming!",
    body: (d) =>
      `Hi ${d.referrerName},\n\nCongratulations! The deal for ${d.customerName} ("${d.offerTitle}") has been marked as closed/won.\n\nYour payout of $${d.payoutAmount} has been approved and will be processed shortly.\n\n— Revvin`,
  },
  deal_lost: {
    subject: "Referral Update — Deal Lost",
    body: (d) =>
      `Hi ${d.referrerName},\n\nUnfortunately, the deal for ${d.customerName} ("${d.offerTitle}") did not close.\n\nKeep referring — your next win is around the corner.\n\nBrowse offers: ${appUrl("/browse")}\n\n— Revvin`,
  },
  payout_released: {
    subject: "Payout Released — $${payoutAmount}",
    body: (d) =>
      `Hi ${d.referrerName},\n\nYour payout of $${d.payoutAmount} for "${d.offerTitle}" has been released.\n\nCheck your earnings dashboard: ${appUrl("/dashboard")}\n\n— Revvin`,
  },
  referral_declined: {
    subject: "Referral Update — Declined",
    body: (d) =>
      `Hi ${d.referrerName},\n\nYour referral for ${d.customerName} to "${d.offerTitle}" was declined by the business.\n\nDon't be discouraged — browse more opportunities and keep referring.\n\nBrowse offers: ${appUrl("/browse")}\n\n— Revvin`,
  },
  dispute_submitted: {
    subject: "Dispute Received — ${offerTitle}",
    body: (d) =>
      `Hi ${d.businessName},\n\nA dispute has been submitted for a referral on "${d.offerTitle}".\n\nCustomer: ${d.customerName}\nSubmitted by: ${d.referrerName}\n\nOur team will review and reach out shortly.\n\nLog in: ${appUrl("/dashboard")}\n\n— Revvin`,
  },
  dispute_resolved: {
    subject: "Dispute Resolved — ${offerTitle}",
    body: (d) =>
      `Hi ${d.referrerName},\n\nThe dispute for your referral of ${d.customerName} on "${d.offerTitle}" has been resolved.\n\nOutcome: ${d.outcome}\n\nView details: ${appUrl("/dashboard")}\n\n— Revvin`,
  },
};

async function sendWithResend(
  to: string,
  subject: string,
  textBody: string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const result = await sendEmailViaGateway({
    from: RESEND_FROM_ADDRESS,
    to: [to],
    reply_to: RESEND_REPLY_TO,
    subject,
    text: textBody,
  });

  if (!result.success) {
    console.error("Resend gateway error:", result.error);
  }

  return result;
}

serve(async (req) => {
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

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
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

    const rawPayload = await req.json();

    // Support simple {to, subject, html} payloads — ADMIN ONLY
    if (rawPayload.to && rawPayload.subject && rawPayload.html) {
      // Verify the caller has the admin role before allowing arbitrary emails
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminCheck = createClient(supabaseUrl, serviceKey);
      const { data: roleRow } = await adminCheck
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleRow) {
        return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await sendEmailViaGateway({
        from: RESEND_FROM_ADDRESS,
        to: rawPayload.to,
        reply_to: RESEND_REPLY_TO,
        subject: rawPayload.subject,
        html: rawPayload.html,
      });
      const emailStatus = result.success ? "sent" : "failed";

      const supa = createClient(supabaseUrl, serviceKey);
      await supa.from("notifications_log").insert({
        type: "invite_business",
        recipient_email: rawPayload.to,
        recipient_name: null,
        subject: rawPayload.subject,
        body: rawPayload.html,
        status: emailStatus,
      });

      return new Response(JSON.stringify({ success: emailStatus === "sent", status: emailStatus }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Template-based flow
    const payload: NotificationPayload = rawPayload;
    let { recipientEmail, recipientName, recipientUserId, recipientBusinessId } = payload;
    const { type, data = {} } = payload;

    const template = templates[type];
    if (!template) {
      return new Response(
        JSON.stringify({ error: "Unknown notification type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!recipientUserId && recipientBusinessId) {
      const { data: business } = await supabase
        .from("businesses")
        .select("name, user_id")
        .eq("id", recipientBusinessId)
        .maybeSingle();
      recipientUserId = business?.user_id;
      recipientName = recipientName || business?.name;
    }

    if (!recipientEmail && recipientUserId) {
      const { data: userData } = await supabase.auth.admin.getUserById(recipientUserId);
      const recipientUser = userData.user;
      recipientEmail = recipientUser?.email || undefined;
      recipientName =
        recipientName ||
        recipientUser?.user_metadata?.full_name ||
        recipientUser?.user_metadata?.business_name ||
        recipientEmail?.split("@")[0];
    }

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "Recipient email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    recipientName = recipientName || "there";
    const mergedData = {
      ...data,
      name: data.name || recipientName,
      referrerName: data.referrerName || recipientName,
      businessName: data.businessName || recipientName,
    };
    const subject = template.subject.replace(
      /\$\{(\w+)\}/g,
      (_, k) => mergedData[k] ?? "",
    );
    const body = template.body(mergedData);

    // Attempt to send via Resend connector gateway
    const result = await sendWithResend(recipientEmail, subject, body);

    const emailStatus = result.success ? "sent" : "failed";
    if (result.success) {
      console.log(`📧 Email SENT [${type}] to ${recipientEmail} (Resend ID: ${result.id})`);
    } else {
      console.error(`📧 Email FAILED [${type}] to ${recipientEmail}: ${result.error}`);
    }

    // Store notification record for audit
    await supabase.from("notifications_log").insert({
      type,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject,
      body,
      status: emailStatus,
    });

    return new Response(
      JSON.stringify({
        success: emailStatus === "sent",
        status: emailStatus,
        ...(result.id && { resendId: result.id }),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Notification error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
