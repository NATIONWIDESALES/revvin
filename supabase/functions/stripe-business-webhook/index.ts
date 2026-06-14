import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  ADMIN_NOTIFICATION_EMAIL,
  RESEND_FROM_ADDRESS,
  RESEND_REPLY_TO,
  appUrl,
} from "../_shared/app-config.ts";
import { PRICE_LAUNCH_PACKAGE_297 } from "../_shared/stripe-prices.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

/**
 * Validate launch-package intent from Stripe session/subscription metadata.
 * Accepts the new standardized `product_type === "launch_package"` flag and
 * the legacy `launch_package === "1"` flag for in-flight sessions.
 */
function flaggedLaunchPackage(meta: Stripe.Metadata | null | undefined): boolean {
  if (!meta) return false;
  const productType = String(meta.product_type ?? "").toLowerCase();
  if (productType === "launch_package") return true;
  const raw = String(meta.launch_package ?? "").toLowerCase();
  return raw === "1" || raw === "true";
}

function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
          // line item charged in this checkout session. If metadata is missing
          // entirely, fall back to expanding line items and matching by price/product.
          let launchPackagePurchased = false;
          let launchPaymentIntentId: string | null = null;
          try {
            const items = await stripe.checkout.sessions.listLineItems(s.id, {
              limit: 20,
              expand: ["data.price.product"],
            });
            const hasLaunchLineItem = items.data.some((li) => {
              if (li.price?.id === PRICE_LAUNCH_PACKAGE_297) return true;
              const product = li.price?.product as Stripe.Product | string | undefined;
              if (product && typeof product !== "string") {
                const pm = (product.metadata ?? {}) as Stripe.Metadata;
                if (String(pm.product_type ?? "").toLowerCase() === "launch_package") return true;
              }
              return false;
            });
            // Detect by metadata first (preferred), then by line item presence.
            launchPackagePurchased = flaggedLaunchPackage(s.metadata) ? hasLaunchLineItem : hasLaunchLineItem;
            if (flaggedLaunchPackage(s.metadata) && !hasLaunchLineItem) {
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
              // Idempotency: guard on (business_id + package_type) AND on the
              // Stripe payment_intent_id so a redelivered webhook never doubles up.
              let existingQuery = admin
                .from("launch_tasks")
                .select("id")
                .eq("business_id", bizId)
                .eq("package_type", "launch_297");
              const { data: existingByBiz } = await existingQuery.limit(1);
              let alreadyExists = !!existingByBiz?.length;
              if (!alreadyExists && launchPaymentIntentId) {
                const { data: existingByPi } = await admin
                  .from("launch_tasks")
                  .select("id")
                  .eq("stripe_payment_intent_id", launchPaymentIntentId)
                  .limit(1);
                alreadyExists = !!existingByPi?.length;
              }
              if (!alreadyExists) {
                const { error: ltErr } = await admin.from("launch_tasks").insert({
                  business_id: bizId,
                  package_type: "launch_297",
                  status: "purchased",
                  amount_paid: 297,
                  currency: "USD",
                  stripe_payment_intent_id: launchPaymentIntentId,
                });
                if (ltErr) console.error("[stripe-business-webhook] launch_tasks insert", ltErr);
                else console.log(
                  "[stripe-business-webhook] launch_package fulfilled",
                  { session: s.id, payment_intent: launchPaymentIntentId, business_id: bizId, user: userId }
                );
              } else {
                console.log(
                  "[stripe-business-webhook] launch_package already fulfilled (idempotent skip)",
                  { session: s.id, payment_intent: launchPaymentIntentId, business_id: bizId }
                );
              }
            }
          } else {
            console.log(
              "[stripe-business-webhook] launch_package not detected on this session",
              { session: s.id, user: userId, metadata_keys: Object.keys(s.metadata ?? {}) }
            );
          }

          // 💰 Admin alert: new paying customer
          try {
            const resendApiKey = Deno.env.get("RESEND_API_KEY");
            if (resendApiKey) {
              const { data: { user: ownerUser } } =
                await admin.auth.admin.getUserById(userId);
              const ownerEmail = ownerUser?.email || "Unknown";
              const ownerName =
                ownerUser?.user_metadata?.full_name || ownerEmail.split("@")[0];
              const { data: bizRow } = await admin
                .from("businesses")
                .select("name, industry, city, state")
                .eq("user_id", userId)
                .limit(1);
              const biz = bizRow?.[0];
              const businessName = biz?.name || "New Business";
              const total = (s.amount_total ?? 0) / 100;
              const currency = (s.currency || "usd").toUpperCase();
              const items: string[] = ["$49/mo Pro subscription"];
              if (launchPackagePurchased) items.push("$297 Launch Package");

              const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;"><tr><td style="padding:24px;">
<p style="margin:0 0 24px;font-size:14px;font-weight:700;color:#15803D;text-transform:lowercase;">revvin</p>
<p style="margin:0 0 8px;font-size:16px;color:#111827;">💰 New paying customer</p>
<p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;"><strong>${escapeHtml(businessName)}</strong> just completed Stripe checkout.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;"><tr><td style="padding:20px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;width:140px;">Business</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(businessName)}</td></tr>
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;">Owner</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(ownerName)}</td></tr>
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;">Email</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(ownerEmail)}</td></tr>
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;">Total Charged</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${currency} $${total.toFixed(2)}</td></tr>
<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top;">Items</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${items.map(escapeHtml).join("<br/>")}</td></tr>
${launchPackagePurchased ? `<tr><td style="padding:6px 0;color:#D97706;font-size:14px;font-weight:600;">⚡ Action</td><td style="padding:6px 0;color:#D97706;font-size:14px;font-weight:600;">Schedule Launch Package onboarding call within 1 business day</td></tr>` : ""}
</table></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0 0;">
<a href="${appUrl("/__sa")}" style="display:inline-block;background:#15803D;color:#FFF;font-size:15px;font-weight:500;text-decoration:none;padding:12px 28px;border-radius:8px;">Open Admin Dashboard</a>
</td></tr></table>
</td></tr></table></td></tr></table></body></html>`;

              const subject = launchPackagePurchased
                ? `💰 New paying customer + Launch Package: ${businessName}`
                : `💰 New paying customer: ${businessName}`;

              const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${resendApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: RESEND_FROM_ADDRESS,
                  to: [ADMIN_NOTIFICATION_EMAIL],
                  reply_to: RESEND_REPLY_TO,
                  subject,
                  html,
                }),
              });
              if (!res.ok) {
                console.error("[stripe-business-webhook] payment alert email failed", res.status, await res.text());
              } else {
                console.log("[stripe-business-webhook] 💰 payment alert sent for", businessName);
              }
            }
          } catch (e) {
            console.error("[stripe-business-webhook] payment alert error", e);
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
        const custId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
        if (userId) {
          await setBiz(userId, {
            stripe_subscription_id: sub.id,
            stripe_customer_id: custId,
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
                  stripe_customer_id: customerId,
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