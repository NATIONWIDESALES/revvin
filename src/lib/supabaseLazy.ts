import type { supabase as SupabaseClient } from "@/integrations/supabase/client";

/**
 * The backend client, loaded on first use instead of at app start. Marketing
 * pages only need it when a visitor submits a form or is signed in, so the
 * ~45 KB client stays out of their initial download.
 */
let pending: Promise<typeof SupabaseClient> | null = null;
let resolved: typeof SupabaseClient | null = null;

export function loadSupabase(): Promise<typeof SupabaseClient> {
  pending ??= import("@/integrations/supabase/client").then((m) => (resolved = m.supabase));
  return pending;
}

/** Marketing routes, which must not fetch the backend client on first load. */
export const MARKETING_PREFIXES = [
  "/how-it-works",
  "/pricing",
  "/about",
  "/earn",
  "/referral-program",
  "/referral-programs",
  "/guides",
  "/compare",
  "/tools",
  "/partners",
  "/sample",
  "/ask-kit",
  "/privacy",
  "/terms",
  "/referral-agreement",
];

export function isMarketingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/partners/dashboard") || /^\/earn\/[^/]+/.test(pathname)) return false;
  return MARKETING_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * True when this browser may already hold a signed-in session, or is landing
 * from a sign-in redirect. Only then does a marketing page need the client.
 */
export function mayHaveSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // The editor preview keeps the session with the editor, not in this frame.
    if (window.parent && window.parent !== window) return true;
    const { hash, search } = window.location;
    if (/access_token=|refresh_token=|error_description=/.test(hash) || /[?&]code=/.test(search)) return true;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) return true;
    }
  } catch {
    return true;
  }
  return false;
}

/**
 * A single anonymous row insert over the REST endpoint, the same request the
 * client library makes for a signed-out visitor (publishable key, no user
 * token). Used for public analytics so a pageview never pulls in the client.
 */
export async function restInsert(
  table: string,
  row: Record<string, unknown>,
  opts: { url?: string; key?: string; fetchImpl?: typeof fetch } = {},
): Promise<{ error: { status: number } | null }> {
  const url = opts.url ?? import.meta.env.VITE_SUPABASE_URL;
  const key = opts.key ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await (opts.fetchImpl ?? fetch)(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
    keepalive: true,
  });
  return { error: res.ok ? null : { status: res.status } };
}

/**
 * Insert one row as the current visitor. A signed-out visitor on a production
 * build goes over plain REST; a signed-in visitor, or a page that already has
 * the client, uses the client so the row carries the user's session. Tests
 * and development always use the client, which is what they mock.
 */
export async function insertAsVisitor(table: string, row: Record<string, unknown>) {
  // Already loaded: insert in the same tick, with whatever session it holds.
  if (resolved) return resolved.from(table as never).insert(row as never);
  const useRest = import.meta.env.PROD && !pending && !mayHaveSession();
  if (useRest) return restInsert(table, row);
  const supabase = await loadSupabase();
  return supabase.from(table as never).insert(row as never);
}
