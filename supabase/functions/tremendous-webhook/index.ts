import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Tremendous Webhook Handler
 *
 * Receives webhook events from Tremendous and updates payout/referral state.
 * Endpoint: POST /functions/v1/tremendous-webhook
 *
 * No auth header required — verification is via HMAC signature.
 *
 * Logging: Every log line is emitted as a single-line JSON object with a
 * stable shape so the edge_function_logs tool / grep can filter by
 * `request_id`, `stage`, `level`, `event`, or `db_op`. Every DB call is
 * wrapped in `dbCall(...)` which captures Postgres `error.message`,
 * `error.code`, `error.details`, and `error.hint` and emits an `db_error`
 * log line plus an entry in `notifications_log` so admins are alerted.
 */

type Level = "info" | "warn" | "error";

const ALERT_EMAIL = "info@revvin.co";

function newRequestId(): string {
  return crypto.randomUUID();
}

function log(
  level: Level,
  requestId: string,
  stage: string,
  message: string,
  extra: Record<string, unknown> = {}
): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    request_id: requestId,
    fn: "tremendous-webhook",
    stage,
    message,
    ...extra,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

interface DbCallContext {
  admin: SupabaseClient;
  requestId: string;
  op: string; // e.g. "payouts.update", "audit_log.insert"
  webhookUuid?: string;
  event?: string;
  resourceId?: string;
  payoutId?: string;
  referralId?: string;
  alertOnFailure?: boolean; // default true
}

/**
 * Wrap a Supabase DB call so that:
 *   1. Any returned `{ error }` is logged as a structured `db_error` line
 *      with the exact Postgres message/code/details/hint.
 *   2. Any thrown exception is caught and logged the same way.
 *   3. On failure, an admin alert row is inserted into `notifications_log`
 *      (best-effort — never throws).
 *
 * Returns `{ data, error }` (error is normalized to a plain object).
 */
async function dbCall<T>(
  ctx: DbCallContext,
  exec: () => PromiseLike<{ data: T | null; error: unknown }>
): Promise<{ data: T | null; error: unknown }> {
  const alertOnFailure = ctx.alertOnFailure !== false;
  try {
    const { data, error } = await exec();
    if (error) {
      const errObj = normalizeError(error);
      log("error", ctx.requestId, "db_error", `DB op failed: ${ctx.op}`, {
        db_op: ctx.op,
        webhook_uuid: ctx.webhookUuid,
        event: ctx.event,
        resource_id: ctx.resourceId,
        payout_id: ctx.payoutId,
        referral_id: ctx.referralId,
        error: errObj,
      });
      if (alertOnFailure) {
        await emitAdminAlert(ctx, errObj.message);
      }
      return { data: null, error };
    }
    return { data, error: null };
  } catch (thrown) {
    const errObj = normalizeError(thrown);
    log("error", ctx.requestId, "db_exception", `DB op threw: ${ctx.op}`, {
      db_op: ctx.op,
      webhook_uuid: ctx.webhookUuid,
      event: ctx.event,
      resource_id: ctx.resourceId,
      payout_id: ctx.payoutId,
      referral_id: ctx.referralId,
      error: errObj,
    });
    if (alertOnFailure) {
      await emitAdminAlert(ctx, errObj.message);
    }
    return { data: null, error: thrown };
  }
}

function normalizeError(err: unknown): {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  name?: string;
} {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    return {
      message: typeof e.message === "string" ? e.message : String(err),
      code: typeof e.code === "string" ? e.code : undefined,
      details: typeof e.details === "string" ? e.details : undefined,
      hint: typeof e.hint === "string" ? e.hint : undefined,
      name: typeof e.name === "string" ? e.name : undefined,
    };
  }
  return { message: String(err) };
}

/**
 * Best-effort admin alert. Never throws; if alert insert itself fails we
 * just log it (no recursion / no further alerting).
 */
