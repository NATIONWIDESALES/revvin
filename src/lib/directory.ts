import { loadSupabase } from "@/lib/supabaseLazy";
import { PREVIEW_TRADES } from "@/content/previewTrades";
import { suggestedReward, type PreviewData } from "@/lib/instantPreview";
import { directoryRegulated, rewardLine, DIRECTORY_CATEGORIES, TRADES, TRADE_GROUPS, tradeInfo } from "../../supabase/functions/_shared/directory";

export { directoryRegulated, rewardLine, DIRECTORY_CATEGORIES, TRADES, TRADE_GROUPS, tradeInfo };

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
  /** Card extras loaded in one batch for claimed businesses (photo, stars). */
  extra?: { cover_url: string | null; photo_url: string | null; rating_avg: number | null; review_count: number };
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

/** Every card opens the business profile; the profile links to the referral form at /r/:slug. */
export const entryHref = (e: Pick<DirectoryEntry, "kind" | "slug">) => `/b/${e.slug}`;
export const placeLine = (e: { city: string | null; region: string | null }) =>
  [e.city, e.region?.replace(/^(US|CA)-/i, "")].filter(Boolean).join(", ");
/** The category as a trade, or null when it is "Other", empty or missing. */
export const realTrade = (category: string | null | undefined): string | null => {
  const c = (category ?? "").trim();
  return c && c.toLowerCase() !== "other" ? c : null;
};
/** "Trade · City, ST", or just the place when there is no real trade. */
export const tradePlace = (e: { category: string | null; city: string | null; region: string | null }) =>
  [realTrade(e.category), placeLine(e)].filter(Boolean).join(" · ");
/** What a referred customer needs, per trade, from the shared TRADES list. Anything missing uses "could use {Business}". */
export const TRADE_NEEDS: Record<string, string> = {
  ...Object.fromEntries(TRADES.filter((t) => t.need).map((t) => [t.name.toLowerCase(), t.need])),
  "general contractor": "a contractor",
};
export function referralSentence(name: string, category: string | null | undefined, amount: string): string {
  const need = TRADE_NEEDS[(realTrade(category) ?? "").toLowerCase()];
  const ask = need ? `Know someone who needs ${need}?` : `Know someone who could use ${name}?`;
  return `${ask} Refer them and ${name} pays you ${amount} when the job closes.`;
}
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

/* ---------- Full-screen map search (marketplace layout) ---------- */

/** Results grid columns for a panel width: 1 under 560px, 2 from 560px, 3 from 980px. */
export const panelColumns = (width: number) => (width >= 980 ? 3 : width >= 560 ? 2 : 1);

export type MapSort = "featured" | "name";
export const PAGE_SIZE = 40;

/** The reward amount a card may show ("$100"), or null. Same rules as cardReward. */
export function cardRewardAmount(e: Pick<DirectoryEntry, "kind" | "category" | "has_reward" | "reward_text">): string | null {
  if (!cardReward(e)) return null;
  const t = (e.reward_text as string).trim();
  return /^\d+(?:\.\d+)?$/.test(t) ? `$${t}` : t;
}

/** Cluster label: thousands separators below 10,000, compact form (12.4k) above. */
export function clusterLabel(n: number): string {
  if (n < 10000) return n.toLocaleString("en-US");
  if (n < 1_000_000) return `${(Math.round(n / 100) / 10).toString()}k`;
  return `${(Math.round(n / 100000) / 10).toString()}m`;
}
/** Filter groups holding only trades in `visible` (plus the current selection), in TRADES order. */
export function tradeFilterGroups(visible: ReadonlySet<string> | null, selected = ""): { group: string; trades: string[] }[] {
  return TRADE_GROUPS.map((group) => ({
    group,
    trades: TRADES.filter((t) => t.group === group && (!visible || visible.has(t.name) || t.name === selected)).map((t) => t.name),
  })).filter((g) => g.trades.length > 0);
}
/** Legacy catch-alls (Home Services, Auto) appear only when a visible listing uses them. */
export const legacyFilterTrades = (visible: ReadonlySet<string> | null, selected = "") =>
  TRADES.filter((t) => !t.group && t.name !== "Other" && (visible?.has(t.name) || t.name === selected)).map((t) => t.name);
