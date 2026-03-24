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

    // Get referrer's email from auth and payout preferences
    const { data: { user: referrerUser } } = await admin.auth.admin.getUserById(payout.referrer_id);
    const referrerEmail = referrerUser?.email;

    if (!referrerEmail) {
      return new Response(JSON.stringify({ error: "Referrer email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get referrer payout preferences
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

    // Map internal method to Tremendous delivery method
    // Tremendous products: ACH, INTERAC, etc. — we'll use their default catalog
    const tremendousApiKey = Deno.env.get("TREMENDOUS_API_KEY");
    if (!tremendousApiKey) {
      return new Response(JSON.stringify({ error: "TREMENDOUS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // First, get the funding source
    const fundingRes = await fetch(`${TREMENDOUS_BASE_URL}/funding_sources`, {
      headers: {
        Authorization: `Bearer ${tremendousApiKey}`,
        "Content-Type": "application/json",
      },
    });
    const fundingData = await fundingRes.json();
    if (!fundingRes.ok) {
      console.error("Tremendous funding sources error:", fundingData);
      return new Response(JSON.stringify({ error: "Failed to fetch Tremendous funding sources", details: fundingData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the first available funding source
    const fundingSource = fundingData.funding_sources?.find((fs: any) => fs.method === "balance" || fs.method === "bank_account") || fundingData.funding_sources?.[0];
    if (!fundingSource) {
      return new Response(JSON.stringify({ error: "No Tremendous funding source available" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine delivery method based on referrer preference
    let deliveryMethod = "EMAIL";
    // Tremendous supports: EMAIL, LINK, PHONE
    // For now, always use EMAIL delivery

    // Create Tremendous order
    const orderPayload = {
      payment: {
        funding_source_id: fundingSource.id,
      },
      rewards: [
        {
          value: {
            denomination: payout.amount,
            currency_code: payout.currency || "USD",
          },
          delivery: {
            method: deliveryMethod,
          },
          recipient: {
            name: recipientName,
            email: recipientEmail,
          },
          // Use Tremendous' default catalog (all available options)
          products: ["OKMHM2X2OHYV"],
        },
      ],
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
      // Update payout with failure info
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

    const orderId = orderData.order?.id;
    const rewardId = orderData.order?.rewards?.[0]?.id;

    // Update payout to processing
    await admin.from("payouts").update({
      status: "processing",
      method: "tremendous",
      provider_reference: orderId || rewardId || "unknown",
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
        amount: payout.amount,
        currency: payout.currency,
        recipient_email: recipientEmail,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      order_id: orderId,
      reward_id: rewardId,
      recipient_email: recipientEmail,
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
