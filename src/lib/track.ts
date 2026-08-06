import { supabase } from "@/integrations/supabase/client";
import { captureAttribution, getAttribution } from "@/lib/attribution";

/**
 * First-party funnel instrumentation.
 *
 * PRIVACY: never pass PII here. No emails, names, phone numbers or lead data.
 * `session_id` is a random opaque id kept in localStorage — it is not a user id
 * and is not derived from anything identifying.
 */
export const FUNNEL_EVENTS = [
  "page_viewed",
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
  "promo_popup_shown",
  "promo_cta_clicked",
  "invite_link_opened",
  "invite_code_entered",
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

const SESSION_KEY = "revvin_session_id";

/**
 * Our events mapped onto Meta standard events so the ad platform can optimise
 * on them. Anything not listed fires as a custom event under our own name.
 */
const META_STANDARD_EVENTS: Partial<Record<FunnelEvent, string>> = {
  signup_succeeded: "CompleteRegistration",
  checkout_redirected: "InitiateCheckout",
  checkout_succeeded: "Purchase",
  email_lead_submitted: "Lead",
};

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
    if (event === "page_viewed") {
      // Pageviews are already sent to Plausible and the Meta pixel by their own
      // components. Only record the first-party row here.
      recordFunnelEvent(event, meta);
      return;
    }
    window.plausible?.(event, meta ? { props: meta } : undefined);
  } catch {
    /* ignore */
  }

  // Meta pixel. No PII is ever forwarded — only the event name.
  try {
    const standard = META_STANDARD_EVENTS[event];
    if (standard) {
      window.fbq?.("track", standard);
    } else {
      window.fbq?.("trackCustom", event);
    }
  } catch {
    /* fbq may be missing or blocked by an ad blocker */
  }

  recordFunnelEvent(event, meta);
}

function recordFunnelEvent(event: FunnelEvent, meta?: Record<string, unknown>): void {
  let attribution: Record<string, unknown> | null = null;
  try {
    attribution = captureAttribution() ?? getAttribution();
  } catch {
    attribution = null;
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
        meta: { ...(meta ?? {}), ...(attribution ?? {}) } as never,
      })
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    /* instrumentation must never break the UI */
  }
}