let tradesCache: { at: number; p: Promise<Set<string>> } | null = null;
/** Trades with at least one visible listing, cached for an hour. */
export function visibleTrades(): Promise<Set<string>> {
  if (tradesCache && Date.now() - tradesCache.at < 3_600_000) return tradesCache.p;
  const p = rpc<{ category: string }[]>("fn_directory_trades", {}).then((r) => new Set(r.map((x) => x.category)));
  p.catch(() => { tradesCache = null; });
  tradesCache = { at: Date.now(), p };
  return p;
}
export const countLine = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "business" : "businesses"} in this area`;

/** Browser time zone to a nearby metro. No IP lookup; unknown zones get the continental view. */
export const TIMEZONE_VIEWS: Record<string, { lat: number; lng: number; z: number }> = {
  "America/Los_Angeles": { lat: 34.05, lng: -118.24, z: 8 },
  "America/Phoenix": { lat: 33.45, lng: -112.07, z: 8 },
  "America/Denver": { lat: 39.74, lng: -104.99, z: 8 },
  "America/Chicago": { lat: 41.88, lng: -87.63, z: 8 },
  "America/New_York": { lat: 40.71, lng: -74.01, z: 8 },
  "America/Toronto": { lat: 43.65, lng: -79.38, z: 8 },
  "America/Vancouver": { lat: 49.28, lng: -123.12, z: 8 },
  "America/Edmonton": { lat: 51.05, lng: -114.07, z: 8 },
  "America/Winnipeg": { lat: 49.9, lng: -97.14, z: 8 },
  "America/Halifax": { lat: 44.65, lng: -63.58, z: 8 },
  "America/Detroit": { lat: 42.33, lng: -83.05, z: 8 },
  "America/Boise": { lat: 43.62, lng: -116.2, z: 8 },
  "America/Anchorage": { lat: 61.22, lng: -149.9, z: 8 },
  "Pacific/Honolulu": { lat: 21.31, lng: -157.86, z: 8 },
};

export interface MarketplaceState { lat: number | null; lng: number | null; z: number | null; q: string; trade: string; rewards: boolean }

const num = (v: string | null, lim: number) => {
  if (v === null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= lim ? n : null;
};
/** Reads a shared view from the query string. Bad values are ignored. */
export function parseMarketplaceParams(search: string): MarketplaceState {
  const p = new URLSearchParams(search);
  const lat = num(p.get("lat"), 90), lng = num(p.get("lng"), 180), z = num(p.get("z"), 22);
  const ok = lat !== null && lng !== null && z !== null && z >= 0;
  const trade = p.get("trade") ?? "";
  return {
    lat: ok ? lat : null, lng: ok ? lng : null, z: ok ? z : null,
    q: (p.get("q") ?? "").slice(0, 80),
    trade: (DIRECTORY_CATEGORIES as readonly string[]).includes(trade) ? trade : "",
    rewards: p.get("rewards") === "1",
  };
}
/** Query string for a view, other parameters (utm and similar) kept. */
export function marketplaceSearch(current: string, s: MarketplaceState): string {
  const p = new URLSearchParams(current);
  for (const k of ["lat", "lng", "z", "q", "trade", "rewards"]) p.delete(k);
  if (s.lat !== null && s.lng !== null && s.z !== null) {
    p.set("lat", s.lat.toFixed(4)); p.set("lng", s.lng.toFixed(4)); p.set("z", s.z.toFixed(2));
  }
  if (s.q.trim()) p.set("q", s.q.trim());
  if (s.trade) p.set("trade", s.trade);
  if (s.rewards) p.set("rewards", "1");
  const out = p.toString();
  return out ? `?${out}` : "";
}

/** Opening view: the URL first, then the browser time zone, else null (continental view). */
export function openingView(s: MarketplaceState, timeZone: string | undefined) {
  if (s.lat !== null && s.lng !== null && s.z !== null) return { lat: s.lat, lng: s.lng, z: s.z };
  return (timeZone && TIMEZONE_VIEWS[timeZone]) || null;
}

export type MapRow = DirectoryEntry & { total_count: number };
export async function searchMap(opts: { bounds: Bounds | null; category?: string; q?: string; rewardsOnly?: boolean; sort?: MapSort; offset?: number; limit?: number }) {
  const b = opts.bounds;
  const rows = await rpc<MapRow[]>("fn_directory_map_search", {
    p_min_lat: b?.minLat ?? null, p_min_lng: b?.minLng ?? null, p_max_lat: b?.maxLat ?? null, p_max_lng: b?.maxLng ?? null,
    p_category: opts.category || null, p_q: opts.q?.trim() || null, p_rewards_only: Boolean(opts.rewardsOnly),
    p_sort: opts.sort ?? "featured", p_limit: opts.limit ?? PAGE_SIZE, p_offset: opts.offset ?? 0,
  });
  return { rows: rows ?? [], total: rows?.[0] ? Number(rows[0].total_count) : 0 };
}
export async function rewardBounds(): Promise<Bounds | null> {
  const r = (await rpc<{ min_lat: number | null; min_lng: number | null; max_lat: number | null; max_lng: number | null }[]>("fn_directory_reward_bounds", {}))?.[0];
  return r && r.min_lat !== null ? { minLat: r.min_lat, minLng: r.min_lng as number, maxLat: r.max_lat as number, maxLng: r.max_lng as number } : null;
}
export async function cityLocation(q: string): Promise<{ lat: number; lng: number } | null> {
  if (q.trim().length < 3) return null;
  const r = (await rpc<{ lat: number; lng: number }[]>("fn_directory_city", { p_q: q.trim() }))?.[0];
  return r && r.lat != null ? r : null;
}
