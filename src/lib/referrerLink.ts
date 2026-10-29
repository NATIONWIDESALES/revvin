/**
 * Personal referral links: /r/{slug}?ref={token}. The token is remembered per
 * page for 60 days so a later visit, or a home screen shortcut that opens the
 * plain page, still credits the same person.
 */
export const REF_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const KEY = (slug: string) => `revvin_ref_${slug}`;
export const isRefToken = (t: unknown): t is string => typeof t === "string" && /^[A-Za-z0-9_-]{22,64}$/.test(t);

export const personalLink = (origin: string, slug: string, token: string | null | undefined) =>
  token ? `${origin}/r/${slug}?ref=${encodeURIComponent(token)}` : `${origin}/r/${slug}`;

export function rememberRef(slug: string, token: string, now = Date.now()): void {
  if (!isRefToken(token)) return;
  try { localStorage.setItem(KEY(slug), JSON.stringify({ token, at: now })); } catch { /* storage unavailable */ }
}

export function recallRef(slug: string, now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(KEY(slug));
    if (!raw) return null;
    const { token, at } = JSON.parse(raw) as { token?: unknown; at?: unknown };
    if (!isRefToken(token) || typeof at !== "number" || now - at > REF_TTL_MS) {
      localStorage.removeItem(KEY(slug));
      return null;
    }
    return token;
  } catch { return null; }
}

export function forgetRef(slug: string): void {
  try { localStorage.removeItem(KEY(slug)); } catch { /* ignore */ }
}

/** The ?ref in the URL wins; otherwise the remembered one for this page. */
export function activeRef(slug: string, search: string, now = Date.now()): string | null {
  const fromUrl = new URLSearchParams(search).get("ref");
  if (isRefToken(fromUrl)) { rememberRef(slug, fromUrl, now); return fromUrl; }
  return recallRef(slug, now);
}

export const referrerShareText = (business: string, trade: string | null | undefined, url: string) =>
  `I use ${business}. If you need ${(trade || "their").toLowerCase()} work, use my link: ${url}. I may get a thank-you reward if you book.`;
