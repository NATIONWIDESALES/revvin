import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const PRICE_TO_TIER: Record<string, string> = {
  "price_1TEi6RFrrk51Q8Oz3Tcf4nVr": "starter",
  "price_1THc9UFrrk51Q8OzhuUZ1h0f": "pro",
  "price_1THc9yFrrk51Q8OzzRki21p3": "enterprise",
};

const TIER_FEE: Record<string, number> = {
  free: 0.25,
  starter: 0.10,
  pro: 0.01,
  enterprise: 0,
};

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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Helper: resolve tier from subscription's price
  const resolveTierFromSubscription = (subscription: Stripe.Subscription): string => {
    const priceId = subscription.items?.data?.[0]?.price?.id;
    return priceId ? (PRICE_TO_TIER[priceId] || "starter") : "starter";
  };

  // Helper: update offers' platform_fee_rate when tier changes
  const syncOfferFees = async (businessId: string, tier: string) => {
    const fee = TIER_FEE[tier] ?? 0.25;
    await supabaseAdmin
      .from("offers")
      .update({ platform_fee_rate: fee })
      .eq("business_id", businessId);
  };

  // ─── checkout.session.completed ───
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Subscription checkout
    if (session.mode === "subscription") {
      const businessId = session.metadata?.business_id;
      const subscriptionId = session.subscription as string;
      const plan = session.metadata?.plan || "starter";

      if (!businessId) {
        console.error("Missing business_id in subscription session metadata");
        return new Response("Missing metadata", { status: 400 });
      }

      const tier = plan in TIER_FEE ? plan : "starter";

      const { error: updateError } = await supabaseAdmin
        .from("businesses")
        .update({
          pricing_tier: tier,
          stripe_subscription_id: subscriptionId,
          subscription_status: "active",
        })
        .eq("id", businessId);

      if (updateError) {
        console.error("Failed to update business for subscription:", updateError);
        return new Response("DB update failed", { status: 500 });
      }

      await syncOfferFees(businessId, tier);

      await supabaseAdmin.from("audit_log").insert({
        actor_id: businessId,
        event_type: "subscription_created",
        payload: { subscription_id: subscriptionId, tier, plan },
      });

      console.log(`Business ${businessId} upgraded to ${tier}, subscription ${subscriptionId}`);
    }

    // One-time payment (wallet top-up)
    if (session.mode === "payment") {
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

      // Idempotency check
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

      // Sync offer lifecycle (auto-reactivate any offers paused for low wallet)
      supabaseAdmin.functions
        .invoke("sync-offer-lifecycle", { body: { user_id: userId } })
        .catch((e) => console.warn("sync-offer-lifecycle invoke failed:", e));
    }
  }

  // ─── customer.subscription.updated ───
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const subscriptionId = subscription.id;
    const tier = resolveTierFromSubscription(subscription);

    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("id, pricing_tier")
      .eq("stripe_subscription_id", subscriptionId)
      .single();

    if (biz) {
      const status = subscription.status === "active" ? "active"
        : subscription.status === "past_due" ? "past_due"
        : subscription.status === "canceled" ? "canceled"
        : subscription.status;

      const updates: Record<string, any> = { subscription_status: status };

      // Update tier if it changed (plan upgrade/downgrade)
      if (biz.pricing_tier !== tier && subscription.status === "active") {
        updates.pricing_tier = tier;
        await syncOfferFees(biz.id, tier);
      }

      await supabaseAdmin
        .from("businesses")
        .update(updates)
        .eq("id", biz.id);

      await supabaseAdmin.from("audit_log").insert({
        actor_id: biz.id,
        event_type: "subscription_updated",
        payload: { subscription_id: subscriptionId, tier, status },
      });

      console.log(`Subscription ${subscriptionId} updated: tier=${tier}, status=${status}`);
    }
  }

  // ─── invoice.payment_failed ───
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.billing_reason === "subscription_cycle" && invoice.subscription) {
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id;

      const { data: biz } = await supabaseAdmin
        .from("businesses")
        .select("id, user_id")
        .eq("stripe_subscription_id", subscriptionId)
        .single();

      if (biz) {
        await supabaseAdmin
          .from("businesses")
          .update({ subscription_status: "past_due" })
          .eq("id", biz.id);

        await supabaseAdmin.from("audit_log").insert({
          actor_id: biz.id,
          event_type: "subscription_payment_failed",
          payload: { subscription_id: subscriptionId, invoice_id: invoice.id },
        });

        // Notify business owner
        await supabaseAdmin.rpc("fn_create_notification", {
          p_user_id: biz.user_id,
          p_title: "Payment failed",
          p_body: "Your subscription payment failed. Please update your payment method to avoid losing your plan benefits.",
          p_type: "payment_failed",
        });

        console.log(`Subscription ${subscriptionId} payment failed, marked past_due`);
      }
    }
  }

  // ─── invoice.payment_succeeded (renewal confirmation) ───
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.billing_reason === "subscription_cycle" && invoice.subscription) {
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id;

      const { data: biz } = await supabaseAdmin
        .from("businesses")
        .select("id")
        .eq("stripe_subscription_id", subscriptionId)
        .single();

      if (biz) {
        // Restore active status if it was past_due
        await supabaseAdmin
          .from("businesses")
          .update({ subscription_status: "active" })
          .eq("id", biz.id);

        console.log(`Subscription ${subscriptionId} renewal succeeded, status restored to active`);
      }
    }
  }

  // ─── customer.subscription.deleted ───
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const subscriptionId = subscription.id;

    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("id, user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .single();

    if (biz) {
      await supabaseAdmin
        .from("businesses")
        .update({
          pricing_tier: "free",
          subscription_status: "canceled",
          stripe_subscription_id: null,
        })
        .eq("id", biz.id);

      await syncOfferFees(biz.id, "free");

      await supabaseAdmin.from("audit_log").insert({
        actor_id: biz.id,
        event_type: "subscription_canceled",
        payload: { subscription_id: subscriptionId },
      });

      // Notify business owner
      await supabaseAdmin.rpc("fn_create_notification", {
        p_user_id: biz.user_id,
        p_title: "Subscription canceled",
        p_body: "Your subscription has been canceled. You've been moved to the Free plan with a 25% platform fee.",
        p_type: "subscription_canceled",
      });

      console.log(`Subscription ${subscriptionId} canceled, business ${biz.id} downgraded to free`);
    } else {
      // Fallback: update by subscription ID even without biz match
      const { error: updateError } = await supabaseAdmin
        .from("businesses")
        .update({
          pricing_tier: "free",
          subscription_status: "canceled",
        })
        .eq("stripe_subscription_id", subscriptionId);

      if (updateError) {
        console.error("Failed to downgrade business on subscription deletion:", updateError);
      }
      console.log(`Subscription ${subscriptionId} canceled (fallback update)`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
