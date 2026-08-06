import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  PRICE_LAUNCH_PACKAGE_297,
  PLAN_PRICE,
  PLAN_METADATA,
  type BillingPlan,
} from "../_shared/stripe-prices.ts";
import { promoCouponFor, promoMetadataFor, PROMO_COUPON_MONTHLY } from "../_shared/promo.ts";

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
    // Unrecognised values fall back to monthly rather than erroring or charging
    // something unexpected.
    let plan: BillingPlan = "monthly";
    let rawInviteCode: string | null = null;
    try {
      if (req.headers.get("content-type")?.includes("application/json")) {
        const body = await req.json();
        includeLaunchPackage = !!body?.includeLaunchPackage;
        if (body?.plan === "annual") plan = "annual";
        if (typeof body?.invite_code === "string" && body.invite_code.trim()) {
          rawInviteCode = body.invite_code.trim().toUpperCase().slice(0, 40);
        }
      }
    } catch (_) { /* no body */ }

    const planMetadata = PLAN_METADATA[plan];

    // Invite codes: monthly only, validated and CLAIMED server-side with the
    // service role. The client's code is never trusted. A bad code must not
    // break checkout, so failures fall through to normal pricing.
    let invite: { id: string; code: string; trial_days: number } | null = null;
    let inviteApplied = false;
    let inviteRejected = false;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    if (rawInviteCode && plan === "monthly") {
      // Atomic claim: a single conditional UPDATE ... RETURNING inside the
      // function. No row back means missing, inactive, expired, or exhausted.
      const { data: claimed, error: claimErr } = await admin.rpc("fn_claim_invite_code", {
        p_code: rawInviteCode,
      });
      if (claimErr) console.error("[create-business-checkout] invite claim failed", claimErr);
      const row = Array.isArray(claimed) ? claimed[0] : claimed;
      if (row?.id) {
        invite = { id: row.id, code: row.code, trial_days: row.trial_days ?? 90 };
        inviteApplied = true;
      } else {
        inviteRejected = true;
      }
    } else if (rawInviteCode) {
      inviteRejected = true; // invites are monthly only
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Look up or rely on Stripe to create customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || "https://revvin.co";

    const line_items: Array<{ price: string; quantity: number }> = [
      { price: PLAN_PRICE[plan], quantity: 1 },
    ];
    if (includeLaunchPackage) {
      line_items.push({ price: PRICE_LAUNCH_PACKAGE_297, quantity: 1 });
    }

    // Launch promotion: $17/month instead of $49/month, or $204/year instead of
    // $450/year, locked forever while the subscription stays active. Applies to
    // both plans, each with its own coupon, and the deadline is checked against
    // the SERVER clock so a client cannot claim it late.
    // Invite redemptions always get the launch coupon, even after the public
    // promo deadline: an invited business must never pay more than a stranger.
    const promoCoupon = invite ? PROMO_COUPON_MONTHLY : promoCouponFor(plan);
    const promoApplies = promoCoupon !== null;
    const promoTag = invite ? "invite_17_monthly" : promoApplies ? promoMetadataFor(plan) : "none";

    const inviteMetadata = invite ? { invite_code: invite.code } : {};

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "subscription",
      line_items,
      subscription_data: {
        // Stripe Checkout collects the card for trials by default, so month
        // four converts automatically instead of silently lapsing.
        ...(invite ? { trial_period_days: invite.trial_days } : {}),
        metadata: {
          user_id: user.id,
          plan: planMetadata,
          launch_package: includeLaunchPackage ? "1" : "0",
          promo: promoTag,
          ...inviteMetadata,
        },
      },
      metadata: {
        user_id: user.id,
        plan: planMetadata,
        launch_package: includeLaunchPackage ? "1" : "0",
        promo: promoTag,
        ...inviteMetadata,
        ...(includeLaunchPackage ? { product_type: "launch_package" } : {}),
      },
      // Stripe rejects `discounts` and `allow_promotion_codes` together, so we
      // auto-apply the coupon when the promo is live and only expose the code
      // field otherwise.
      ...(promoCoupon
        ? { discounts: [{ coupon: promoCoupon }] }
        : { allow_promotion_codes: true }),
      success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?checkout=canceled`,
    });

    if (invite) {
      const { data: bizRow } = await admin
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      const { error: redErr } = await admin.from("invite_redemptions").insert({
        invite_code_id: invite.id,
        business_id: bizRow?.[0]?.id ?? null,
        user_id: user.id,
        stripe_session_id: session.id,
      });
      if (redErr) console.error("[create-business-checkout] redemption insert failed", redErr);
    }

    return new Response(JSON.stringify({
      url: session.url,
      invite_applied: inviteApplied,
      invite_rejected: inviteRejected,
      trial_days: invite?.trial_days ?? 0,
    }), {
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