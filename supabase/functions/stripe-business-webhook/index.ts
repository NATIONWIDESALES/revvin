import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const PRICE_MONTHLY_49 = "price_1TZdW4Frrk51Q8OzqV0DquhU";
const PRICE_LAUNCH_PACKAGE_297 = "price_1TZdWjFrrk51Q8OzsTqdozoc";

/**
 * Validate launch-package intent from Stripe session/subscription metadata.
 * Returns true ONLY if metadata explicitly flags it AND the matching line item
 * is present in the checkout session.
 */
function flaggedLaunchPackage(meta: Stripe.Metadata | null | undefined): boolean {
  if (!meta) return false;
  const raw = String(meta.launch_package ?? "").toLowerCase();
  return raw === "1" || raw === "true";
}

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

  // FIX 3: Require signature verification — no silent fallback in production
  if (!webhookSecret) {
    console.error("[stripe-business-webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-business-webhook] signature error", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

          // Validate launch package: metadata flag MUST be backed by an actual
          // line item charged in this checkout session.
          let launchPackagePurchased = false;
          let launchPaymentIntentId: string | null = null;
          if (flaggedLaunchPackage(s.metadata)) {
            try {
              const items = await stripe.checkout.sessions.listLineItems(s.id, { limit: 20 });
              launchPackagePurchased = items.data.some(
                (li) => li.price?.id === PRICE_LAUNCH_PACKAGE_297
              );
              if (!launchPackagePurchased) {
                console.warn(
                  "[stripe-business-webhook] launch_package metadata set but no $297 line item found",
                  { session: s.id, user: userId }
                );
              }
            } catch (e) {
              console.error("[stripe-business-webhook] listLineItems failed", e);
            }
            launchPaymentIntentId =
              typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null;
          }

          const patch: Record<string, unknown> = {
            stripe_subscription_id: subId,
            stripe_customer_id: custId,
            subscription_status: status,
            current_period_end: currentPeriodEnd,
            is_published: publishedStatuses.has(status),
          };
          if (launchPackagePurchased) patch.launch_package_status = "purchased";
          await setBiz(userId, patch);

          // Mirror subscription metadata so future subscription.* events know.
          if (launchPackagePurchased && subId) {
            try {
              await stripe.subscriptions.update(subId, {
                metadata: { user_id: userId, launch_package: "1" },
              });
            } catch (e) {
              console.error("[stripe-business-webhook] sub metadata sync failed", e);
            }
          }

          // Provision the launch task for the ops team.
          if (launchPackagePurchased) {
            const { data: bizRow } = await admin
              .from("businesses")
              .select("id")
              .eq("user_id", userId)
              .limit(1);
            const bizId = bizRow?.[0]?.id as string | undefined;
            if (bizId) {
              const { data: existing } = await admin
                .from("launch_tasks")
                .select("id")
                .eq("business_id", bizId)
                .eq("package_type", "launch_297")
                .limit(1);
              if (!existing?.length) {
                const { error: ltErr } = await admin.from("launch_tasks").insert({
                  business_id: bizId,
                  package_type: "launch_297",
                  status: "purchased",
                  amount_paid: 297,
                  currency: "USD",
                  stripe_payment_intent_id: launchPaymentIntentId,
                });
                if (ltErr) console.error("[stripe-business-webhook] launch_tasks insert", ltErr);
              }
            }
          }
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
      case "invoice.payment_succeeded": {
        // FIX 6: Keep current_period_end fresh on renewals
        const inv = event.data.object as Stripe.Invoice;
        const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;
          await admin
            .from("businesses")
            .update({
              subscription_status: "active",
              current_period_end: periodEnd,
              is_published: true,
            })
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