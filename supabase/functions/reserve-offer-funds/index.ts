import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !authData.user) throw new Error("Unauthorized");
    const user = authData.user;

    const { offer_id } = await req.json();
    if (!offer_id) throw new Error("offer_id is required");

    // Fetch offer
    const { data: offer, error: offerErr } = await serviceClient
      .from("offers")
      .select("id, title, payout, status, business_id, deposit_status, platform_fee_rate")
      .eq("id", offer_id)
      .single();
    if (offerErr || !offer) throw new Error("Offer not found");
    if (!["draft", "paused"].includes(offer.status)) throw new Error("Offer must be in draft or paused status to publish");

    // Fetch business & verify ownership
    const { data: biz, error: bizErr } = await serviceClient
      .from("businesses")
      .select("id, user_id, pricing_tier")
      .eq("id", offer.business_id)
      .single();
    if (bizErr || !biz) throw new Error("Business not found");
    if (biz.user_id !== user.id) throw new Error("You do not own this business");

    // Calculate fee rate and new offer cost
    const feeRate = biz.pricing_tier === "paid" ? 0.10 : 0.25;
    const payout = Number(offer.payout);
    const newOfferCost = Math.round(payout * (1 + feeRate) * 100) / 100;

    // Calculate total committed from all OTHER active offers for this business
    const { data: activeOffers, error: activeErr } = await serviceClient
      .from("offers")
      .select("payout, platform_fee_rate")
      .eq("business_id", biz.id)
      .eq("status", "active");
    if (activeErr) throw new Error("Failed to fetch active offers");

    const totalCommitted = (activeOffers ?? []).reduce((sum, o) => {
      return sum + Math.round(Number(o.payout) * (1 + Number(o.platform_fee_rate)) * 100) / 100;
    }, 0);

    // Fetch wallet balance
    const { data: wallet } = await serviceClient
      .from("wallet_balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const available = wallet ? Number(wallet.available) : 0;
    const totalNeeded = Math.round((totalCommitted + newOfferCost) * 100) / 100;

    if (available < totalNeeded) {
      const shortfall = Math.round((totalNeeded - available) * 100) / 100;
      return new Response(
        JSON.stringify({
          error: "Insufficient wallet balance",
          shortfall,
          total_required: newOfferCost,
          total_committed: totalCommitted,
          available,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
      );
    }

    // Just activate the offer — no wallet mutation
    await serviceClient
      .from("offers")
      .update({
        status: "active",
        deposit_status: "validated",
        platform_fee_rate: feeRate,
      })
      .eq("id", offer.id);

    return new Response(
      JSON.stringify({
        success: true,
        offer_cost: newOfferCost,
        total_committed: Math.round((totalCommitted + newOfferCost) * 100) / 100,
        available,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error validating offer funds:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
