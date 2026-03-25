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

    const { offer_id, new_status } = await req.json();
    if (!offer_id) throw new Error("offer_id is required");
    if (!["paused", "closed"].includes(new_status)) throw new Error("new_status must be 'paused' or 'closed'");

    // Fetch offer and verify ownership
    const { data: offer, error: offerErr } = await serviceClient
      .from("offers")
      .select("*, businesses(user_id)")
      .eq("id", offer_id)
      .single();
    if (offerErr || !offer) throw new Error("Offer not found");
    if (offer.businesses?.user_id !== userId) throw new Error("Not authorized");

    // Check for active referrals
    const activeStatuses = ["submitted", "accepted", "contacted", "in_progress", "qualified"];
    const { data: activeRefs, error: refsErr } = await serviceClient
      .from("referrals")
      .select("id")
      .eq("offer_id", offer_id)
      .in("status", activeStatuses);

    if (refsErr) throw new Error("Failed to check referrals");
    if (activeRefs && activeRefs.length > 0) {
      throw new Error(`Cannot ${new_status} offer: ${activeRefs.length} active referral(s) in progress. Complete or decline them first.`);
    }

    // Just update offer status — no wallet mutation in soft reserve model
    await serviceClient
      .from("offers")
      .update({ status: new_status })
      .eq("id", offer_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("release-offer-funds error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
