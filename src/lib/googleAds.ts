import { GOOGLE_TAG_ID, GOOGLE_ADS_DESTINATION_ID } from "@/config/brand";
import { pixelSafePath, conversionSafePath } from "@/lib/metaPermission";
import { isSignupTrade } from "@/lib/signupTrade";

type GoogleCommand = [string, ...unknown[]];
declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: GoogleCommand) => void }
}
interface GoogleState {
  initialized: boolean;
  granted: boolean;
  version: number;
  permitted: () => boolean;
  captureAllowed: () => boolean;
  consentAllowed: () => boolean;
  resolveConsent: () => Promise<boolean>;
  pages: Set<string>;
  signups: Set<string>;
  welcome?: { account: string; expires: number; visit?: string };
}
const states = new WeakMap<Document, GoogleState>();
function state() {
  const existing = states.get(document);
  if (existing && (!existing.initialized || window.gtag)) return existing;
  const next: GoogleState = { initialized: false, granted: false, version: 0, permitted: () => false,
    captureAllowed: () => false, consentAllowed: () => false, resolveConsent: async () => false,
    pages: new Set(), signups: new Set() };
  states.set(document, next);
  return next;
}

/** Google-only click keys extend the shared boundary without changing either existing pixel. */
export function googleSafePath(path: string, search: string, hash: string, conversion = false) {
  const query = new URLSearchParams(search);
  query.delete("gbraid"); query.delete("wbraid");
  return (conversion ? conversionSafePath : pixelSafePath)(path, query.toString(), hash);
}
export function setGoogleAdPermission(options: Pick<GoogleState, "permitted" | "captureAllowed" | "consentAllowed" | "resolveConsent">) {
  Object.assign(state(), options);
}
const denied = { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };
const granted = { ad_storage: "granted", ad_user_data: "denied", ad_personalization: "denied" };

/** Drop queued measurements on withdrawal. No denied/cookieless application events are sent. */
export function withdrawGoogleAds() {
  const current = state();
  current.version += 1; current.welcome = undefined;
  if (!current.initialized || !current.granted) return;
  current.granted = false;
  if (window.dataLayer) window.dataLayer.splice(0, window.dataLayer.length);
  window.gtag?.("consent", "update", denied);
}
export function pauseGoogleAds() {
  const current = state();
  if (!current.initialized || !current.granted) return;
  current.granted = false;
  window.gtag?.("consent", "update", denied);
}
function initialize(current: GoogleState, signupAuthorized = false) {
  if (!GOOGLE_TAG_ID || !current.consentAllowed() || (!signupAuthorized && !current.permitted())) return false;
  if (!current.initialized) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function (..._args: GoogleCommand) { window.dataLayer?.push(arguments); };
    window.gtag("consent", "default", denied);
    window.gtag("set", { send_page_view: false, allow_enhanced_conversions: false, allow_google_signals: false,
      allow_ad_personalization_signals: false, ads_data_redaction: true,
      ae_block_history: true, ae_block_form: true, ae_block_outbound_click: true,
      ae_block_scroll: true, ae_block_downloads: true, ae_block_video: true });
    window.gtag("consent", "update", granted);
    window.gtag("js", new Date());
    // GTM containers require their bootstrap event, in addition to the supplied gtag queue.
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    window.gtag("config", GOOGLE_ADS_DESTINATION_ID, { send_page_view: false,
      allow_enhanced_conversions: false,
      user_data_settings: { enable_code: false, auto_detect: { email: false, phone: false, address: false } },
      ae_block_history: true, ae_block_form: true, ae_block_outbound_click: true,
      ae_block_scroll: true, ae_block_downloads: true, ae_block_video: true });
    if (!document.querySelector('script[src*="googletagmanager.com/"]')) {
      const script = document.createElement("script");
      script.id = "google-ad-tag"; script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${GOOGLE_TAG_ID}`;
      document.head.appendChild(script);
    }
    current.initialized = true; current.granted = true;
  } else if (!current.granted) {
    window.gtag?.("consent", "update", granted); current.granted = true;
  }
  return true;
}
export function googleWelcomeAllowed(account: string | undefined, visit: string) {
  const current = state();
  const welcome = current.welcome;
  return Boolean(account && welcome?.account === account && welcome.expires > Date.now() &&
    (!welcome.visit || welcome.visit === visit) && current.consentAllowed());
}
export function leaveGoogleWelcome(path: string) {
  const current = state();
  if (path !== "/welcome" && current.welcome?.visit) current.welcome = undefined;
}
export function trackGooglePageView(visit: string) {
  const current = state();
  if (!current.permitted() || !initialize(current) || current.pages.has(visit)) return false;
  const address = new URL(location.href);
  address.hash = "";
  // Explicit address data only. No form values or user objects enter the queue.
  window.gtag?.("event", "page_view", { page_location: address.href, page_path: address.pathname });
  current.pages.add(visit);
  if (address.pathname === "/welcome" && current.welcome) current.welcome.visit = visit;
  return true;
}

export type GoogleSignupEligibility = Readonly<{ eligible: true }>;
const snapshots = new WeakMap<GoogleSignupEligibility, { current: GoogleState; version: number }>();
/** Capture before auth changes; resolve geography without delaying the signup request. */
export function captureGoogleSignupEligibility(): GoogleSignupEligibility | undefined {
  const current = state();
  if (location.pathname !== "/signup" || !current.captureAllowed()) return;
  const token = { eligible: true as const };
  snapshots.set(token, { current, version: current.version });
  return token;
}
export async function trackGoogleSignup(account: string, trade: string, token?: GoogleSignupEligibility) {
  const snapshot = token ? snapshots.get(token) : undefined;
  if (token) snapshots.delete(token);
  const current = state();
  if (!snapshot || snapshot.current !== current || snapshot.version !== current.version || current.signups.has(account) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(account)) return false;
  if (!await current.resolveConsent() || snapshot.version !== current.version || current.signups.has(account) || !initialize(current, true)) return false;
  // Only allowlisted trade labels can be attached, but trade never gates account reporting.
  window.gtag?.("event", "sign_up", { method: "email", ...(isSignupTrade(trade) ? { signup_trade: trade } : {}) });
  current.signups.add(account);
  current.welcome = { account, expires: Date.now() + 10 * 60 * 1000 };
  window.dispatchEvent(new Event("revvin:google-signup"));
  return true;
}