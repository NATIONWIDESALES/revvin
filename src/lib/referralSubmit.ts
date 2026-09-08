import { supabase } from "@/integrations/supabase/client";

/**
 * Guest referral submission.
 *
 * The browser never inserts into `leads` and never reads it back. It calls the
 * narrowly scoped `fn_submit_public_referral` RPC, which resolves the business
 * from the public slug server-side, validates the input, checks consent,
 * generates the receipt token and returns only this caller's own receipt.
 *
 * Idempotency is keyed on a request id that this module generates once per real
 * submission and keeps for retries of that submission. The request id is NOT the
 * receipt token and is never used to look anything up by the prospect's phone or
 * email, so a retry can only ever replay its own receipt.
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
  /** True when the server replayed the receipt for this same request id. */
  replay: boolean;
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
  // Deliberately generic: the server will not say whose submission it clashed
  // with, and the visitor's fix is the same either way.
  submission_conflict: "Something changed while we were saving that. Please reload the page and send it again.",
  invalid_request_id: "Something changed while we were saving that. Please reload the page and send it again.",
};

export function referralSubmitMessage(raw: unknown): string | null {
  const message = typeof raw === "string" ? raw : String((raw as { message?: string })?.message ?? "");
  for (const [code, copy] of Object.entries(RPC_MESSAGES)) {
    if (message.includes(code)) return copy;
  }
  return null;
}

const REQUEST_KEY_PREFIX = "revvin_referral_request_";
const inMemoryRequestIds = new Map<string, string>();

/** 24 cryptographically random URL-safe chars. */
export function newRequestId(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else throw new Error("Secure referral submission requires a secure browser context.");
  let out = "";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/**
 * One request id per (page, visitor) submission attempt, held across a retry,
 * a refresh and a network failure. Cleared once the submission has succeeded so
 * a genuinely new referral gets a new id.
 */
export function referralRequestId(slug: string): string {
  const key = `${REQUEST_KEY_PREFIX}${slug}`;
  const memoryId = inMemoryRequestIds.get(key);
  if (memoryId) return memoryId;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing && /^[A-Za-z0-9_-]{24,64}$/.test(existing)) {
      inMemoryRequestIds.set(key, existing);
      return existing;
    }
  } catch { /* Keep retries stable in memory when storage is unavailable. */ }
  const fresh = newRequestId();
  inMemoryRequestIds.set(key, fresh);
  try { sessionStorage.setItem(key, fresh); } catch { /* Reload persistence is unavailable. */ }
  return fresh;
}

export function clearReferralRequestId(slug: string): void {
  inMemoryRequestIds.delete(`${REQUEST_KEY_PREFIX}${slug}`);
  try {
    sessionStorage.removeItem(`${REQUEST_KEY_PREFIX}${slug}`);
  } catch {
    /* ignore */
  }
}

export async function submitPublicReferral(
  input: ReferralSubmitInput,
): Promise<{ receipt: ReferralReceipt | null; error: unknown }> {
  let requestId: string;
  try { requestId = referralRequestId(input.slug); }
  catch (error) { return { receipt: null, error }; }
  const { data, error } = await supabase.rpc("fn_submit_public_referral" as never, {
    p_request_id: requestId,
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
  const receipt = (data as unknown as ReferralReceipt) ?? null;
  // The submission is settled, so the next referral from this device starts a
  // new request id rather than replaying this receipt.
  if (receipt) clearReferralRequestId(input.slug);
  return { receipt, error: null };
}
