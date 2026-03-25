import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`Received event: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const amountStr = session.metadata?.amount;
    const paymentIntent = session.payment_intent as string;

    if (!userId || !amountStr) {
      console.error("Missing user_id or amount in session metadata");
      return new Response("Missing metadata", { status: 400 });
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      console.error("Invalid amount in metadata:", amountStr);
      return new Response("Invalid amount", { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Idempotency: check if we already processed this payment intent
    const { data: existing } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "topup")
      .eq("description", `Stripe top-up (${paymentIntent})`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log("Top-up already processed for payment_intent:", paymentIntent);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Upsert wallet balance
    const { data: wallet } = await supabaseAdmin
      .from("wallet_balances")
      .select("id, available, total_funded")
      .eq("user_id", userId)
      .single();

    if (wallet) {
      const { error: updateError } = await supabaseAdmin
        .from("wallet_balances")
        .update({
          available: wallet.available + amount,
          total_funded: wallet.total_funded + amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);

      if (updateError) {
        console.error("Failed to update wallet_balances:", updateError);
        return new Response("DB update failed", { status: 500 });
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("wallet_balances")
        .insert({
          user_id: userId,
          available: amount,
          total_funded: amount,
          currency: "USD",
        });

      if (insertError) {
        console.error("Failed to insert wallet_balances:", insertError);
        return new Response("DB insert failed", { status: 500 });
      }
    }

    // Record transaction
    const { error: txError } = await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        user_id: userId,
        type: "topup",
        amount,
        description: `Stripe top-up (${paymentIntent})`,
      });

    if (txError) {
      console.error("Failed to insert wallet_transaction:", txError);
      return new Response("TX insert failed", { status: 500 });
    }

    console.log(`Wallet topped up $${amount} for user ${userId}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
