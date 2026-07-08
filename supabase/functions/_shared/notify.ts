// Single notify() entry point. Centralizes:
//   1. Per-business preference checking
//   2. In-app notification row (notifications)
//   3. Audit row (notifications_log)
//   4. Email send via Resend
//   5. Stub for future SMS/push channels (no-op today)
//
// All callers must pass a service-role Supabase client.

import { RESEND_FROM_ADDRESS, RESEND_REPLY_TO } from "./app-config.ts";
import { sendEmailViaGateway } from "./resend-gateway.ts";

export type NotifyChannel = "new_lead" | "closed_deal";

export interface NotifyInput {
  supabase: any;
  businessId: string;
  channel: NotifyChannel;
  // In-app
  inApp: {
    title: string;
    body: string;
    type: string;
    referralId?: string | null;
  };
  // Email
  email: {
    subject: string;
    html: string;
    replyTo?: string;
    idempotencyKey?: string;
  };
  // Reserved for future SMS/push body. No SMS provider added here.
  sms?: { body: string };
}

export interface NotifyResult {
  ok: boolean;
  emailStatus: "sent" | "failed" | "skipped_preference" | "skipped_no_email" | "skipped_no_resend";
  inAppStatus: "created" | "skipped";
  reason?: string;
}

export async function notify(input: NotifyInput): Promise<NotifyResult> {
  const { supabase, businessId, channel, inApp, email } = input;

  // 1. Resolve business + owner
  const { data: bizRows } = await supabase
    .from("businesses")
    .select("id, name, user_id, business_email")
    .eq("id", businessId)
    .limit(1);
  const biz = bizRows?.[0];
  if (!biz) return { ok: false, emailStatus: "skipped_no_email", inAppStatus: "skipped", reason: "business_not_found" };

  // 2. Load preferences (defaults to ON if no row)
  const { data: settingsRows } = await supabase
    .from("notification_settings")
    .select("email_notifications_enabled, email_on_new_lead, email_on_closed_deal, notification_email")
    .eq("business_id", businessId)
    .limit(1);
  const settings = settingsRows?.[0] ?? null;

  const masterEmailOn = settings?.email_notifications_enabled !== false;
  const channelOn =
    channel === "new_lead"
      ? settings?.email_on_new_lead !== false
      : settings?.email_on_closed_deal !== false;

  // 3. In-app notification (always created, independent of email prefs)
  let inAppStatus: NotifyResult["inAppStatus"] = "skipped";
  if (biz.user_id) {
    const { error: inAppErr } = await supabase.from("notifications").insert({
      user_id: biz.user_id,
      title: inApp.title,
      body: inApp.body,
      type: inApp.type,
      referral_id: inApp.referralId ?? null,
    });
    if (!inAppErr) inAppStatus = "created";
    else console.warn("[notify] in-app insert failed", inAppErr);
  }

  // 4. Resolve recipient email
  let toEmail: string | null = settings?.notification_email || biz.business_email || null;
  if (!toEmail && biz.user_id) {
    const { data: ownerData } = await supabase.auth.admin.getUserById(biz.user_id);
    toEmail = ownerData?.user?.email ?? null;
  }

  // 5. Email gating
  if (!masterEmailOn || !channelOn) {
    return { ok: true, emailStatus: "skipped_preference", inAppStatus };
  }
  if (!toEmail) {
    return { ok: true, emailStatus: "skipped_no_email", inAppStatus };
  }

  const idempotencyKey = email.idempotencyKey ?? `${channel}-${businessId}-${Date.now()}`;

  const result = await sendEmailViaGateway({
    from: RESEND_FROM_ADDRESS,
    to: toEmail,
    reply_to: email.replyTo || RESEND_REPLY_TO,
    subject: email.subject,
    html: email.html,
    idempotencyKey,
  });

  const status = result.success ? "sent" : "failed";

  await supabase.from("notifications_log").insert({
    type: channel,
    recipient_email: toEmail,
    recipient_name: biz.name,
    subject: email.subject,
    body: email.html,
    status,
  });

  if (!result.success) console.error("[notify] gateway send failed", result.error);

  return {
    ok: result.success,
    emailStatus: result.success ? "sent" : "failed",
    inAppStatus,
  };
}

// Reserved for future SMS provider integration. Intentionally no-op today.
export async function notifyViaSms(_args: { businessId: string; body: string }): Promise<void> {
  // SMS not implemented in this iteration. Add provider here when ready.
  return;
}