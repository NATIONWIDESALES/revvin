import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const PRICE_MONTHLY_49 = "price_1TZdW4Frrk51Q8OzqV0DquhU";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error("[stripe-business-webhook] signature error", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  console.log("[stripe-business-webhook]", event.type);

  try {
    const setBiz = async (
      userId: string,
      patch: Record<string, unknown>
    ) => {
      const { error } = await admin
        .from("businesses")
        .update(patch)
        .eq("user_id", userId);
      if (error) console.error("update businesses error", error);
    };

    const publishedStatuses = new Set(["active", "trialing", "paid", "past_due"]);

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = (s.metadata?.user_id as string) || "";
        if (userId) {
          const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null;
          const custId = typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
          let currentPeriodEnd: string | null = null;
          let status = "active";
          if (subId) {
            const sub = await stripe.subscriptions.retrieve(subId);
            currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
            status = sub.status;
          }
          await setBiz(userId, {
            stripe_subscription_id: subId,
            stripe_customer_id: custId,
            subscription_status: status,
            current_period_end: currentPeriodEnd,
            is_published: publishedStatuses.has(status),
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = (sub.metadata?.user_id as string) || "";
        const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status;
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
        if (userId) {
          await setBiz(userId, {
            stripe_subscription_id: sub.id,
            subscription_status: status,
            current_period_end: periodEnd,
            is_published:
              status === "canceled"
                ? false
                : publishedStatuses.has(status) && (periodEnd ? new Date(periodEnd) > new Date() : true),
          });
        } else {
          // Fall back to customer email lookup
          const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
          const customer = await stripe.customers.retrieve(customerId);
          const email = (customer as Stripe.Customer).email;
          if (email) {
            const { data: usr } = await admin.auth.admin.listUsers();
            const match = usr.users.find((u) => u.email === email);
            if (match) {
              await admin
                .from("businesses")
                .update({
                  stripe_subscription_id: sub.id,
                  subscription_status: status,
                  current_period_end: periodEnd,
                  is_published: publishedStatuses.has(status),
                })
                .eq("user_id", match.id);
            }
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
        if (subId) {
          await admin
            .from("businesses")
            .update({ subscription_status: "past_due" })
            .eq("stripe_subscription_id", subId);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[stripe-business-webhook] handler error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});