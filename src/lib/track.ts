import { supabase } from "@/integrations/supabase/client";

/**
 * First-party funnel instrumentation.
 *
 * PRIVACY: never pass PII here. No emails, names, phone numbers or lead data.
 * `session_id` is a random opaque id kept in localStorage — it is not a user id
 * and is not derived from anything identifying.
 */
export const FUNNEL_EVENTS = [
  "signup_viewed",
  "signup_submitted",
  "signup_succeeded",
  "signup_failed",
  "onboarding_started",
  "onboarding_completed",
  "go_live_clicked",
  "checkout_redirected",
  "checkout_succeeded",
  "checkout_canceled",
  "email_lead_submitted",
  "referral_submitted",
  "sample_page_viewed",
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

const SESSION_KEY = "revvin_session_id";

function getSessionId(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget. Never throws, never blocks a user flow.
 */
export function track(event: FunnelEvent, meta?: Record<string, unknown>): void {
  try {
    window.plausible?.(event, meta ? { props: meta } : undefined);
  } catch {
    /* ignore */
  }

  try {
    void supabase
      .from("funnel_events")
      .insert({
        event,
        session_id: getSessionId(),
        path: typeof location !== "undefined" ? location.pathname.slice(0, 512) : null,
        referrer:
          typeof document !== "undefined" && document.referrer
            ? document.referrer.slice(0, 512)
            : null,
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 512) : null,
        meta: (meta ?? {}) as never,
      })
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    /* instrumentation must never break the UI */
  }
}
