import { loadSupabase } from "@/lib/supabaseLazy";
import { TRADES, TRADE_NEEDS, directoryRegulated } from "@/lib/directory";

export interface QuoteMatch { slug: string; name: string; city: string | null; region: string | null; is_pro: boolean; review_count: number; rating_avg: number | null; km: number }
export interface UnclaimedNearby { slug: string; name: string; city: string | null; region: string | null; phone: string | null; website: string | null; km: number }
export type Timing = "asap" | "month" | "planning";
export const TIMINGS: [Timing, string][] = [["asap", "As soon as possible"], ["month", "Within a month"], ["planning", "Just planning"]];

/** Trades a quote can be requested for: the shared list, never real estate, mortgage or insurance. */
export const QUOTE_TRADES = TRADES.map((t) => t.name).filter((n) => !directoryRegulated(n));
export const isQuoteTrade = (t: string | null | undefined) => Boolean(t && QUOTE_TRADES.includes(t));
/** "Need a roofer?" from the shared trade phrases, else "Need help with Roofing?". */
export const needLine = (trade: string) => {
  const need = TRADE_NEEDS[trade.toLowerCase()];
  return `Need ${need ?? `help with ${trade.toLowerCase()}`}? Ask up to 3 local businesses at once.`;
};

const rpc = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => {
  const db = await loadSupabase();
  const { data, error } = await db.rpc(fn as never, args as never);
  if (error) throw new Error(error.message);
  return data as T;
};
export const quoteMatches = (trade: string, lat: number, lng: number) => rpc<QuoteMatch[]>("fn_quote_match_preview", { p_trade: trade, p_lat: lat, p_lng: lng });
export const unclaimedNearby = (trade: string, lat: number, lng: number) => rpc<UnclaimedNearby[]>("fn_quote_unclaimed_nearby", { p_trade: trade, p_lat: lat, p_lng: lng });
export const quoteDemand = (trade: string, lat: number, lng: number) => rpc<number>("fn_quote_demand_count", { p_trade: trade, p_lat: lat, p_lng: lng });
export const nearestCity = (lat: number, lng: number) => rpc<string | null>("fn_directory_nearest_city", { p_lat: lat, p_lng: lng });

export interface QuoteSubmit {
  trade: string; details: string; city: string; lat: number; lng: number; name: string; email: string; phone: string;
  timing: Timing; slugs: string[]; share_later: boolean; website: string;
}
export async function submitQuotes(body: QuoteSubmit): Promise<{ ok: boolean; sent: { slug: string; name: string; city: string | null }[]; saved: boolean } | { error: string }> {
  const db = await loadSupabase();
  const { data, error } = await db.functions.invoke("marketplace-quotes", { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx?.status === 429) return { error: "rate_limited" };
    try { const j = await ctx?.json(); return { error: j?.error ?? "error" }; } catch { return { error: "error" }; }
  }
  return data;
}