async function emitAdminAlert(
  ctx: DbCallContext,
  errorMessage: string
): Promise<void> {
  try {
    const subject = `tremendous-webhook DB failure: ${ctx.op}`;
    const body = [
      `Op: ${ctx.op}`,
      `Webhook UUID: ${ctx.webhookUuid ?? "n/a"}`,
      `Event: ${ctx.event ?? "n/a"}`,
      `Resource ID: ${ctx.resourceId ?? "n/a"}`,
      `Payout ID: ${ctx.payoutId ?? "n/a"}`,
      `Referral ID: ${ctx.referralId ?? "n/a"}`,
      `Request ID: ${ctx.requestId}`,
      ``,
      `Error: ${errorMessage}`,
    ].join("\n");

    const { error } = await ctx.admin.from("notifications_log").insert({
      type: "tremendous_webhook_failure",
      recipient_email: ALERT_EMAIL,
      recipient_name: "Admin",
      subject,
      body,
      status: "logged",
    });
    if (error) {
      log("error", ctx.requestId, "alert_failed", "notifications_log insert failed", {
        db_op: "notifications_log.insert",
        error: normalizeError(error),
      });
    }
  } catch (thrown) {
    log("error", ctx.requestId, "alert_exception", "notifications_log insert threw", {
      error: normalizeError(thrown),
    });
  }
}

