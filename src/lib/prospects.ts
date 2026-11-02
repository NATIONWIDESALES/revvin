import { supabase } from "@/integrations/supabase/client";
import type { PreviewData } from "@/lib/instantPreview";
import { suggestedReward } from "@/lib/instantPreview";

/** Safe fields the public preview page renders, returned by fn_prospect_view. */
export interface ProspectPreview {
  name: string;
  trade: string;
  city: string | null;
  region: string | null;
  country: string;
  suggested_reward: number | null;
  headline_override: string | null;
  status: string;
}

/** Full row shape for the CRM Prospects tab (admin and sales roles only). */
export interface ProspectRow {
  id: string;
  code: string;
  name: string;
  trade: string;
  city: string | null;
  region: string | null;
  country: string;
  phone: string | null;
  website: string | null;
  google_place_id: string | null;
  suggested_reward: number | null;
  headline_override: string | null;
  created_by: string | null;
  status: "draft" | "sent" | "viewed" | "claimed" | "removed" | "expired";
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
  claimed_business_id: string | null;
  removed_at: string | null;
  expires_at: string;
  notes: string | null;
  created_at: string;
}

export const previewUrl = (code: string) => `${window.location.origin}/preview/${code}`;

/** Loads the preview and counts the view (bots are filtered server-side). */
export async function loadProspectPreview(code: string): Promise<{ prospect: ProspectPreview | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("prospect-view", { body: { code } });
  if (error) {
    const msg = String(error.message ?? "");
    return { prospect: null, error: msg.includes("rate_limited") ? "rate_limited" : "not_found" };
  }
  const prospect = (data as { prospect?: ProspectPreview } | null)?.prospect ?? null;
  return { prospect, error: prospect ? null : "not_found" };
}

export async function removeProspectPage(code: string): Promise<boolean> {
  const { error } = await supabase.rpc("fn_prospect_remove", { p_code: code } as never);
  return !error;
}

/** Marks the prospect claimed after the owner signs up through the preview. */
export async function claimProspectPage(code: string, businessId: string): Promise<boolean> {
  const { error } = await supabase.rpc("fn_prospect_claim", { p_code: code, p_business_id: businessId } as never);
  return !error;
}

/** Builds the signup handoff for a prospect claim, same mechanism as the homepage instant preview. */
export function prospectClaimPreview(p: ProspectPreview, code: string, callerId: string | null, reward: number, headline: string | null): PreviewData {
  return {
    name: p.name,
    trade: p.trade,
    reward,
    landing_path: `/preview/${code}`,
    utm_source: "outbound",
    utm_medium: "prebuilt",
    city: p.city ?? undefined,
    region: p.region ?? undefined,
    country: p.country ?? undefined,
    prospect_code: code,
    caller_id: callerId ?? undefined,
  };
}

export const prospectReward = (p: ProspectPreview) => p.suggested_reward ?? suggestedReward(p.trade);
