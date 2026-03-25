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
      .select("id, title, payout, status, business_id, deposit_status")
      .eq("id", offer_id)
      .single();
    if (offerErr || !offer) throw new Error("Offer not found");
    if (offer.status !== "draft") throw new Error("Offer must be in draft status to publish");

    // Fetch business & verify ownership
    const { data: biz, error: bizErr } = await serviceClient
      .from("businesses")
      .select("id, user_id, pricing_tier")
      .eq("id", offer.business_id)
      .single();
    if (bizErr || !biz) throw new Error("Business not found");
    if (biz.user_id !== user.id) throw new Error("You do not own this business");

    // Calculate fees
    const feeRate = biz.pricing_tier === "paid" ? 0.10 : 0.25;
    const payout = Number(offer.payout);
    const platformFee = Math.round(payout * feeRate * 100) / 100;
    const totalRequired = Math.round((payout + platformFee) * 100) / 100;

    // Fetch wallet balance
    const { data: wallet } = await serviceClient
      .from("wallet_balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const available = wallet ? Number(wallet.available) : 0;

    if (available < totalRequired) {
      return new Response(
        JSON.stringify({
          error: "Insufficient wallet balance",
          shortfall: Math.round((totalRequired - available) * 100) / 100,
          total_required: totalRequired,
          available,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
      );
    }

    // Atomic updates using service role
    const newAvailable = Math.round((available - totalRequired) * 100) / 100;
    const newReserved = Math.round(((wallet?.reserved ? Number(wallet.reserved) : 0) + payout) * 100) / 100;
    const newFees = Math.round(((wallet?.platform_fees ? Number(wallet.platform_fees) : 0) + platformFee) * 100) / 100;

    // Update wallet balance
    const { error: walletErr } = await serviceClient
      .from("wallet_balances")
      .update({
        available: newAvailable,
        reserved: newReserved,
        platform_fees: newFees,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    if (walletErr) throw new Error("Failed to update wallet: " + walletErr.message);

    // Insert reserve transaction
    const feeLabel = biz.pricing_tier === "paid" ? "10%" : "25%";
    await serviceClient.from("wallet_transactions").insert([
      {
        user_id: user.id,
        type: "reserve",
        amount: payout,
        offer_id: offer.id,
        description: `Reserved for offer: ${offer.title}`,
      },
      {
        user_id: user.id,
        type: "fee",
        amount: platformFee,
        offer_id: offer.id,
        description: `Platform fee (${feeLabel}): ${offer.title}`,
      },
    ]);

    // Update offer status
    await serviceClient
      .from("offers")
      .update({
        status: "active",
        deposit_status: "paid",
        platform_fee_rate: feeRate,
      })
      .eq("id", offer.id);

    return new Response(
      JSON.stringify({
        success: true,
        reserved: payout,
        fee: platformFee,
        remaining_balance: newAvailable,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error reserving offer funds:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
