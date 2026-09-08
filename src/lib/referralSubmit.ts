import { supabase } from "@/integrations/supabase/client";

/**
 * Guest referral submission.
 *
 * The browser never inserts into `leads` and never reads it back. It calls the
 * narrowly scoped `fn_submit_public_referral` RPC, which resolves the business
 * from the public slug server-side, validates the input, checks consent,
 * generates the status token and returns only a limited receipt.
 */
export interface ReferralSubmitInput {
  slug: string;
  referrer_name: string;
  referrer_email: string;
  referrer_phone?: string;
  lead_name: string;
  lead_phone: string;
  lead_email?: string;
  lead_need: string;
  relationship_to_lead?: string;
  consent_given: boolean;
}

export interface ReferralReceipt {
  lead_id: string;
  status_token: string;
  business_name: string;
  duplicate: boolean;
}

/** Codes raised by the RPC, mapped to copy a visitor can act on. */
const RPC_MESSAGES: Record<string, string> = {
  consent_required: "Please confirm you have permission to share this person's details.",
  page_not_live: "This referral page is not accepting referrals right now.",
  invalid_referrer_name: "Please enter your full name.",
  invalid_referrer_email: "Please enter a valid email address for yourself.",
  invalid_lead_name: "Please enter the name of the person you are referring.",
  invalid_lead_phone: "Please enter a valid phone number for the person you are referring.",
  invalid_lead_email: "That email address for the lead does not look right.",
  invalid_lead_need: "Please say a little about what they need.",
  invalid_input: "One of those answers is too long. Please shorten it and try again.",
  rate_limited: "That is a lot of referrals in a short time. Please try again in a little while.",
};

export function referralSubmitMessage(raw: unknown): string | null {
  const message = typeof raw === "string" ? raw : String((raw as { message?: string })?.message ?? "");
  for (const [code, copy] of Object.entries(RPC_MESSAGES)) {
    if (message.includes(code)) return copy;
  }
  return null;
}

export async function submitPublicReferral(
  input: ReferralSubmitInput,
): Promise<{ receipt: ReferralReceipt | null; error: unknown }> {
  const { data, error } = await supabase.rpc("fn_submit_public_referral" as never, {
    p_slug: input.slug,
    p_referrer_name: input.referrer_name.trim(),
    p_referrer_email: input.referrer_email.trim(),
    p_referrer_phone: input.referrer_phone?.trim() || null,
    p_lead_name: input.lead_name.trim(),
    p_lead_phone: input.lead_phone.trim(),
    p_lead_email: input.lead_email?.trim() || null,
    p_lead_need: input.lead_need.trim(),
    p_relationship: input.relationship_to_lead?.trim() || null,
    p_consent: input.consent_given,
  } as never);

  if (error) return { receipt: null, error };
  return { receipt: (data as unknown as ReferralReceipt) ?? null, error: null };
}
