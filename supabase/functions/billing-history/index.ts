import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

/**
 * Read-only billing history for the signed in business owner.
 * The server invoice ledger is the only proof of payment, so the rows come
 * from stripe_payments and never from client state. No provider write happens
 * here and no card data is ever stored or returned.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: bizRows, error: bizError } = await admin
      .from("businesses")
      .select("id, subscription_status, current_period_end")
      .eq("user_id", user.id)
      .limit(1);
    if (bizError) throw bizError;
    const biz = bizRows?.[0];
    if (!biz) return json({ payments: [], subscription_status: null, current_period_end: null });

    const { data: payments, error: payError } = await admin
      .from("stripe_payments")
      .select("id, paid_at, amount_paid_cents, currency, kind, billing_reason, collected")
      .eq("business_id", biz.id)
      .eq("collected", true)
      .order("paid_at", { ascending: false })
      .limit(24);
    if (payError) throw payError;

    return json({
      subscription_status: biz.subscription_status ?? null,
      current_period_end: biz.current_period_end ?? null,
      payments: (payments ?? []).map((p: Record<string, unknown>) => ({
        id: p.id,
        paid_at: p.paid_at,
        amount_paid_cents: p.amount_paid_cents,
        currency: p.currency,
        kind: p.kind,
        billing_reason: p.billing_reason,
      })),
    });
  } catch (error) {
    console.error("billing-history error:", error);
    return json({ error: "Could not load billing history. Please try again." }, 500);
  }
});
