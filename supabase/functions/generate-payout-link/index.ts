import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TREMENDOUS_BASE_URL =
  Deno.env.get("TREMENDOUS_BASE_URL") || "https://api.tremendous.com/api/v2";

/**
 * Generate a fresh Tremendous payout link for a referee.
 * 
 * Tremendous treats links as secrets (one-way hashed after creation).
 * This endpoint generates a NEW link each time — never store links.
 * 
 * POST body: { payout_id: string }
 * Auth: must be the referrer who owns this payout
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Get payout — must belong to this user
    const { data: payout, error: payoutErr } = await admin
      .from("payouts")
      .select("*")
      .eq("id", payout_id)
      .eq("referrer_id", user.id)
      .single();

    if (payoutErr || !payout) {
      return new Response(JSON.stringify({ error: "Payout not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Must be in a claimable state
    if (!["processing", "paid"].includes(payout.status)) {
      return new Response(JSON.stringify({ error: `Payout is '${payout.status}', not claimable` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use tremendous_reward_id column first, fall back to audit_log
    let tremendousRewardId: string | null = payout.tremendous_reward_id || null;

    if (!tremendousRewardId) {
      const { data: auditEntries } = await admin
        .from("audit_log")
        .select("payload")
        .eq("event_type", "payout_tremendous_sent")
        .order("created_at", { ascending: false })
        .limit(50);

      for (const entry of auditEntries || []) {
        if (entry.payload?.payout_id === payout_id) {
          tremendousRewardId = entry.payload?.tremendous_reward_id;
          break;
        }
      }
    }

    if (!tremendousRewardId) {
      return new Response(JSON.stringify({ error: "Tremendous reward ID not found — payout may still be processing" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a fresh link from Tremendous
    const tremendousApiKey = Deno.env.get("TREMENDOUS_API_KEY");
    if (!tremendousApiKey) {
      return new Response(JSON.stringify({ error: "TREMENDOUS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const linkRes = await fetch(`${TREMENDOUS_BASE_URL}/rewards/${tremendousRewardId}/generate_link`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tremendousApiKey}`,
        Accept: "application/json",
      },
    });

    const linkData = await linkRes.json();

    if (!linkRes.ok) {
      console.error("Tremendous generate_link error:", linkData);
      return new Response(JSON.stringify({ error: "Failed to generate payout link", details: linkData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const link = linkData.reward?.link;
    if (!link) {
      return new Response(JSON.stringify({ error: "No link returned from Tremendous" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the link generation (don't store the actual link)
    await admin.from("audit_log").insert({
      referral_id: payout.referral_id,
      actor_id: user.id,
      event_type: "payout_link_generated",
      payload: {
        payout_id,
        tremendous_reward_id: tremendousRewardId,
      },
    });

    return new Response(JSON.stringify({ link }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-payout-link error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
