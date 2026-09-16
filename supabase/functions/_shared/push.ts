import webpush from "npm:web-push@3.6.7";

/**
 * Web push sending, shared by the send-push function and the new-lead worker.
 * Standard Web Push with VAPID and aes128gcm, which is what Chrome, Edge,
 * Firefox, Android and iOS 16.4 and later (installed to the home screen) speak.
 * The private key never leaves the backend.
 */

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  business_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushOutcome = "sent" | "gone" | "failed";

/**
 * 404 and 410 mean the browser threw the subscription away: that device is
 * permanently gone and its row must be disabled, never retried. Anything else
 * is a transient failure that only increments the failure count.
 */
export const classifyPushFailure = (statusCode: number | undefined): PushOutcome =>
  statusCode === 404 || statusCode === 410 ? "gone" : "failed";

export const vapidConfigured = () =>
  Boolean(Deno.env.get("VAPID_PUBLIC_KEY") && Deno.env.get("VAPID_PRIVATE_KEY"));

let configured = false;
function configureVapid() {
  if (configured) return;
  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") || "mailto:info@revvin.co",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );
  configured = true;
}

async function logAttempt(
  db: any,
  row: PushSubscriptionRow,
  payload: PushPayload,
  status: PushOutcome,
  statusCode: number | null,
  error: string | null,
) {
  const { error: logErr } = await db.from("push_send_log").insert({
    subscription_id: row.id,
    user_id: row.user_id,
    business_id: row.business_id,
    endpoint: row.endpoint,
    title: payload.title,
    url: payload.url ?? null,
    tag: payload.tag ?? null,
    status,
    status_code: statusCode,
    error: error ? error.slice(0, 500) : null,
  });
  if (logErr) console.error("[push] log insert failed", logErr.message);
}

/** Sends one payload to one device and records the outcome. */
export async function sendToSubscription(
  db: any,
  row: PushSubscriptionRow,
  payload: PushPayload,
): Promise<PushOutcome> {
  configureVapid();
  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/dashboard",
        tag: payload.tag ?? "revvin",
      }),
      { TTL: 60 * 60 * 12 },
    );
    await db
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString(), failed_count: 0 })
      .eq("id", row.id);
    await logAttempt(db, row, payload, "sent", 201, null);
    return "sent";
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    const outcome = classifyPushFailure(statusCode);
    const message = String((err as Error)?.message ?? err);
    if (outcome === "gone") {
      await db
        .from("push_subscriptions")
        .update({ disabled_at: new Date().toISOString() })
        .eq("id", row.id);
    } else {
      const { data } = await db
        .from("push_subscriptions")
        .select("failed_count")
        .eq("id", row.id)
        .limit(1);
      const next = Number(data?.[0]?.failed_count ?? 0) + 1;
      await db
        .from("push_subscriptions")
        .update({ failed_count: next, disabled_at: next >= 10 ? new Date().toISOString() : null })
        .eq("id", row.id);
    }
    await logAttempt(db, row, payload, outcome, statusCode ?? null, message);
    return outcome;
  }
}

export interface PushTarget {
  user_id?: string | null;
  business_id?: string | null;
}

/** Sends to every active device of a user or a business. */
export async function sendPush(
  db: any,
  target: PushTarget,
  payload: PushPayload,
): Promise<{ sent: number; gone: number; failed: number; devices: number }> {
  const totals = { sent: 0, gone: 0, failed: 0, devices: 0 };
  if (!vapidConfigured()) {
    console.error("[push] VAPID keys are not configured, nothing sent");
    return totals;
  }
  let query = db
    .from("push_subscriptions")
    .select("id,user_id,business_id,endpoint,p256dh,auth")
    .is("disabled_at", null);
  if (target.user_id) query = query.eq("user_id", target.user_id);
  else if (target.business_id) query = query.eq("business_id", target.business_id);
  else return totals;

  const { data, error } = await query.limit(50);
  if (error) {
    console.error("[push] subscription read failed", error.message);
    return totals;
  }
  const rows = (data ?? []) as PushSubscriptionRow[];
  totals.devices = rows.length;
  for (const row of rows) {
    const outcome = await sendToSubscription(db, row, payload);
    totals[outcome]++;
  }
  return totals;
}
