import { loadSupabase } from "@/lib/supabaseLazy";
import { PREVIEW_TRADES } from "@/content/previewTrades";
import { suggestedReward, type PreviewData } from "@/lib/instantPreview";
import { directoryRegulated, rewardLine, DIRECTORY_CATEGORIES } from "../../supabase/functions/_shared/directory";

export { directoryRegulated, rewardLine, DIRECTORY_CATEGORIES };

/** One public directory row from fn_directory_search. Safe columns only. */
export interface DirectoryEntry {
  kind: "business" | "listing";
  slug: string;
  name: string;
  category: string;
  city: string | null;
  region: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  is_pro: boolean;
  is_verified: boolean;
  has_reward: boolean;
  reward_text: string | null;
  logo_url: string | null;
}
export interface DirectoryCluster { lat: number; lng: number; count: number }
export interface Bounds { minLat: number; minLng: number; maxLat: number; maxLng: number }

export interface DirectoryListing {
  slug: string; name: string; category: string; city: string | null; region: string | null; country: string;
  postal_code: string | null; lat: number | null; lng: number | null; phone: string | null; website: string | null;
  source: string; source_license: string | null; status: "unclaimed" | "claimed"; claimed_slug: string | null;
}

/** Continental US and Canada. */
export const DEFAULT_VIEW = { bounds: [[-135, 22], [-55, 62]] as [[number, number], [number, number]] };
/** Below this zoom the map shows numbered clusters; at or above it, pins. */
export const PIN_ZOOM = 8;

/**
 * The reward a card may show, or null. Regulated categories never show a
 * reward (also enforced by the database), and the line always says the
 * business pays it.
 */
export function cardReward(e: Pick<DirectoryEntry, "kind" | "category" | "has_reward" | "reward_text">): string | null {
  if (e.kind !== "business" || !e.has_reward || !e.reward_text || directoryRegulated(e.category)) return null;
  const amount = /^\d+(?:\.\d+)?$/.test(e.reward_text.trim()) ? `$${e.reward_text.trim()}` : e.reward_text.trim();
  return rewardLine(amount);
}

export const entryHref = (e: Pick<DirectoryEntry, "kind" | "slug">) => (e.kind === "business" ? `/r/${e.slug}` : `/b/${e.slug}`);
export const placeLine = (e: { city: string | null; region: string | null }) => [e.city, e.region].filter(Boolean).join(", ");
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

const rpc = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => {
  const db = await loadSupabase();
  const { data, error } = await db.rpc(fn as never, args as never);
  if (error) throw new Error(error.message);
  return data as T;
};

export function searchDirectory(opts: { bounds?: Bounds | null; category?: string; q?: string; limit?: number }) {
  const b = opts.bounds;
  return rpc<DirectoryEntry[]>("fn_directory_search", {
    p_min_lat: b?.minLat ?? null, p_min_lng: b?.minLng ?? null, p_max_lat: b?.maxLat ?? null, p_max_lng: b?.maxLng ?? null,
    p_category: opts.category || null, p_q: opts.q?.trim() || null, p_limit: opts.limit ?? 200,
  });
}
export function directoryClusters(bounds: Bounds, zoom: number, category?: string) {
  return rpc<DirectoryCluster[]>("fn_directory_clusters", {
    p_min_lat: bounds.minLat, p_min_lng: bounds.minLng, p_max_lat: bounds.maxLat, p_max_lng: bounds.maxLng,
    p_zoom: Math.round(zoom), p_category: category || null,
  });
}
export async function loadListing(slug: string): Promise<DirectoryListing | null> {
  const rows = await rpc<DirectoryListing[]>("fn_directory_listing", { p_slug: slug });
  return rows?.[0] ?? null;
}
export function requestRemoval(slug: string, name: string, email: string, reason: string) {
  return rpc<boolean>("fn_directory_request_removal", { p_slug: slug, p_name: name, p_email: email, p_reason: reason });
}

/** Marks a listing claimed after its owner signs up from /b/:slug. The server checks the signup came from that page. */
export async function claimListing(slug: string, businessId: string) {
  try { await rpc<boolean>("fn_directory_claim", { p_slug: slug, p_business_id: businessId }); return true; }
  catch (e) { console.error("listing claim failed", (e as Error).message); return false; }
}

/** The listing slug a signup came from, read from the stored landing path. */
export const claimedListingSlug = (landingPath: string | undefined) => landingPath?.match(/^\/b\/([a-z0-9-]{1,100})$/)?.[1] ?? null;

/** Signup handoff for "Claim it free", the same mechanism as a prospect claim. */
export function listingClaimPreview(l: DirectoryListing): PreviewData {
  const trade = PREVIEW_TRADES.find((t) => t.label.toLowerCase() === l.category.toLowerCase())?.slug ?? "other";
  return {
    name: l.name, trade, reward: suggestedReward(trade), landing_path: `/b/${l.slug}`,
    utm_source: "marketplace", utm_medium: "claim",
    city: l.city ?? undefined, region: l.region ?? undefined, country: l.country,
  };
}
