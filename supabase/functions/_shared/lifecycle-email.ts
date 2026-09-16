import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { TEMPLATES } from "./transactional-email-templates/registry.ts";
import { sendEmailViaGateway } from "./resend-gateway.ts";
import { isSuppressed, unsubscribeUrlFor } from "./outreach.ts";
import { LIFECYCLE_FROM, LIFECYCLE_REPLY_TO } from "./lifecycle-config.ts";

/**
 * Renders a registered template and sends it through the existing Resend
 * gateway. Suppression is checked immediately before the send and every message
 * carries a working unsubscribe link.
 */
export interface LifecycleSendInput {
  supabase: any;
  businessId: string;
  templateName: string;
  to: string;
  data?: Record<string, unknown>;
  idempotencyKey?: string;
}

export type LifecycleSendResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: string };

export async function sendLifecycleEmail(input: LifecycleSendInput): Promise<LifecycleSendResult> {
  const { supabase, businessId, templateName, data = {} } = input;
  const to = String(input.to || "").trim();
  if (!to) return { sent: false, reason: "no_recipient" };

  const entry = TEMPLATES[templateName];
  if (!entry) return { sent: false, reason: "unknown_template" };

  if (await isSuppressed(supabase, businessId, to)) {
    return { sent: false, reason: "recipient_suppressed" };
  }

  const unsubscribeUrl = await unsubscribeUrlFor(supabase, businessId, to);
  if (!unsubscribeUrl) return { sent: false, reason: "unsubscribe_token_failed" };

  const templateData = { ...data, unsubscribeUrl };
  const html = await renderAsync(React.createElement(entry.component, templateData));
  const subject = typeof entry.subject === "function" ? entry.subject(templateData) : entry.subject;

  const result = await sendEmailViaGateway({
    from: LIFECYCLE_FROM,
    to,
    reply_to: LIFECYCLE_REPLY_TO,
    subject,
    html,
    idempotencyKey: input.idempotencyKey,
  });

  await supabase.from("email_send_log").insert({
    message_id: result.id || input.idempotencyKey || `${templateName}-${businessId}`,
    template_name: templateName,
    recipient_email: to,
    status: result.success ? "sent" : "failed",
    error_message: result.success ? null : String(result.error || "send failed").slice(0, 500),
    metadata: { business_id: businessId, lifecycle: true },
  });

  if (!result.success) {
    console.error("[lifecycle-email] send failed", templateName, result.error);
    return { sent: false, reason: "provider_error" };
  }
  return { sent: true, id: result.id ?? null };
}

/** Recipient for owner-facing mail: business email, else the auth account email. */
export async function ownerEmail(supabase: any, biz: { id: string; user_id?: string | null; business_email?: string | null }): Promise<string | null> {
  if (biz.business_email) return String(biz.business_email);
  const { data: settingsRows } = await supabase
    .from("notification_settings")
    .select("notification_email")
    .eq("business_id", biz.id)
    .limit(1);
  const fromSettings = settingsRows?.[0]?.notification_email;
  if (fromSettings) return String(fromSettings);
  if (biz.user_id) {
    const { data } = await supabase.auth.admin.getUserById(biz.user_id);
    return data?.user?.email ?? null;
  }
  return null;
}
