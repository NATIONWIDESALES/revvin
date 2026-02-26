import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPER_ADMIN_EMAIL = "sales@nationwidesales.ca";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(null, { status: 404, headers: corsHeaders });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await anonClient.auth.getUser();

    if (userError || !user) {
      return new Response(null, { status: 404, headers: corsHeaders });
    }

    const email = user.email;
    if (!email || email.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return new Response(null, { status: 404, headers: corsHeaders });
    }

    // Authenticated as super admin — use service role
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const bizId = url.searchParams.get("biz_id");
    const action = url.searchParams.get("action");

    // Handle note update
    if (req.method === "POST" && action === "update_notes") {
      const body = await req.json();
      const { referral_id, notes } = body;
      if (!referral_id) {
        return new Response(JSON.stringify({ error: "Missing referral_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await admin
        .from("referrals")
        .update({ notes })
        .eq("id", referral_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lazy load referrals for a specific business
    if (bizId) {
      const { data: referrals } = await admin
        .from("referrals")
        .select("*, offers(title, payout, payout_type)")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false })
        .limit(500);

      const { data: auditLog } = await admin
        .from("audit_log")
        .select("*")
        .in(
          "referral_id",
          (referrals || []).map((r: any) => r.id)
        )
        .order("created_at", { ascending: false })
        .limit(200);

      const { data: payouts } = await admin
        .from("payouts")
        .select("*")
        .eq("business_id", bizId);

      return new Response(
        JSON.stringify({ referrals: referrals || [], audit_log: auditLog || [], payouts: payouts || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Full overview load
    const [
      { data: businesses },
      { data: profiles },
      { data: referralCounts },
      { data: payouts },
      { data: offers },
    ] = await Promise.all([
      admin.from("businesses").select("*").order("created_at", { ascending: false }),
      admin.from("profiles").select("*"),
      admin.from("referrals").select("id, business_id, status, payout_status"),
      admin.from("payouts").select("id, business_id, status, amount"),
      admin.from("offers").select("id, business_id, status, title"),
    ]);

    return new Response(
      JSON.stringify({
        businesses: businesses || [],
        profiles: profiles || [],
        referral_summary: referralCounts || [],
        payouts: payouts || [],
        offers: offers || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(null, { status: 404, headers: corsHeaders });
  }
});
