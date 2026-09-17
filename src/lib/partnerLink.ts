// Partner link capture.
//
// A visitor arriving with ?via=code (or ?ref=code) has the code held in a
// first-party localStorage entry named rv_partner. Last click wins. The code is
// NEVER trusted from the client: notify-business-signup revalidates it with the
// service role before attributing a business, and the click endpoint confirms
// the code belongs to an approved partner before anything is stored.

import { supabase } from "@/integrations/supabase/client";
import { ATTRIBUTION_WINDOW_DAYS } from "@/config/partners";

const STORAGE_KEY = "rv_partner";
const BROWSER_KEY = "rv_partner_browser";
const MAX_AGE_MS = ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export interface HeldPartner {
  code: string;
  clicked_at: string;
}

export function normalizeCode(raw: unknown): string | null {
  const code = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .replace(/-+$/g, "");
  return code.length >= 3 ? code : null;
}

/** The held partner click, or null when absent, malformed or outside the window. */
export function getPartnerClick(): HeldPartner | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HeldPartner;
    const code = normalizeCode(parsed?.code);
    if (!code) return null;
    const at = Date.parse(parsed?.clicked_at ?? "");
    if (!Number.isFinite(at) || Date.now() - at > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { code, clicked_at: parsed.clicked_at };
  } catch {
    return null;
  }
}

/** Last click wins. */
export function setPartnerClick(rawCode: unknown): HeldPartner | null {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const held: HeldPartner = { code, clicked_at: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(held));
  } catch {
    /* storage unavailable */
  }
  return held;
}

export function clearPartnerClick() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** A random per-browser id, used only to rate limit click counting. */
function browserId(): string {
  try {
    const existing = localStorage.getItem(BROWSER_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(BROWSER_KEY, fresh);
    return fresh;
  } catch {
    return "";
  }
}

/**
 * Reads ?via= or ?ref= from a search string. The server confirms the code
 * belongs to an approved partner and counts the click; unknown codes are
 * ignored silently and nothing is stored.
 */
export async function capturePartnerFromSearch(search?: string): Promise<string | null> {
  let code: string | null = null;
  try {
    const s = search ?? (typeof location !== "undefined" ? location.search : "");
    const params = new URLSearchParams(s);
    code = normalizeCode(params.get("via") ?? params.get("ref"));
  } catch {
    return null;
  }
  if (!code) return null;

  try {
    const { data } = await supabase.functions.invoke("partner-click", {
      body: {
        code,
        browser_id: browserId(),
        landed_path: typeof location !== "undefined" ? location.pathname : null,
      },
    });
    if (data?.valid !== true) return null;
  } catch {
    return null;
  }

  setPartnerClick(code);
  return code;
}
