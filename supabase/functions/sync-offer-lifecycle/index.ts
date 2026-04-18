// Auto-pause / auto-reactivate offers based on wallet balance vs. committed amount.
// Called from process-deal-won (after wallet drop) and stripe-deposit-webhook (after top-up).
// Internal-only: requires SERVICE_ROLE auth via shared secret header.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id is required");

    // Fetch wallet
    const { data: wallet } = await serviceClient
      .from("wallet_balances")
      .select("available")
      .eq("user_id", user_id)
      .maybeSingle();
    const available = wallet ? Number(wallet.available) : 0;

    // Fetch all of this user's businesses (a user may own multiple)
    const { data: businesses } = await serviceClient
      .from("businesses")
      .select("id")
      .eq("user_id", user_id);
    if (!businesses || businesses.length === 0) {
      return new Response(JSON.stringify({ skipped: "no business" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const businessIds = businesses.map((b: any) => b.id);

    // Fetch all offers across this user's businesses (active + paused)
    const { data: offers } = await serviceClient
      .from("offers")
      .select("id, business_id, payout, platform_fee_rate, status, paused_reason")
      .in("business_id", businessIds)
      .in("status", ["active", "paused"]);

    if (!offers || offers.length === 0) {
      return new Response(JSON.stringify({ skipped: "no offers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const offerCost = (o: { payout: number; platform_fee_rate: number }) =>
      Math.round(Number(o.payout) * (1 + Number(o.platform_fee_rate)) * 100) / 100;

    let paused = 0;
    let reactivated = 0;

    // Step 1: pause active offers if wallet < total committed
    const activeOffers = offers.filter((o) => o.status === "active");
    const totalCommitted = activeOffers.reduce((s, o) => s + offerCost(o), 0);

    if (totalCommitted > available && activeOffers.length > 0) {
      // Pause the most expensive active offers until committed <= available
      const sorted = [...activeOffers].sort((a, b) => offerCost(b) - offerCost(a));
      let runningCommitted = totalCommitted;
      for (const o of sorted) {
        if (runningCommitted <= available) break;
        await serviceClient
          .from("offers")
          .update({ status: "paused", paused_reason: "low_wallet" })
          .eq("id", o.id);
        runningCommitted -= offerCost(o);
        paused += 1;
      }
      // Notify business
      if (paused > 0) {
        await serviceClient.rpc("fn_create_notification", {
          p_user_id: user_id,
          p_title: "Offers paused — wallet low",
          p_body: `${paused} offer${paused > 1 ? "s" : ""} paused because your wallet balance dropped below the committed amount. Top up to reactivate.`,
          p_type: "offer_paused_low_wallet",
        });
      }
    }

    // Step 2: reactivate offers paused-by-low-wallet if there's enough headroom
    const autoPaused = offers.filter(
      (o) => o.status === "paused" && o.paused_reason === "low_wallet"
    );
    if (autoPaused.length > 0) {
      // Recompute committed after any pauses above
      const { data: stillActive } = await serviceClient
        .from("offers")
        .select("payout, platform_fee_rate")
        .in("business_id", businessIds)
        .eq("status", "active");
      let runningCommitted = (stillActive ?? []).reduce(
        (s, o: any) => s + Math.round(Number(o.payout) * (1 + Number(o.platform_fee_rate)) * 100) / 100,
        0
      );
      // Reactivate cheapest first to maximize how many we can bring back
      const sorted = [...autoPaused].sort((a, b) => offerCost(a) - offerCost(b));
      for (const o of sorted) {
        const cost = offerCost(o);
        if (runningCommitted + cost <= available) {
          await serviceClient
            .from("offers")
            .update({ status: "active", paused_reason: null })
            .eq("id", o.id);
          runningCommitted += cost;
          reactivated += 1;
        }
      }
      if (reactivated > 0) {
        await serviceClient.rpc("fn_create_notification", {
          p_user_id: user_id,
          p_title: "Offers reactivated",
          p_body: `${reactivated} offer${reactivated > 1 ? "s" : ""} reactivated now that your wallet is funded.`,
          p_type: "offer_reactivated",
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, paused, reactivated, available }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("sync-offer-lifecycle error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
