import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authData.user) throw new Error("Unauthorized");
    const user = authData.user;

    const { offer_id } = await req.json();
    if (!offer_id) throw new Error("offer_id is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: offer, error: offerError } = await supabaseAdmin
      .from("offers")
      .select("*, businesses(id, user_id, name)")
      .eq("id", offer_id)
      .single();

    if (offerError || !offer) throw new Error("Offer not found");
    if (offer.businesses?.user_id !== user.id) throw new Error("You don't own this offer");

    let depositAmount: number;
    if (offer.payout_type === "percentage") {
      if (!offer.max_payout_cap || offer.max_payout_cap <= 0) {
        throw new Error("Percentage offers require a maximum payout cap");
      }
      depositAmount = Number(offer.max_payout_cap);
    } else {
      depositAmount = Number(offer.payout);
    }

    if (depositAmount <= 0) throw new Error("Invalid payout amount");

    const amountInCents = Math.round(depositAmount * 100);
    const currency = (offer.deposit_currency || "USD").toLowerCase();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://revvin.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Deposit — ${offer.title}`,
              description: `Publishing deposit for offer "${offer.title}" by ${offer.businesses?.name || "Business"}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        offer_id: offer.id,
        business_id: offer.business_id,
        user_id: user.id,
        deposit_amount: depositAmount.toString(),
      },
      success_url: `${origin}/dashboard?deposit=success&offer_id=${offer.id}`,
      cancel_url: `${origin}/dashboard?deposit=canceled&offer_id=${offer.id}`,
    });

    await supabaseAdmin
      .from("offers")
      .update({
        stripe_checkout_session_id: session.id,
        deposit_status: "pending",
        deposit_amount: depositAmount,
        deposit_currency: currency.toUpperCase(),
      })
      .eq("id", offer.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating deposit session:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
