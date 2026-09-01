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
import { esc } from "./email-format.ts";

export {
  esc,
  emailFooter,
  emailShell,
  button,
  renderTokens,
} from "./email-format.ts";
export type { SenderAddress } from "./email-format.ts";

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
