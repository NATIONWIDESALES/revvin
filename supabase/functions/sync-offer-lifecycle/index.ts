// Auto-pause / auto-reactivate offers based on wallet balance vs. committed amount.
// Called from process-deal-won (after wallet drop) and stripe-deposit-webhook (after top-up).
// Internal-only: requires SERVICE_ROLE auth via shared secret header.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  runSyncLifecycle,
  type LifecycleClient,
  type OfferRow,
} from "./lifecycle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function makeAdapter(serviceClient: ReturnType<typeof createClient>): LifecycleClient {
  return {
    async fetchWallet(userId) {
      const { data } = await serviceClient
        .from("wallet_balances")
        .select("available")
        .eq("user_id", userId)
        .maybeSingle();
      return data ? { available: (data as any).available } : null;
    },
    async fetchBusinesses(userId) {
      const { data } = await serviceClient
        .from("businesses")
        .select("id")
        .eq("user_id", userId);
      return ((data as any[]) ?? []).map((b) => ({ id: b.id }));
    },
    async fetchOffersForLifecycle(businessIds) {
      const { data } = await serviceClient
        .from("offers")
        .select("id, business_id, payout, platform_fee_rate, status, paused_reason")
        .in("business_id", businessIds)
        .in("status", ["active", "paused"]);
      return ((data as any[]) ?? []) as OfferRow[];
    },
    async fetchActiveOfferCosts(businessIds) {
      const { data } = await serviceClient
        .from("offers")
        .select("payout, platform_fee_rate")
        .in("business_id", businessIds)
        .eq("status", "active");
      return ((data as any[]) ?? []).map((o) => ({
        payout: o.payout,
        platform_fee_rate: o.platform_fee_rate,
      }));
    },
    async updateOfferStatus(offerId, status, pausedReason) {
      await serviceClient
        .from("offers")
        .update({ status, paused_reason: pausedReason })
        .eq("id", offerId);
    },
    async notify(userId, title, body, type) {
      await serviceClient.rpc("fn_create_notification", {
        p_user_id: userId,
        p_title: title,
        p_body: body,
        p_type: type,
      });
    },
  };
}

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
    const result = await runSyncLifecycle(makeAdapter(serviceClient), user_id);

    if (result.skipped) {
      return new Response(JSON.stringify({ skipped: result.skipped }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        paused: result.paused,
        reactivated: result.reactivated,
        available: result.available,
      }),
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
