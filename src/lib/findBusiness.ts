import type { DirectoryCluster } from "@/lib/directory";

export const FIND_MIN_CHARS = 3;
export interface FindRow { id: string; slug: string; name: string; category: string; city: string | null; region: string | null; claimed: boolean }

/** Homepage band line. The number always comes from the database; without it, no number. */
export function bandCountLine(count: number | null): string {
  const lead = count && count > 0 ? `${count.toLocaleString("en-US")} local businesses` : "Thousands of local businesses";
  return `${lead} across the US and Canada are listed. Find yours and claim it free, or add it in a minute.`;
}

/** Largest clusters placed as percentages inside the map box. */
export function clusterSpots(clusters: DirectoryCluster[], bounds: [[number, number], [number, number]], max = 8) {
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  const top = [...clusters].filter((c) => c.count > 0).sort((a, b) => b.count - a.count).slice(0, max);
  const big = top[0]?.count ?? 1;
  return top.map((c) => ({
    count: c.count,
    x: Math.min(92, Math.max(8, ((c.lng - minLng) / (maxLng - minLng)) * 100)),
    y: Math.min(90, Math.max(10, ((maxLat - c.lat) / (maxLat - minLat)) * 100)),
    size: Math.round(30 + 20 * Math.sqrt(c.count / big)),
  }));
}

/** Session-cached value with a time limit, so the homepage asks at most once an hour. */
export async function cachedValue<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  try {
    const hit = JSON.parse(localStorage.getItem(key) ?? "null");
    if (hit && Date.now() - hit.at < ttlMs) return hit.v as T;
  } catch { /* ignore */ }
  const v = await load();
  try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), v })); } catch { /* ignore */ }
  return v;
}
