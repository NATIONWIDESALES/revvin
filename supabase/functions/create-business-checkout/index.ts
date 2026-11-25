import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  PRICE_LAUNCH_PACKAGE_297,
  checkoutPricing,
  type BillingPlan,
} from "../_shared/stripe-prices.ts";
import { checkoutPromotion, isSaleLive, SALE_END_ISO, promoAllowedForPriceVersion, INVITE_PROMOTION_PAUSED } from "../_shared/promo.ts";
import { checkoutOrigin } from "../_shared/app-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Read-only history, shared by sale display and checkout. A canceled sale
// subscription cannot redeem the sale again, even before the window closes.
async function customerHistory(stripe: Stripe, email: string) {
  const customers = await stripe.customers.list({ email, limit: 1 });
  const customerId = customers.data[0]?.id;
  const subscriptions: Stripe.Subscription[] = [];
  if (customerId) {
    let cursor: string | undefined;
    while (true) {
      const page = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100, ...(cursor ? { starting_after: cursor } : {}) });
      subscriptions.push(...page.data);
      if (!page.has_more) break;
      cursor = page.data.at(-1)?.id;
      if (!cursor) throw new Error("Could not read subscription history");
    }
  }
  return { customerId, subscriptions, previousSaleSubscription: subscriptions.some(s => ["bf2026_monthly_30", "bf2026_annual_40"].includes(s.metadata?.promo)) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Public, read-only pricing state. The UI never uses its own wall clock to
  // claim a sale, and cached/prerendered pages cannot keep advertising it late.
  if (req.method === "GET") {
    const now = new Date();
    let eligible = true;
    const authorization = req.headers.get("Authorization");
    if (authorization && isSaleLive(now)) {
      try {
        const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
        const { data, error } = await client.auth.getUser(authorization.replace("Bearer ", ""));
        if (error || !data.user?.email) eligible = false;
        else {
          const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
          eligible = !(await customerHistory(stripe, data.user.email)).previousSaleSubscription;
        }
      } catch { eligible = false; }
    }
    return new Response(JSON.stringify({ sale_live: isSaleLive(now) && eligible, sale_end: SALE_END_ISO, server_now: now.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

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
    const email = user.email;
    if (!email) throw new Error("Unauthorized");

    let includeLaunchPackage = false;
    // Unrecognized values fall back to monthly rather than erroring or charging
    // something unexpected.
    let plan: BillingPlan = "monthly";
    let rawInviteCode: string | null = null;
    let priceVersion: unknown;
    try {
      if (req.headers.get("content-type")?.includes("application/json")) {
        const body = await req.json();
        priceVersion = body?.price_version;
        includeLaunchPackage = !!body?.includeLaunchPackage;
        if (body?.plan === "annual") plan = "annual";
        if (typeof body?.invite_code === "string" && body.invite_code.trim()) {
          rawInviteCode = body.invite_code.trim().toUpperCase().slice(0, 40);
        }
      }
    } catch (_) { /* no body */ }

    const pricing = checkoutPricing(plan, priceVersion);
    const planMetadata = pricing.metadata;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Look up or rely on Stripe to create customer by email
    const { customerId, subscriptions, previousSaleSubscription } = await customerHistory(stripe, email);

    // Never open a second subscription for someone who already pays. Any UI
    // that offers checkout can be reached twice, so the guard lives here too.
    if (customerId) {
      const live = subscriptions.some((s) =>
        ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(s.status)
      );
      if (live) {
        return new Response(
          JSON.stringify({
            error: "You already have a Revvin Pro subscription. Manage it from your billing settings.",
            already_subscribed: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
        );
      }
    }

    // Invite codes: monthly only, validated and CLAIMED server-side with the
    // service role. The client's code is never trusted. A bad code must not
    // break checkout, so failures fall through to normal pricing. This runs
    // AFTER the existing-subscription guard above so a refused checkout never
    // burns a code.
    let invite: { id: string; code: string; trial_days: number } | null = null;
    let inviteApplied = false;
    let inviteRejected = false;
    // Fail closed on the 2026-11 price version: the invite coupon is a flat
    // amount off the LEGACY price. Against the current price it would charge
    // more than the promised invite rate, so invites are refused rather than
    // mispriced. The promotion must be redefined for current prices before
    // it can resume.
    if (!INVITE_PROMOTION_PAUSED && promoAllowedForPriceVersion(priceVersion) && rawInviteCode && plan === "monthly") {
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

    const origin = checkoutOrigin(req);

    const line_items: Array<{ price: string; quantity: number }> = [
      { price: pricing.price, quantity: 1 },
    ];
    if (includeLaunchPackage) {
      line_items.push({ price: PRICE_LAUNCH_PACKAGE_297, quantity: 1 });
    }

    // Launch promotion (paused): a fixed lower monthly or yearly rate off
    // the LEGACY prices, locked forever while the subscription stays active.
    // Applies to both plans, each with its own coupon, and the deadline is
    // checked against the SERVER clock so a client cannot claim it late. The
    // flat coupons only match the legacy prices; promoCouponFor returns null
    // for the 2026-11 price version.
    // Invite redemptions always get the launch coupon, even after the public
    // promo deadline: an invited business must never pay more than a stranger.
    const promotion = checkoutPromotion(plan, new Date(), priceVersion, !!invite, previousSaleSubscription);
    const promoCoupon = promotion.coupon;
    const promoTag = promotion.tag;

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
        : { allow_promotion_codes: !INVITE_PROMOTION_PAUSED }),
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