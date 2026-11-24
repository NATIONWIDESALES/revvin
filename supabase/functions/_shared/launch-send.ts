// Builds and queues one referral launch email through the existing
// campaign_emails queue. Shared by send-campaign (first ask) and
// process-campaign-sends (follow-ups) so both carry the same From, Reply-To,
// unsubscribe link and postal footer.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import { appUrl, RESEND_FROM_ADDRESS } from "./app-config.ts";
import { customerFromAddress, customerReplyTo, emailShell, esc, unsubscribeUrlFor } from "./outreach.ts";
import {
  firstNameOf,
  LAUNCH_BUTTON_LABEL,
  launchLink,
  newClickToken,
  renderLaunchText,
} from "./referral-launch.ts";

export interface LaunchBusiness {
  id: string;
  name: string;
  slug: string;
  offer_amount: string | null;
  business_email: string | null;
  street_address: string;
  city: string;
  postal_code: string;
  country: string;
}

export interface LaunchRecipient { contact_id: string; name: string; email: string; referrer_id: string; referrer_token: string }

function paragraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6">${p.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

/** Find or create the recipient's personal referrer record, exactly like the manual ask. */
// deno-lint-ignore no-explicit-any
export async function ensureReferrer(supabase: SupabaseClient<any, any, any>, businessId: string, contact: { id: string; name: string; email: string; phone?: string | null; referrer_id?: string | null }) {
  if (contact.referrer_id) {
    const { data } = await supabase.from("referrers").select("id, token").eq("id", contact.referrer_id).limit(1);
    if (data?.[0]) return data[0] as { id: string; token: string };
  }
  const { data, error } = await supabase.rpc("fn_upsert_referrer", { p_business_id: businessId, p_name: contact.name, p_email: contact.email, p_phone: contact.phone ?? null });
  const row = (Array.isArray(data) ? data[0] : data) as { id: string; token: string } | null;
  if (error || !row?.id) return null;
  await supabase.from("referral_contacts").update({ referrer_id: row.id }).eq("id", contact.id).is("referrer_id", null);
  return row;
}

/** Insert the send row for this step and enqueue its email. Returns a skip reason on failure. */
export async function queueLaunchEmail(
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  args: { campaignId: string; step: 0 | 1 | 2; business: LaunchBusiness; recipient: LaunchRecipient; subjectTemplate: string; bodyTemplate: string },
): Promise<{ ok: true; sendId: string } | { ok: false; reason: string }> {
  const { campaignId, step, business, recipient } = args;
  const tokenUrl = await unsubscribeUrlFor(supabase, business.id, recipient.email);
  if (!tokenUrl) return { ok: false, reason: "unsubscribe_token_failed" };
  const clickToken = newClickToken(() => crypto.getRandomValues(new Uint8Array(8)));
  const { data: sendRow, error } = await supabase
    .from("campaign_sends")
    .insert({
      campaign_id: campaignId,
      contact_id: recipient.contact_id,
      business_id: business.id,
      recipient_email: recipient.email,
      status: "pending",
      step,
      referrer_id: recipient.referrer_id,
      click_token: clickToken,
    })
    .select("id")
    .single();
  // A unique violation means this recipient already has this step: never send it twice.
  if (error || !sendRow) return { ok: false, reason: error?.code === "23505" ? "step_already_sent" : "campaign_send_record_failed" };

  const link = launchLink(appUrl(""), business.slug, recipient.referrer_token, clickToken);
  const tokens = { first_name: firstNameOf(recipient.name), business_name: business.name, reward: business.offer_amount, link };
  const subject = renderLaunchText(args.subjectTemplate, tokens).slice(0, 200);
  const body = esc(renderLaunchText(args.bodyTemplate, tokens));
  const inner = `<h1 style="margin:8px 0 14px;font-size:22px;line-height:1.3">${esc(subject)}</h1>${paragraphs(body)}<p style="margin:18px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px">${LAUNCH_BUTTON_LABEL}</a></p>`;
  const messageId = `campaign-${campaignId}-${sendRow.id}`;
  const { error: queueError } = await supabase.rpc("enqueue_email", {
    queue_name: "campaign_emails",
    payload: {
      campaign_id: campaignId,
      business_id: business.id,
      campaign_send_id: sendRow.id,
      message_id: messageId,
      idempotency_key: messageId,
      queued_at: new Date().toISOString(),
      to: recipient.email,
      from: customerFromAddress(business.name, RESEND_FROM_ADDRESS),
      reply_to: customerReplyTo(business.business_email),
      subject,
      html: emailShell(business.name, inner, tokenUrl, {
        street_address: business.street_address, city: business.city, postal_code: business.postal_code, country: business.country,
      }),
      label: "referral-launch",
      purpose: "marketing",
      unsubscribe_token: tokenUrl.split("token=")[1] || null,
    },
  });
  if (queueError) {
    await supabase.from("campaign_sends").update({ status: "failed", failure_reason: "queue_enqueue_failed" }).eq("id", sendRow.id);
    return { ok: false, reason: "queue_enqueue_failed" };
  }
  return { ok: true, sendId: sendRow.id };
}
