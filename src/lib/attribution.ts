/**
 * First-touch UTM / click-id attribution.
 *
 * PRIVACY: only a fixed whitelist of campaign parameters is ever read. Arbitrary
 * query params can carry personal data, so they are ignored entirely.
 */
export const ATTRIBUTION_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
] as const;

export type AttributionParam = (typeof ATTRIBUTION_PARAMS)[number];

export type Attribution = Partial<Record<AttributionParam, string>> & {
  first_touch_at?: string;
};

const STORAGE_KEY = "revvin_attribution";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const MAX_VALUE_LEN = 200;

/** Read whitelisted params from a search string. Returns null if none present. */
export function parseAttribution(search: string): Attribution | null {
  try {
    const params = new URLSearchParams(search);
    const out: Attribution = {};
    let found = false;
    for (const key of ATTRIBUTION_PARAMS) {
      const value = params.get(key);
      if (value && value.trim()) {
        out[key] = value.trim().slice(0, MAX_VALUE_LEN);
        found = true;
      }
    }
    return found ? out : null;
  } catch {
    return null;
  }
}

/** Stored first-touch attribution, or null when absent or expired. */
export function getAttribution(): Attribution | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Attribution;
    if (!parsed || typeof parsed !== "object") return null;
    const ts = parsed.first_touch_at ? Date.parse(parsed.first_touch_at) : NaN;
    if (Number.isFinite(ts) && Date.now() - ts > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Capture attribution from the current URL. FIRST TOUCH WINS: an existing,
 * unexpired stored set is never overwritten by a later visit.
 */
export function captureAttribution(search?: string): Attribution | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const existing = getAttribution();
    if (existing) return existing;

    const s =
      search ?? (typeof location !== "undefined" ? location.search : "");
    const found = parseAttribution(s);
    if (!found) return null;

    const record: Attribution = {
      ...found,
      first_touch_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}