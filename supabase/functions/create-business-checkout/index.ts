import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { PRICE_MONTHLY_49, PRICE_LAUNCH_PACKAGE_297 } from "../_shared/stripe-prices.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authData.user?.email) throw new Error("Unauthorized");
    const user = authData.user;

    let includeLaunchPackage = false;
    try {
      if (req.headers.get("content-type")?.includes("application/json")) {
        const body = await req.json();
        includeLaunchPackage = !!body?.includeLaunchPackage;
      }
    } catch (_) { /* no body */ }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Look up or rely on Stripe to create customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || "https://revvin.co";

    const line_items: Array<{ price: string; quantity: number }> = [
      { price: PRICE_MONTHLY_49, quantity: 1 },
    ];
    if (includeLaunchPackage) {
      line_items.push({ price: PRICE_LAUNCH_PACKAGE_297, quantity: 1 });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "subscription",
      line_items,
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: "pro_monthly_49",
          launch_package: includeLaunchPackage ? "1" : "0",
        },
      },
      metadata: {
        user_id: user.id,
        plan: "pro_monthly_49",
        launch_package: includeLaunchPackage ? "1" : "0",
      },
      allow_promotion_codes: true,
      success_url: `${origin}/welcome?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/signup?checkout=canceled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[create-business-checkout]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});