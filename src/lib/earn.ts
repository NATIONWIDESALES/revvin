import { supabase } from "@/integrations/supabase/client";

/** Public Earn data. Every call goes through a narrow server function. */
export interface EarnMetro { name: string; slug: string }
export interface EarnBusiness { slug: string; name: string; trade: string | null; city: string | null; reward: string | null }

const rpc = (fn: string, args?: Record<string, unknown>) => supabase.rpc(fn as never, args as never);

export async function liveMetros(): Promise<EarnMetro[]> {
  const { data } = await rpc("fn_earn_metros");
  return ((data as unknown) as EarnMetro[]) ?? [];
}
export async function metroInfo(slug: string): Promise<(EarnMetro & { is_live: boolean }) | null> {
  const { data } = await rpc("fn_earn_metro", { p_slug: slug });
  return (((data as unknown) as (EarnMetro & { is_live: boolean })[]) ?? [])[0] ?? null;
}
export async function metroBusinesses(slug: string): Promise<EarnBusiness[]> {
  const { data } = await rpc("fn_earn_businesses", { p_metro_slug: slug });
  return ((data as unknown) as EarnBusiness[]) ?? [];
}
export async function waitingCount(slug: string): Promise<number | null> {
  const { data } = await rpc("fn_earn_waiting_count", { p_metro_slug: slug });
  const n = Number(data);
  return n >= 1 ? n : null;
}
export async function businessMetro(slug: string): Promise<string | null> {
  const { data } = await rpc("fn_business_metro", { p_slug: slug });
  return typeof data === "string" && data ? data : null;
}

const LINK_ERRORS: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  invalid_name: "Enter your name.",
  rate_limited: "That is a lot of links in a short time. Try again in a little while.",
  not_on_earn: "This business is not taking Earn referrals right now.",
};
export async function getEarnLink(businessSlug: string, name: string, email: string): Promise<{ token: string | null; error: string | null }> {
  const { data, error } = await rpc("fn_earn_get_link", { p_business_slug: businessSlug, p_name: name.trim(), p_email: email.trim() });
  if (error) {
    const code = Object.keys(LINK_ERRORS).find((k) => String(error.message).includes(k));
    return { token: null, error: code ? LINK_ERRORS[code] : "We could not make your link. Try again in a moment." };
  }
  return { token: typeof data === "string" ? data : null, error: null };
}

export async function submitEarnLead(input: {
  email: string; source: "earn_waitlist" | "business_invite"; city?: string; metroSlug?: string; businessName?: string; businessContact?: string;
}): Promise<boolean> {
  const { error } = await rpc("fn_submit_earn_lead", {
    p_email: input.email, p_source: input.source, p_city: input.city ?? null, p_metro_slug: input.metroSlug ?? null,
    p_business_name: input.businessName ?? null, p_business_contact: input.businessContact ?? null,
  });
  return !error;
}

/** Pending partner application from an Earn invite, through the existing partner-apply flow. */
export async function applyAsEarnPartner(name: string, email: string, invitedBusiness: string): Promise<boolean> {
  const { error } = await supabase.functions.invoke("partner-apply", {
    body: {
      name, email, country: "Not given", channels: "Earn invite", audience_size: "Under 1,000",
      promo_plan: `Invited ${invitedBusiness.slice(0, 120)}`, payout_method: "paypal", agreed_to_terms: true, source: "earn_invite",
    },
  });
  return !error;
}

export const earnTitle = (metro: string) => `Get paid for referrals in ${metro} | Revvin`;
export const earnDescription = (metro: string) =>
  `Local businesses in ${metro} that pay a reward when your referral turns into a job. Get your own link to each one, free.`;
