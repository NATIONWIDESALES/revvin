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
    const offerId = session.metadata?.offer_id;
    const expectedAmount = session.metadata?.deposit_amount;

    if (!offerId) {
      console.error("No offer_id in session metadata");
      return new Response("Missing offer_id", { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: offer } = await supabaseAdmin
      .from("offers")
      .select("deposit_status, deposit_amount, stripe_checkout_session_id")
      .eq("id", offerId)
      .single();

    if (!offer) {
      console.error("Offer not found:", offerId);
      return new Response("Offer not found", { status: 404 });
    }

    if (offer.deposit_status === "paid") {
      console.log("Deposit already marked as paid, skipping");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    if (offer.stripe_checkout_session_id !== session.id) {
      console.error("Session ID mismatch");
      return new Response("Session mismatch", { status: 400 });
    }

    const paidAmountCents = session.amount_total;
    const expectedAmountCents = expectedAmount ? Math.round(parseFloat(expectedAmount) * 100) : null;
    if (expectedAmountCents && paidAmountCents !== expectedAmountCents) {
      console.error(`Amount mismatch: paid ${paidAmountCents}, expected ${expectedAmountCents}`);
      return new Response("Amount mismatch", { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("offers")
      .update({
        deposit_status: "paid",
        stripe_payment_intent_id: session.payment_intent as string,
        deposit_paid_at: new Date().toISOString(),
      })
      .eq("id", offerId);

    if (updateError) {
      console.error("Failed to update offer:", updateError);
      return new Response("DB update failed", { status: 500 });
    }

    console.log(`Deposit marked as paid for offer ${offerId}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
