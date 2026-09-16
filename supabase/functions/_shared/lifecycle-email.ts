import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { TEMPLATES } from "./transactional-email-templates/registry.ts";
import { templateCategory } from "./lifecycle-categories.ts";
import { sendEmailViaGateway } from "./resend-gateway.ts";
import { isSuppressed, unsubscribeUrlFor } from "./outreach.ts";
import { LIFECYCLE_FROM, LIFECYCLE_REPLY_TO, REVVIN_POSTAL_ADDRESS } from "./lifecycle-config.ts";
import { promoAllowed } from "./lifecycle-rules.ts";

/**
 * Renders a registered template and sends it through the existing Resend
 * gateway. Suppression is checked immediately before the send and every message
 * carries a working unsubscribe link.
 *
 * Promotional templates carry Revvin's postal address and their own opt-out
 * link, which sets businesses.promo_emails_opt_out. A setup unsubscribe writes
 * suppressed_contacts, which stops promotional email too.
 */
export interface LifecycleSendInput {
  supabase: any;
  businessId: string;
  templateName: string;
  to: string;
  data?: Record<string, unknown>;
  idempotencyKey?: string;
  /** Read from businesses as they are today; used for the promo gate. */
  plan?: string | null;
  subscriptionStatus?: string | null;
  promoOptOut?: boolean | null;
}

export type LifecycleSendResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: string };

/** One reusable promo opt-out token per (business, email). */
export async function promoUnsubscribeUrlFor(
  supabase: any,
  businessId: string,
  email: string,
): Promise<string | null> {
  const value = String(email).trim().toLowerCase();
  const { data: existing } = await supabase
    .from("unsubscribe_tokens")
    .select("token")
    .eq("business_id", businessId)
    .eq("contact_type", "promo")
    .eq("contact_value", value)
    .limit(1);
  let token = existing?.[0]?.token as string | undefined;
  if (!token) {
    token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("unsubscribe_tokens").insert({
      token,
      business_id: businessId,
      contact_type: "promo",
      contact_value: value,
    });
    if (error) return null;
  }
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/handle-unsubscribe?token=${token}`;
}

export async function sendLifecycleEmail(input: LifecycleSendInput): Promise<LifecycleSendResult> {
  const { supabase, businessId, templateName, data = {} } = input;
  const to = String(input.to || "").trim();
  if (!to) return { sent: false, reason: "no_recipient" };

  const entry = TEMPLATES[templateName];
  if (!entry) return { sent: false, reason: "unknown_template" };

  const category = templateCategory(templateName);
  if (category === "promo") {
    const gate = promoAllowed({
      postalAddress: REVVIN_POSTAL_ADDRESS,
      plan: input.plan,
      subscriptionStatus: input.subscriptionStatus,
      promoOptOut: input.promoOptOut,
    });
    if (!gate.allowed) return { sent: false, reason: gate.reason ?? "promo_blocked" };
  }

  if (await isSuppressed(supabase, businessId, to)) {
    return { sent: false, reason: "recipient_suppressed" };
  }

  const unsubscribeUrl = category === "promo"
    ? await promoUnsubscribeUrlFor(supabase, businessId, to)
    : await unsubscribeUrlFor(supabase, businessId, to);
  if (!unsubscribeUrl) return { sent: false, reason: "unsubscribe_token_failed" };

  const templateData: Record<string, unknown> = { ...data, unsubscribeUrl };
  if (category === "promo") templateData.postalAddress = REVVIN_POSTAL_ADDRESS;

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
    metadata: { business_id: businessId, lifecycle: true, category },
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