Deno.serve(async (req) => {
  const requestId = newRequestId();
  const startedAt = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  if (req.method !== "POST") {
    log("warn", requestId, "method_not_allowed", `Method ${req.method} rejected`);
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("TREMENDOUS_WEBHOOK_SECRET");
  if (!webhookSecret) {
    log("error", requestId, "config_missing", "TREMENDOUS_WEBHOOK_SECRET not configured");
    return new Response("OK", { status: 200 }); // Don't retry
  }

  // Read raw body for signature verification
  const rawBody = await req.text();

  // Verify webhook signature
  const signatureHeader = req.headers.get("Tremendous-Webhook-Signature");
  if (signatureHeader) {
    try {
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
        log("error", requestId, "signature_mismatch", "Webhook signature mismatch", {
          received_prefix: (receivedSignature ?? "").slice(0, 8),
        });
        return new Response("Invalid signature", { status: 401 });
      }
    } catch (thrown) {
      log("error", requestId, "signature_verify_exception", "Signature verification threw", {
        error: normalizeError(thrown),
      });
      return new Response("Invalid signature", { status: 401 });
    }
  } else {
    log("warn", requestId, "signature_missing", "No Tremendous-Webhook-Signature header present");
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (thrown) {
    log("error", requestId, "invalid_json", "Failed to parse request body as JSON", {
      error: normalizeError(thrown),
      body_prefix: rawBody.slice(0, 200),
      body_length: rawBody.length,
    });
    return new Response("Invalid JSON", { status: 400 });
  }

  const { event, uuid: webhookUuid, payload: eventPayload } = payload ?? {};
  const resourceId: string | undefined = eventPayload?.resource?.id;
  const resourceType: string | undefined = eventPayload?.resource?.type;

  log("info", requestId, "received", "Tremendous webhook received", {
    event,
    webhook_uuid: webhookUuid,
    resource_type: resourceType,
    resource_id: resourceId,
  });

  if (!event || !webhookUuid) {
    log("error", requestId, "payload_invalid", "Webhook payload missing event or uuid", {
      has_event: Boolean(event),
      has_uuid: Boolean(webhookUuid),
      keys: payload && typeof payload === "object" ? Object.keys(payload) : [],
    });
    return new Response("OK", { status: 200 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    log("error", requestId, "config_missing", "Supabase env vars missing", {
      has_url: Boolean(supabaseUrl),
      has_service_role_key: Boolean(serviceRoleKey),
    });
    return new Response("OK", { status: 200 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const baseCtx = {
    admin,
    requestId,
    webhookUuid,
    event,
    resourceId,
  };

  // Deduplicate — check if we've already processed this webhook
  const { data: existing, error: dedupeError } = await dbCall<{ uuid: string }>(
    { ...baseCtx, op: "tremendous_webhook_log.select_dedupe", alertOnFailure: false },
    () =>
      admin
        .from("tremendous_webhook_log")
        .select("uuid")
        .eq("uuid", webhookUuid)
        .maybeSingle()
  );

  if (dedupeError) {
    // Soft fail — proceed anyway, but the log already captured the error.
    log("warn", requestId, "dedupe_unavailable", "Continuing without dedupe check");
  } else if (existing) {
    log("info", requestId, "duplicate_skip", `Webhook ${webhookUuid} already processed`, {
      webhook_uuid: webhookUuid,
    });
    return new Response("OK", { status: 200 });
  }

  // Log the webhook
  await dbCall(
    { ...baseCtx, op: "tremendous_webhook_log.insert" },
    () =>
      admin.from("tremendous_webhook_log").insert({
        uuid: webhookUuid,
        event,
        resource_id: resourceId,
        resource_type: resourceType,
        payload: payload,
      }) as unknown as Promise<{ data: null; error: unknown }>
  );

  // Find the payout record by Tremendous reward/order ID
  let payoutRecord: any = null;

  if (resourceId && resourceType === "rewards") {
    const { data } = await dbCall<any>(
      { ...baseCtx, op: "payouts.select_by_tremendous_reward_id", alertOnFailure: false },
      () =>
        admin
          .from("payouts")
          .select("*")
          .eq("tremendous_reward_id", resourceId)
          .maybeSingle()
    );
    payoutRecord = data;

    // Fallback: audit_log scan (covers payouts created before the column existed)
    if (!payoutRecord) {
      const { data: auditEntries } = await dbCall<any[]>(
        { ...baseCtx, op: "audit_log.select_payout_tremendous_sent", alertOnFailure: false },
        () =>
          admin
            .from("audit_log")
            .select("payload")
            .eq("event_type", "payout_tremendous_sent")
            .limit(100)
      );

      for (const entry of auditEntries || []) {
        if (entry.payload?.tremendous_reward_id === resourceId) {
          const payoutId = entry.payload?.payout_id;
          if (payoutId) {
            const { data: fallbackData } = await dbCall<any>(
              { ...baseCtx, op: "payouts.select_by_id_fallback", payoutId, alertOnFailure: false },
              () => admin.from("payouts").select("*").eq("id", payoutId).single()
            );
            payoutRecord = fallbackData;
          }
          break;
        }
      }
    }
  } else if (resourceId && resourceType === "orders") {
    const { data } = await dbCall<any>(
      { ...baseCtx, op: "payouts.select_by_provider_reference", alertOnFailure: false },
      () =>
        admin
          .from("payouts")
          .select("*")
          .eq("provider_reference", resourceId)
          .maybeSingle()
    );
    payoutRecord = data;
  }

  if (!payoutRecord) {
    log("warn", requestId, "payout_not_found", "No payout record matched this webhook", {
      event,
      resource_type: resourceType,
      resource_id: resourceId,
    });
  }

  const payoutCtx = payoutRecord
    ? {
        ...baseCtx,
        payoutId: payoutRecord.id,
        referralId: payoutRecord.referral_id,
      }
    : baseCtx;

  // Handle events
  switch (event) {
    case "REWARDS.FLAGGED": {
      log("warn", requestId, "rewards_flagged", `Reward ${resourceId} flagged for fraud review`, {
        payout_id: payoutRecord?.id,
      });
      if (payoutRecord) {
        await dbCall(
          { ...payoutCtx, op: "payouts.update_fraud_review" },
          () =>
            admin
              .from("payouts")
              .update({
                status: "fraud_review",
                notes: `Flagged by Tremendous fraud detection at ${new Date().toISOString()}`,
                updated_at: new Date().toISOString(),
              })
              .eq("id", payoutRecord.id) as unknown as Promise<{ data: null; error: unknown }>
        );

        await dbCall(
          { ...payoutCtx, op: "audit_log.insert_payout_fraud_flagged" },
          () =>
            admin.from("audit_log").insert({
              referral_id: payoutRecord.referral_id,
              actor_id: payoutRecord.referrer_id,
              event_type: "payout_fraud_flagged",
              payload: { tremendous_event: event, resource_id: resourceId },
            }) as unknown as Promise<{ data: null; error: unknown }>
        );
      }
      break;
    }

    case "FRAUD_REVIEWS.RELEASED": {
      log("info", requestId, "fraud_released", `Reward ${resourceId} released from fraud review`, {
        payout_id: payoutRecord?.id,
      });
      if (payoutRecord) {
        await dbCall(
          { ...payoutCtx, op: "payouts.update_fraud_released" },
          () =>
            admin
              .from("payouts")
              .update({
                status: "processing",
                notes: `Cleared by Tremendous fraud review at ${new Date().toISOString()}`,
                updated_at: new Date().toISOString(),
              })
              .eq("id", payoutRecord.id) as unknown as Promise<{ data: null; error: unknown }>
        );

        await dbCall(
          { ...payoutCtx, op: "audit_log.insert_payout_fraud_cleared" },
          () =>
            admin.from("audit_log").insert({
              referral_id: payoutRecord.referral_id,
              actor_id: payoutRecord.referrer_id,
              event_type: "payout_fraud_cleared",
              payload: { tremendous_event: event, resource_id: resourceId },
            }) as unknown as Promise<{ data: null; error: unknown }>
        );
      }
      break;
    }

    case "FRAUD_REVIEWS.BLOCKED": {
      log("error", requestId, "fraud_blocked", `Reward ${resourceId} blocked by fraud review`, {
        payout_id: payoutRecord?.id,
      });
      if (payoutRecord) {
        await dbCall(
          { ...payoutCtx, op: "payouts.update_fraud_blocked" },
          () =>
            admin
              .from("payouts")
              .update({
                status: "failed",
                notes: `Blocked by Tremendous fraud detection at ${new Date().toISOString()}`,
                updated_at: new Date().toISOString(),
              })
              .eq("id", payoutRecord.id) as unknown as Promise<{ data: null; error: unknown }>
        );

        if (payoutRecord.referral_id) {
          await dbCall(
            { ...payoutCtx, op: "referrals.update_payout_status_pending_blocked" },
            () =>
              admin
                .from("referrals")
                .update({ payout_status: "pending" })
                .eq("id", payoutRecord.referral_id) as unknown as Promise<{ data: null; error: unknown }>
          );
        }

        await dbCall(
          { ...payoutCtx, op: "audit_log.insert_payout_fraud_blocked" },
          () =>
            admin.from("audit_log").insert({
              referral_id: payoutRecord.referral_id,
              actor_id: payoutRecord.referrer_id,
              event_type: "payout_fraud_blocked",
              payload: { tremendous_event: event, resource_id: resourceId },
            }) as unknown as Promise<{ data: null; error: unknown }>
        );

        // Notify admin (this is a business alert, not a failure alert).
        await dbCall(
          { ...payoutCtx, op: "notifications_log.insert_fraud_blocked" },
          () =>
            admin.from("notifications_log").insert({
              type: "fraud_blocked",
              recipient_email: ALERT_EMAIL,
              recipient_name: "Admin",
              subject: `Payout blocked by Tremendous fraud review`,
              body: `Payout ${payoutRecord.id} for $${payoutRecord.amount} was blocked. Referral: ${payoutRecord.referral_id}`,
              status: "logged",
            }) as unknown as Promise<{ data: null; error: unknown }>
        );
      }
      break;
    }

    case "REWARDS.DELIVERY.SUCCEEDED": {
      log("info", requestId, "delivery_succeeded", `Reward ${resourceId} delivered`, {
        payout_id: payoutRecord?.id,
      });
      if (payoutRecord) {
        await dbCall(
          { ...payoutCtx, op: "payouts.update_paid" },
          () =>
            admin
              .from("payouts")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", payoutRecord.id) as unknown as Promise<{ data: null; error: unknown }>
        );

        if (payoutRecord.referral_id) {
          await dbCall(
            { ...payoutCtx, op: "referrals.update_payout_status_paid" },
            () =>
              admin
                .from("referrals")
                .update({ payout_status: "paid" })
                .eq("id", payoutRecord.referral_id) as unknown as Promise<{ data: null; error: unknown }>
          );
        }

        await dbCall(
          { ...payoutCtx, op: "audit_log.insert_payout_delivered" },
          () =>
            admin.from("audit_log").insert({
              referral_id: payoutRecord.referral_id,
              actor_id: payoutRecord.referrer_id,
              event_type: "payout_delivered",
              payload: { tremendous_event: event, resource_id: resourceId },
            }) as unknown as Promise<{ data: null; error: unknown }>
        );
      }
      break;
    }

    case "REWARDS.DELIVERY.FAILED": {
      log("error", requestId, "delivery_failed", `Reward ${resourceId} delivery failed`, {
        payout_id: payoutRecord?.id,
      });
      if (payoutRecord) {
        await dbCall(
          { ...payoutCtx, op: "payouts.update_delivery_failed_notes" },
          () =>
            admin
              .from("payouts")
              .update({
                notes: `Delivery failed at ${new Date().toISOString()}. May need to resend.`,
                updated_at: new Date().toISOString(),
              })
              .eq("id", payoutRecord.id) as unknown as Promise<{ data: null; error: unknown }>
        );

        await dbCall(
          { ...payoutCtx, op: "audit_log.insert_payout_delivery_failed" },
          () =>
            admin.from("audit_log").insert({
              referral_id: payoutRecord.referral_id,
              actor_id: payoutRecord.referrer_id,
              event_type: "payout_delivery_failed",
              payload: { tremendous_event: event, resource_id: resourceId },
            }) as unknown as Promise<{ data: null; error: unknown }>
        );
      }
      break;
    }

    case "REWARDS.CANCELED": {
      log("warn", requestId, "rewards_canceled", `Reward ${resourceId} canceled`, {
        payout_id: payoutRecord?.id,
      });
      if (payoutRecord) {
        await dbCall(
          { ...payoutCtx, op: "payouts.update_canceled" },
          () =>
            admin
              .from("payouts")
              .update({
                status: "failed",
                notes: `Reward canceled by Tremendous at ${new Date().toISOString()}`,
                updated_at: new Date().toISOString(),
              })
              .eq("id", payoutRecord.id) as unknown as Promise<{ data: null; error: unknown }>
        );

        if (payoutRecord.referral_id) {
          await dbCall(
            { ...payoutCtx, op: "referrals.update_payout_status_pending_canceled" },
            () =>
              admin
                .from("referrals")
                .update({ payout_status: "pending" })
                .eq("id", payoutRecord.referral_id) as unknown as Promise<{ data: null; error: unknown }>
          );
        }

        await dbCall(
          { ...payoutCtx, op: "audit_log.insert_payout_canceled" },
          () =>
            admin.from("audit_log").insert({
              referral_id: payoutRecord.referral_id,
              actor_id: payoutRecord.referrer_id,
              event_type: "payout_canceled",
              payload: { tremendous_event: event, resource_id: resourceId },
            }) as unknown as Promise<{ data: null; error: unknown }>
        );
      }
      break;
    }

    default:
      log("warn", requestId, "event_unhandled", `Unhandled Tremendous event: ${event}`, { event });
  }

  log("info", requestId, "done", "Webhook processed", {
    event,
    webhook_uuid: webhookUuid,
    duration_ms: Date.now() - startedAt,
    payout_matched: Boolean(payoutRecord),
  });

  // Always return 200 so Tremendous doesn't retry
  return new Response("OK", { status: 200 });
});
