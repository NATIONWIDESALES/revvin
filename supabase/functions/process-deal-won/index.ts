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
      .select("*, offers(title, payout, currency)")
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

    // 1. Update referral status
    await serviceClient
      .from("referrals")
      .update({ status: "won", payout_amount: payoutAmt, payout_status: "approved" })
      .eq("id", referral_id);

    // 2. Update wallet: deduct from reserved, add to paid_out
    const { data: wallet } = await serviceClient
      .from("wallet_balances")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (wallet) {
      await serviceClient
        .from("wallet_balances")
        .update({
          reserved: Math.max(0, Number(wallet.reserved) - payoutAmt),
          paid_out: Number(wallet.paid_out) + payoutAmt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);
    }

    // 3. Insert wallet transaction
    await serviceClient.from("wallet_transactions").insert({
      user_id: userId,
      type: "payout",
      amount: payoutAmt,
      referral_id: referral_id,
      description: `Payout for referral — ${ref.offers?.title ?? "offer"}`,
    });

    // 4. Create payout record (platform_fee = 0, already collected at publish)
    await serviceClient.from("payouts").insert({
      referral_id: referral_id,
      business_id: ref.business_id,
      referrer_id: ref.referrer_id,
      amount: payoutAmt,
      platform_fee: 0,
      currency: currency,
      status: "ready",
    });

    // 5. Audit + notification
    await serviceClient.rpc("fn_create_audit_entry", {
      p_referral_id: referral_id,
      p_actor_id: userId,
      p_event_type: "referral_won",
      p_payload: { payout: payoutAmt, platform_fee: 0 },
    });

    await serviceClient.rpc("fn_create_notification", {
      p_user_id: ref.referrer_id,
      p_title: "Deal closed — payout coming!",
      p_body: `Your referral for "${ref.offers?.title}" closed. You'll receive $${payoutAmt}.`,
      p_type: "referral_won",
      p_referral_id: referral_id,
    });

    return new Response(JSON.stringify({ success: true, payout_amount: payoutAmt }), {
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
