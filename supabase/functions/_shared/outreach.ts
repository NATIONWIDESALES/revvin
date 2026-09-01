// Shared compliance helpers for anything Revvin sends to a business's own
// customer list.
//
// Rules encoded here (do not relax without legal review):
//   - EMAIL ONLY. Revvin never auto-sends SMS to an imported list. Referral and
//     marketing texts are TCPA marketing and need prior express written consent,
//     so SMS in this product is device-native only.
//   - Every recipient is checked against suppressed_contacts (per business) and
//     suppressed_emails (platform wide) immediately before the send.
//   - Every message carries a working unsubscribe link backed by
//     unsubscribe_tokens and the handle-unsubscribe function.
//
// Campaign messages receive the sending business's complete postal address in
// the footer. Transactional and referral messages continue to use the compact
// footer because they do not use the campaign composer.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function isSuppressed(
  supabase: SupabaseClient,
  businessId: string,
  email: string,
): Promise<boolean> {
  const value = email.trim().toLowerCase();
  if (!value) return true;
  const [{ data: perBusiness }, { data: platform }] = await Promise.all([
    supabase
      .from("suppressed_contacts")
      .select("id")
      .eq("business_id", businessId)
      .eq("contact_type", "email")
      .eq("contact_value", value)
      .limit(1),
    supabase.from("suppressed_emails").select("id").eq("email", value).limit(1),
  ]);
  return Boolean(perBusiness?.length || platform?.length);
}

/** One reusable unsubscribe token per (business, email). */
export async function unsubscribeUrlFor(
  supabase: SupabaseClient,
  businessId: string,
  email: string,
): Promise<string | null> {
  const value = email.trim().toLowerCase();
  const { data: existing } = await supabase
    .from("unsubscribe_tokens")
    .select("token")
    .eq("business_id", businessId)
    .eq("contact_type", "email")
    .eq("contact_value", value)
    .limit(1);
  let token = existing?.[0]?.token as string | undefined;
  if (!token) {
    token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("unsubscribe_tokens").insert({
      token,
      business_id: businessId,
      contact_type: "email",
      contact_value: value,
    });
    if (error) return null;
  }
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/handle-unsubscribe?token=${token}`;
}

/** Postal address block required in the footer of every campaign email. */
export interface SenderAddress {
  street_address: string;
  city: string;
  postal_code: string;
  country: string;
}

export function emailFooter(
  businessName: string,
  unsubscribeUrl: string,
  address?: SenderAddress | null,
) {
  const postal = address
    ? `<p style="margin:8px 0 0;font-size:12px;color:#94a3b8">${esc(businessName)}, ${esc(address.street_address)}, ${esc(address.city)} ${esc(address.postal_code)}, ${esc(address.country)}</p>`
    : "";
  return `<p style="margin:28px 0 0;font-size:12px;color:#94a3b8">You are getting this because you are a customer of ${esc(businessName)}. <a href="${unsubscribeUrl}" style="color:#64748b">Unsubscribe</a> to stop these messages.</p>
    ${postal}
    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">Sent through Revvin on behalf of ${esc(businessName)}.</p>`;
}

export function emailShell(
  businessName: string,
  inner: string,
  unsubscribeUrl: string,
  address?: SenderAddress | null,
) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Inter',Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:13px;color:#15803d;font-weight:600;letter-spacing:.04em;text-transform:uppercase">${esc(businessName)}</div>
    ${inner}
    ${emailFooter(businessName, unsubscribeUrl, address)}
  </div>
</body></html>`;
}

/**
 * Permanently stop sending to an address for one business.
 *
 * Revvin sends every business's campaign mail from one shared domain, so a hard
 * bounce or a spam complaint has to be honoured immediately. Retrying a bad
 * address is what gets the domain blocked, and that would take down signup and
 * lead-notification email for every business on the platform.
 *
 * suppressed_contacts is the authoritative list: fn_contact_segments() and
 * isSuppressed() both read it, so writing here removes the address from every
 * future campaign. referral_contacts is marked too so the owner can see why.
 */
export async function suppressContact(
  supabase: SupabaseClient,
  businessId: string,
  email: string,
  reason: string,
): Promise<void> {
  const value = email.trim().toLowerCase();
  if (!businessId || !value) return;

  const { error } = await supabase
    .from("suppressed_contacts")
    .upsert(
      {
        business_id: businessId,
        contact_type: "email",
        contact_value: value,
        reason,
        source: "delivery_feedback",
      } as never,
      { onConflict: "business_id,contact_type,contact_value" },
    );
  if (error) {
    console.error("[outreach] suppression write failed", { businessId, reason, error });
    return;
  }

  await supabase
    .from("referral_contacts")
    .update({ status: "opted_out" } as never)
    .eq("business_id", businessId)
    .ilike("email", value);
}


export function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px">${esc(label)}</a>`;
}

/** Merge tokens available to campaign and review templates. */
export function renderTokens(
  input: string,
  tokens: Record<string, string>,
  escapeHtml: boolean,
): string {
  return String(input ?? "").replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key: string) => {
    const value = tokens[key.toLowerCase()] ?? "";
    return escapeHtml ? esc(value) : value;
  });
}
