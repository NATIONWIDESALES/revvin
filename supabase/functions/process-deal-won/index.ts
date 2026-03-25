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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !authData.user) throw new Error("Unauthorized");
    const userId = authData.user.id;

    const { referral_id } = await req.json();
    if (!referral_id) throw new Error("referral_id is required");

    // Fetch referral with offer info
    const { data: ref, error: refErr } = await serviceClient
      .from("referrals")
      .select("*, offers(title, payout, currency, platform_fee_rate)")
      .eq("id", referral_id)
      .single();
    if (refErr || !ref) throw new Error("Referral not found");

    // Verify the caller owns the business
    const { data: biz } = await serviceClient
      .from("businesses")
      .select("id, user_id")
      .eq("id", ref.business_id)
      .single();
    if (!biz || biz.user_id !== userId) throw new Error("Not authorized");

    // Ensure referral is in a closeable state
    if (!["accepted", "contacted", "in_progress", "qualified"].includes(ref.status)) {
      throw new Error(`Referral status '${ref.status}' cannot be closed`);
    }

    const payoutAmt = ref.payout_snapshot ?? Number(ref.offers?.payout ?? 0);
    const currency = ref.offers?.currency ?? "USD";
    const feeRate = Number(ref.offers?.platform_fee_rate ?? 0.25);
    const platformFee = Math.round(payoutAmt * feeRate * 100) / 100;
    const totalDeduction = Math.round((payoutAmt + platformFee) * 100) / 100;

    // Fetch wallet and guard balance
    const { data: wallet } = await serviceClient
      .from("wallet_balances")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!wallet) throw new Error("No wallet found for this business");
    if (Number(wallet.available) < totalDeduction) {
      return new Response(
        JSON.stringify({
          error: `Insufficient wallet balance to process this payout. Need $${totalDeduction.toFixed(2)}, available $${Number(wallet.available).toFixed(2)}. Please top up your wallet.`,
          shortfall: Math.round((totalDeduction - Number(wallet.available)) * 100) / 100,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
      );
    }

    // 1. Update referral status
    await serviceClient
      .from("referrals")
      .update({ status: "won", payout_amount: payoutAmt, payout_status: "approved" })
      .eq("id", referral_id);

    // 2. Deduct from available, add to paid_out and platform_fees
    await serviceClient
      .from("wallet_balances")
      .update({
        available: Math.round((Number(wallet.available) - totalDeduction) * 100) / 100,
        paid_out: Math.round((Number(wallet.paid_out) + payoutAmt) * 100) / 100,
        platform_fees: Math.round((Number(wallet.platform_fees) + platformFee) * 100) / 100,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);

    // 3. Insert wallet transactions — payout and fee
    await serviceClient.from("wallet_transactions").insert([
      {
        user_id: userId,
        type: "payout",
        amount: payoutAmt,
        referral_id: referral_id,
        description: `Payout for referral — ${ref.offers?.title ?? "offer"}`,
      },
      {
        user_id: userId,
        type: "fee",
        amount: platformFee,
        referral_id: referral_id,
        description: `Platform fee (${Math.round(feeRate * 100)}%) — ${ref.offers?.title ?? "offer"}`,
      },
    ]);

    // 4. Create payout record
    await serviceClient.from("payouts").insert({
      referral_id: referral_id,
      business_id: ref.business_id,
      referrer_id: ref.referrer_id,
      amount: payoutAmt,
      platform_fee: platformFee,
      currency: currency,
      status: "ready",
    });

    // 5. Audit + notification
    await serviceClient.rpc("fn_create_audit_entry", {
      p_referral_id: referral_id,
      p_actor_id: userId,
      p_event_type: "referral_won",
      p_payload: { payout: payoutAmt, platform_fee: platformFee },
    });

    await serviceClient.rpc("fn_create_notification", {
      p_user_id: ref.referrer_id,
      p_title: "Deal closed — payout coming!",
      p_body: `Your referral for "${ref.offers?.title}" closed. You'll receive $${payoutAmt}.`,
      p_type: "referral_won",
      p_referral_id: referral_id,
    });

    return new Response(JSON.stringify({ success: true, payout_amount: payoutAmt, platform_fee: platformFee }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("process-deal-won error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
