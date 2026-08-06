/**
 * Invite code handling.
 *
 * A code is held locally between landing on /i/:code (or /signup?invite=CODE)
 * and actually paying, which can be days later. The code is NEVER validated on
 * the client: create-business-checkout revalidates it with the service role and
 * claims a use atomically. Locally held codes are hints only.
 */
const STORAGE_KEY = "revvin_invite_code";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const MAX_LEN = 40;

type Held = { code: string; at: string };

function normalize(raw: string): string | null {
  const code = raw.trim().toUpperCase().slice(0, MAX_LEN);
  if (!code || !/^[A-Z0-9_-]+$/.test(code)) return null;
  return code;
}

/** The held invite code, or null when absent, malformed, or expired. */
export function getInviteCode(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Held;
    if (!parsed?.code) return null;
    const ts = Date.parse(parsed.at ?? "");
    if (Number.isFinite(ts) && Date.now() - ts > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return normalize(parsed.code);
  } catch {
    return null;
  }
}

/** Store a code. A newer invite replaces an older one. */
export function setInviteCode(raw: string): string | null {
  const code = normalize(raw);
  if (!code) return null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, at: new Date().toISOString() } satisfies Held));
  } catch { /* storage unavailable */ }
  return code;
}

export function clearInviteCode() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

/** Capture ?invite=CODE from a search string, if present. */
export function captureInviteFromSearch(search?: string): string | null {
  try {
    const s = search ?? (typeof location !== "undefined" ? location.search : "");
    const value = new URLSearchParams(s).get("invite");
    return value ? setInviteCode(value) : null;
  } catch {
    return null;
  }
}

/** Plain-English terms of the invite offer. Used verbatim in the UI. */
export const INVITE_TERMS =
  "Invite applied at checkout: 3 months free, then $17/month USD. Your card is saved at checkout and charged $17/month from month four unless you cancel first.";
