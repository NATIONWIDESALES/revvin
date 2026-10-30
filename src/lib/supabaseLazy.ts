import type { supabase as SupabaseClient } from "@/integrations/supabase/client";

/**
 * The backend client, loaded on first use instead of at app start. Marketing
 * pages only need it when a visitor submits a form or is signed in, so the
 * ~45 KB client stays out of their initial download.
 */
let pending: Promise<typeof SupabaseClient> | null = null;

export function loadSupabase(): Promise<typeof SupabaseClient> {
  pending ??= import("@/integrations/supabase/client").then((m) => m.supabase);
  return pending;
}

/** Marketing routes, which must not fetch the backend client on first load. */
export const MARKETING_PREFIXES = [
  "/how-it-works",
  "/pricing",
  "/about",
  "/earn",
  "/referral-program",
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
  return MARKETING_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}s`));
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
