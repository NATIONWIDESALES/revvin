import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  type: "referral_submitted" | "referral_accepted" | "deal_closed" | "deal_lost" | "payout_released" | "welcome";
  recipientEmail: string;
  recipientName: string;
  data?: Record<string, string>;
}

const templates: Record<string, { subject: string; body: (data: Record<string, string>) => string }> = {
  welcome: {
    subject: "Welcome to Revvin!",
    body: (d) => `Hi ${d.name},\n\nWelcome to Revvin — the pay-per-close referral marketplace.\n\n${d.role === "business" ? "You can now create referral offers and start receiving qualified leads from our referrer network." : "Browse high-paying referral opportunities and start earning commissions today."}\n\nGet started: https://revvin.lovable.app/dashboard\n\n— The Revvin Team`,
  },
  referral_submitted: {
    subject: "New Referral Submitted — ${offerTitle}",
    body: (d) => `Hi ${d.businessName},\n\nA new referral has been submitted for your offer "${d.offerTitle}".\n\nCustomer: ${d.customerName}\nSubmitted by: ${d.referrerName}\n\nLog in to review and accept: https://revvin.lovable.app/dashboard\n\n— Revvin`,
  },
  referral_accepted: {
    subject: "Your Referral Was Accepted!",
    body: (d) => `Hi ${d.referrerName},\n\nGreat news! Your referral for ${d.customerName} to "${d.offerTitle}" has been accepted.\n\nFunds have been reserved in escrow. You'll be paid when the deal closes.\n\nTrack progress: https://revvin.lovable.app/dashboard\n\n— Revvin`,
  },
  deal_closed: {
    subject: "Deal Closed — Payout Incoming!",
    body: (d) => `Hi ${d.referrerName},\n\nCongratulations! The deal for ${d.customerName} ("${d.offerTitle}") has been marked as closed/won.\n\nYour payout of $${d.payoutAmount} has been approved and will be processed shortly.\n\n— Revvin`,
  },
  deal_lost: {
    subject: "Referral Update — Deal Lost",
    body: (d) => `Hi ${d.referrerName},\n\nUnfortunately, the deal for ${d.customerName} ("${d.offerTitle}") did not close.\n\nEscrowed funds have been returned to the business. Keep referring — your next win is around the corner.\n\nBrowse offers: https://revvin.lovable.app/browse\n\n— Revvin`,
  },
  payout_released: {
    subject: "Payout Released — $${payoutAmount}",
    body: (d) => `Hi ${d.referrerName},\n\nYour payout of $${d.payoutAmount} for "${d.offerTitle}" has been released.\n\nCheck your earnings dashboard: https://revvin.lovable.app/dashboard\n\n— Revvin`,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    const { type, recipientEmail, recipientName, data = {} } = payload;

    const template = templates[type];
    if (!template) {
      return new Response(JSON.stringify({ error: "Unknown notification type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mergedData = { ...data, name: recipientName };
    const subject = template.subject.replace(/\$\{(\w+)\}/g, (_, k) => mergedData[k] ?? "");
    const body = template.body(mergedData);

    // Log the notification (in production, integrate with Resend/SendGrid/SES)
    console.log(`📧 NOTIFICATION [${type}]`);
    console.log(`   To: ${recipientEmail}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${body.substring(0, 200)}...`);

    // Store notification record for audit
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("notifications_log").insert({
      type,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject,
      body,
      status: "logged", // Change to "sent" when email provider is connected
    });

    return new Response(
      JSON.stringify({ success: true, message: "Notification logged. Connect an email provider (Resend, SendGrid) to send live emails." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});