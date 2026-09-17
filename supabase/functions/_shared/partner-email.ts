// Partner Program email sending.
//
// Reuses the existing path: templates come from the transactional registry, the
// send goes through the Resend gateway with the same "Karm at Revvin" sender,
// the global suppression list is honoured, and every attempt is written to
// email_send_log.
//
// Partner email is transactional, so it carries no promotional opt-out link.
// The business-scoped unsubscribe tokens do not apply here: a partner is not a
// business owner's customer.

import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { TEMPLATES } from "./transactional-email-templates/registry.ts";
import { sendEmailViaGateway } from "./resend-gateway.ts";
import { LIFECYCLE_FROM, LIFECYCLE_REPLY_TO } from "./lifecycle-config.ts";

export interface PartnerEmailInput {
  supabase: any;
  templateName: string;
  to: string;
  data?: Record<string, unknown>;
  idempotencyKey?: string;
  partnerId?: string | null;
}

export type PartnerEmailResult = { sent: true; id: string | null } | { sent: false; reason: string };

async function suppressed(supabase: any, email: string): Promise<boolean> {
  const { data } = await supabase
    .from("suppressed_emails")
    .select("email")
    .eq("email", email)
    .limit(1);
  return Boolean(data?.length);
}

export async function sendPartnerEmail(input: PartnerEmailInput): Promise<PartnerEmailResult> {
  const entry = TEMPLATES[input.templateName];
  if (!entry) return { sent: false, reason: "unknown_template" };

  const to = String(entry.to || input.to || "").trim().toLowerCase();
  if (!to) return { sent: false, reason: "no_recipient" };
  if (await suppressed(input.supabase, to)) {
    return { sent: false, reason: "recipient_suppressed" };
  }

  const data = input.data ?? {};
  const html = await renderAsync(React.createElement(entry.component, data));
  const subject = typeof entry.subject === "function" ? entry.subject(data) : entry.subject;

  const result = await sendEmailViaGateway({
    from: LIFECYCLE_FROM,
    to,
    reply_to: LIFECYCLE_REPLY_TO,
    subject,
    html,
    idempotencyKey: input.idempotencyKey,
  });

  await input.supabase.from("email_send_log").insert({
    message_id: result.id || input.idempotencyKey || `${input.templateName}-${to}`,
    template_name: input.templateName,
    recipient_email: to,
    status: result.success ? "sent" : "failed",
    error_message: result.success ? null : String(result.error || "send failed").slice(0, 500),
    metadata: { partner_id: input.partnerId ?? null, partner_program: true },
  });

  if (!result.success) {
    console.error("[partner-email] send failed", input.templateName, result.error);
    return { sent: false, reason: "provider_error" };
  }
  return { sent: true, id: result.id ?? null };
}
