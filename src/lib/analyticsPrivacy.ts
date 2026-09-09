/** Explicit public-analytics boundary. This is data minimization, not consent. */
import { TOOLKIT_CTA_LABELS } from "@/lib/toolkit/analytics";

export type AnalyticsAudience = "unknown" | "anonymous" | "signed-in";
export type AnalyticsTraffic = "marketing" | "demo" | "referral";
export interface AnalyticsContext { path: string; traffic: AnalyticsTraffic }

let audience: AnalyticsAudience = "unknown";
export const setAnalyticsAudience = (value: AnalyticsAudience) => { audience = value; };
export const getAnalyticsAudience = () => audience;

const PRODUCTION_HOSTS = new Set(["revvin.co", "www.revvin.co"]);
const PUBLIC_PATHS = new Set([
  "/", "/pricing", "/how-it-works", "/for-businesses", "/for-referrers",
  "/browse", "/marketplace", "/sample", "/ask-kit", "/guides",
  "/referral-programs", "/about-revvin-llm", "/trust", "/terms", "/privacy",
  "/referral-agreement", "/docs/zapier",
  // Free toolkit. The tools never put input in the URL, so an approved path here
  // can only ever be one of these four fixed strings.
  "/tools", "/tools/referral-program-grader", "/tools/referral-reward-calculator",
  "/tools/referral-message-generator",
  ...["roofing", "hvac", "plumbing", "solar", "electrical", "landscaping", "painting", "auto-detailing", "pest-control", "pool-service", "garage-door", "flooring", "window-replacement", "tree-service", "house-cleaning", "remodeling", "fencing", "pressure-washing", "carpet-cleaning", "handyman"].map(slug => `/referral-program/${slug}`),
  ...["how-much-to-pay-for-a-referral", "referral-program-vs-buying-leads", "how-to-start-a-referral-program", "do-referral-programs-work-for-contractors", "how-to-ask-a-customer-for-a-referral", "alternative-to-buying-leads"].map(slug => `/guides/${slug}`),
]);
const CAMPAIGN_KEYS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"]);

function approvedPath(path: string): string | null {
  const normalized = path === "/" ? "/" : path.replace(/\/$/, "");
  if (PUBLIC_PATHS.has(normalized)) return normalized;
  // Business/offer identifiers never enter analytics. Private receipts and
  // malformed/encoded paths cannot match these deliberately narrow patterns.
  if (/^\/r\/(?!status$)[a-z0-9-]{1,80}$/.test(normalized)) return "/r/:business";
  if (/^\/offer\/[a-z0-9-]{1,80}(?:\/[a-z0-9-]{1,80})?$/.test(normalized)) return "/offer/:offer";
  return null;
}

export function analyticsContext(href: string, currentAudience = audience): AnalyticsContext | null {
  if (currentAudience !== "anonymous") return null;
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" || !PRODUCTION_HOSTS.has(url.hostname) || url.port || url.username || url.password) return null;
    // A hash may carry OAuth credentials. Unknown query parameters may contain
    // private receipt, preview or reset tokens; fail closed rather than log them.
    if (url.hash || [...url.searchParams.keys()].some(key => !CAMPAIGN_KEYS.has(key))) return null;
    const path = approvedPath(url.pathname);
    if (!path) return null;
    return { path, traffic: path === "/sample" ? "demo" : path.startsWith("/r/") || path.startsWith("/offer/") ? "referral" : "marketing" };
  } catch { return null; }
}

export function sanitizeAnalyticsReferrer(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    // External search/customer URLs can contain PII anywhere in their path.
    // Keep only the origin. For our own origin, keep an approved public path.
    if (!PRODUCTION_HOSTS.has(url.hostname)) return url.origin;
    const path = approvedPath(url.pathname);
    return path ? `${url.origin}${path}` : url.origin;
  } catch { return null; }
}

// Toolkit steps ride on cta_clicked with a fixed label, so measuring the free
// tools needs no new event name. A label names the tool and the step and nothing
// else: no score, no dollar figure, no percentage and no typed text.
const CTA_LABELS = new Set([
  "hero_signup", "hero_demo", "home_industries", "plans_free", "plans_pro", "footer_signup",
  "sample_top", "sample_bottom", "demo_signup", "home_tools",
  ...TOOLKIT_CTA_LABELS,
]);
const SOURCE_LABELS = new Set(["landing", "playbook", "sample", "marketplace_notify"]);
export function safeAnalyticsMeta(event: string, context: AnalyticsContext, input?: Record<string, unknown>) {
  const demo = context.traffic === "demo" || event.startsWith("demo_") || input?.cta === "demo_signup";
  const result: Record<string, string | boolean> = { traffic: demo ? "demo" : context.traffic, is_demo: demo };
  if (typeof input?.cta === "string" && CTA_LABELS.has(input.cta)) result.cta = input.cta;
  if (typeof input?.source === "string" && SOURCE_LABELS.has(input.source)) result.source = input.source;
  return result;
}

const PUBLIC_EVENTS = new Set(["page_viewed", "cta_clicked", "demo_started", "demo_completed", "sample_page_viewed", "email_lead_submitted", "referral_submitted", "promo_popup_shown", "promo_cta_clicked"]);
export function analyticsEventAllowed(event: string, context: AnalyticsContext): boolean {
  if (!PUBLIC_EVENTS.has(event)) return false;
  if (context.traffic === "demo") return ["page_viewed", "sample_page_viewed", "cta_clicked", "demo_started", "demo_completed"].includes(event);
  return event !== "referral_submitted" || context.traffic === "referral";
}

/** Revalidate stored attribution too: storage is editable/untrusted input. */
export function safeAnalyticsAttribution(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!CAMPAIGN_KEYS.has(key) || typeof value !== "string") continue;
    // Campaign labels/click IDs only; omit URL-shaped, email-shaped, encoded or
    // unexpectedly long values. Never spread arbitrary stored attribution keys.
    if (/^[a-zA-Z0-9][a-zA-Z0-9 _.-]{0,199}$/.test(value)) result[key] = value;
  }
  return result;
}
