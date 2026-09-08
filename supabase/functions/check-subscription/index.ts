import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  hasAccess,
  subscriptionPeriodEnd,
  type ProviderStatus,
} from "../_shared/stripe-subscription.ts";

/**
 * Current billing status for the signed-in owner.
 *
 * Contract fix: the dashboard reads `subscription_status`, but this function only
 * ever returned `subscribed`/`tier`, so the caller's check never matched and a
 * real activation was never reported. It also queried `status: "active"` only,
 * which excluded trialing owners, wrote a `pricing_tier` column that does not
 * exist in the schema, and read `sub.current_period_end`, which is undefined on
 * the current API version.
 *
 * The response is now the shared ProviderStatus shape. `has_access` is access,
 * `collected_payment` is money, and the two are never conflated: only a paid
 * invoice (recorded server-side by the webhook) proves money moved.
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

const NONE: ProviderStatus = {
  subscription_status: "none",
  has_access: false,
  collected_payment: false,
  current_period_end: null,
  subscription_id: null,
  customer_id: null,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user?.email) return json({ error: "Unauthorized" }, 401);
    const user = authData.user;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (customers.data.length === 0) return json(NONE);

    const customerId = customers.data[0].id;
    // "all" so trialing and past_due are seen; the newest subscription wins.
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    const sub =
      subscriptions.data.find((s: Stripe.Subscription) => hasAccess(s.status)) ?? subscriptions.data[0] ?? null;
    if (!sub) return json({ ...NONE, customer_id: customerId });

    // Money collected is read from the authoritative server-side payment record,
    // never inferred from the subscription status.
    const { data: paidRows } = await admin
      .from("stripe_payments")
      .select("id")
      .eq("stripe_subscription_id", sub.id)
      .eq("collected", true)
      .limit(1);

    const status: ProviderStatus = {
      subscription_status: sub.status,
      has_access: hasAccess(sub.status),
      collected_payment: !!paidRows?.length,
      current_period_end: subscriptionPeriodEnd(sub),
      subscription_id: sub.id,
      customer_id: customerId,
    };

    // Keep the owner's row consistent with the provider. Publication is never
    // touched here: publishing is free and owner-controlled.
    const { data: bizRows } = await admin
      .from("businesses")
      .select("id, subscription_status, stripe_subscription_id, stripe_customer_id")
      .eq("user_id", user.id)
      .limit(1);
    const biz = bizRows?.[0];
    if (
      biz &&
      (biz.subscription_status !== sub.status ||
        biz.stripe_subscription_id !== sub.id ||
        biz.stripe_customer_id !== customerId)
    ) {
      await admin
        .from("businesses")
        .update({
          subscription_status: sub.status,
          stripe_subscription_id: sub.id,
          stripe_customer_id: customerId,
          current_period_end: status.current_period_end,
        })
        .eq("id", biz.id);
    }

    return json(status);
  } catch (error) {
    console.error("check-subscription error:", error);
    return json({ error: (error as Error).message }, 400);
  }
});
