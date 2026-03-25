import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Tremendous Webhook Handler
 * 
 * Receives webhook events from Tremendous and updates payout/referral state.
 * Endpoint: POST /functions/v1/tremendous-webhook
 * 
 * No auth header required — verification is via HMAC signature.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("TREMENDOUS_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("TREMENDOUS_WEBHOOK_SECRET not configured");
    return new Response("OK", { status: 200 }); // Don't retry
  }

  // Read raw body for signature verification
  const rawBody = await req.text();

  // Verify webhook signature
  const signatureHeader = req.headers.get("Tremendous-Webhook-Signature");
  if (signatureHeader) {
    const [, receivedSignature] = signatureHeader.split("=", 2);
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (receivedSignature !== expectedSignature) {
      console.error("Webhook signature mismatch");
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("Invalid JSON body");
    return new Response("Invalid JSON", { status: 400 });
  }

  const { event, uuid: webhookUuid, payload: eventPayload } = payload;
  const resourceId = eventPayload?.resource?.id;
  const resourceType = eventPayload?.resource?.type;

  console.log(`Tremendous webhook: ${event} | resource: ${resourceType}/${resourceId} | uuid: ${webhookUuid}`);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Deduplicate — check if we've already processed this webhook
  const { data: existing } = await admin
    .from("tremendous_webhook_log")
    .select("uuid")
    .eq("uuid", webhookUuid)
    .maybeSingle();

  if (existing) {
    console.log(`Webhook ${webhookUuid} already processed, skipping`);
    return new Response("OK", { status: 200 });
  }

  // Log the webhook
  await admin.from("tremendous_webhook_log").insert({
    uuid: webhookUuid,
    event,
    resource_id: resourceId,
    resource_type: resourceType,
    payload: payload,
  });

  // Find the payout record by Tremendous reward/order ID
  let payoutRecord: any = null;

  if (resourceId && resourceType === "rewards") {
    // Primary: direct column lookup on tremendous_reward_id
    const { data } = await admin
      .from("payouts")
      .select("*")
      .eq("tremendous_reward_id", resourceId)
      .maybeSingle();
    payoutRecord = data;

    // Fallback: audit_log scan (covers payouts created before the column existed)
    if (!payoutRecord) {
      const { data: auditEntries } = await admin
        .from("audit_log")
        .select("payload")
        .eq("event_type", "payout_tremendous_sent")
        .limit(100);

      for (const entry of auditEntries || []) {
        if (entry.payload?.tremendous_reward_id === resourceId) {
          const payoutId = entry.payload?.payout_id;
          if (payoutId) {
            const { data: fallbackData } = await admin.from("payouts").select("*").eq("id", payoutId).single();
            payoutRecord = fallbackData;
          }
          break;
        }
      }
    }
  } else if (resourceId && resourceType === "orders") {
    const { data } = await admin
      .from("payouts")
      .select("*")
      .eq("provider_reference", resourceId)
      .maybeSingle();
    payoutRecord = data;
  }

  // Handle events
  switch (event) {
    case "REWARDS.FLAGGED": {
      console.log(`⚠️ Reward ${resourceId} flagged for fraud review`);
      if (payoutRecord) {
        await admin.from("payouts").update({
          status: "fraud_review",
          notes: `Flagged by Tremendous fraud detection at ${new Date().toISOString()}`,
          updated_at: new Date().toISOString(),
        }).eq("id", payoutRecord.id);

        await admin.from("audit_log").insert({
          referral_id: payoutRecord.referral_id,
          actor_id: payoutRecord.referrer_id,
          event_type: "payout_fraud_flagged",
          payload: { tremendous_event: event, resource_id: resourceId },
        });
      }
      break;
    }

    case "FRAUD_REVIEWS.RELEASED": {
      console.log(`✅ Reward ${resourceId} released from fraud review`);
      if (payoutRecord) {
        await admin.from("payouts").update({
          status: "processing",
          notes: `Cleared by Tremendous fraud review at ${new Date().toISOString()}`,
          updated_at: new Date().toISOString(),
        }).eq("id", payoutRecord.id);

        await admin.from("audit_log").insert({
          referral_id: payoutRecord.referral_id,
          actor_id: payoutRecord.referrer_id,
          event_type: "payout_fraud_cleared",
          payload: { tremendous_event: event, resource_id: resourceId },
        });
      }
      break;
    }

    case "FRAUD_REVIEWS.BLOCKED": {
      console.log(`🚫 Reward ${resourceId} blocked by fraud review`);
      if (payoutRecord) {
        await admin.from("payouts").update({
          status: "failed",
          notes: `Blocked by Tremendous fraud detection at ${new Date().toISOString()}`,
          updated_at: new Date().toISOString(),
        }).eq("id", payoutRecord.id);

        // Update referral payout_status
        if (payoutRecord.referral_id) {
          await admin.from("referrals").update({
            payout_status: "pending",
          }).eq("id", payoutRecord.referral_id);
        }

        await admin.from("audit_log").insert({
          referral_id: payoutRecord.referral_id,
          actor_id: payoutRecord.referrer_id,
          event_type: "payout_fraud_blocked",
          payload: { tremendous_event: event, resource_id: resourceId },
        });

        // Notify admin
        await admin.from("notifications_log").insert({
          type: "fraud_blocked",
          recipient_email: "info@revvin.co",
          recipient_name: "Admin",
          subject: `Payout blocked by Tremendous fraud review`,
          body: `Payout ${payoutRecord.id} for $${payoutRecord.amount} was blocked. Referral: ${payoutRecord.referral_id}`,
          status: "logged",
        });
      }
      break;
    }

    case "REWARDS.DELIVERY.SUCCEEDED": {
      console.log(`📬 Reward ${resourceId} delivered successfully`);
      if (payoutRecord) {
        await admin.from("payouts").update({
          status: "paid",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", payoutRecord.id);

        // Update referral payout_status to paid
        if (payoutRecord.referral_id) {
          await admin.from("referrals").update({
            payout_status: "paid",
          }).eq("id", payoutRecord.referral_id);
        }

        await admin.from("audit_log").insert({
          referral_id: payoutRecord.referral_id,
          actor_id: payoutRecord.referrer_id,
          event_type: "payout_delivered",
          payload: { tremendous_event: event, resource_id: resourceId },
        });
      }
      break;
    }

    case "REWARDS.DELIVERY.FAILED": {
      console.log(`❌ Reward ${resourceId} delivery failed`);
      if (payoutRecord) {
        await admin.from("payouts").update({
          notes: `Delivery failed at ${new Date().toISOString()}. May need to resend.`,
          updated_at: new Date().toISOString(),
        }).eq("id", payoutRecord.id);

        await admin.from("audit_log").insert({
          referral_id: payoutRecord.referral_id,
          actor_id: payoutRecord.referrer_id,
          event_type: "payout_delivery_failed",
          payload: { tremendous_event: event, resource_id: resourceId },
        });
      }
      break;
    }

    case "REWARDS.CANCELED": {
      console.log(`🚫 Reward ${resourceId} canceled`);
      if (payoutRecord) {
        await admin.from("payouts").update({
          status: "failed",
          notes: `Reward canceled by Tremendous at ${new Date().toISOString()}`,
          updated_at: new Date().toISOString(),
        }).eq("id", payoutRecord.id);

        if (payoutRecord.referral_id) {
          await admin.from("referrals").update({
            payout_status: "pending",
          }).eq("id", payoutRecord.referral_id);
        }

        await admin.from("audit_log").insert({
          referral_id: payoutRecord.referral_id,
          actor_id: payoutRecord.referrer_id,
          event_type: "payout_canceled",
          payload: { tremendous_event: event, resource_id: resourceId },
        });
      }
      break;
    }

    default:
      console.log(`Unhandled Tremendous event: ${event}`);
  }

  // Always return 200 so Tremendous doesn't retry
  return new Response("OK", { status: 200 });
});
