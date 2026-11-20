import { isMarketingPath } from "@/lib/supabaseLazy";

export const SALE_BANNER_SESSION_KEY = "revvin_bf2026_banner_dismissed";
export const SALE_POPUP_KEY = "revvin_bf2026_popup_seen";
export const SALE_PAID_AD_SESSION_KEY = "revvin_bf2026_paid_ad";
export const SALE_CTA_LABEL = "Get the Black Friday price";

let paidAdThisSession = false;

// Store only a suppression flag, never campaign values or click IDs.
export function isPaidAdSession(search: string) {
  const params = new URLSearchParams(search);
  const paid = params.getAll("utm_medium").includes("paid_social")
    || params.getAll("utm_source").some((source) => ["meta", "facebook", "instagram"].includes(source))
    || ["fbclid", "gclid", "msclkid"].some((key) => params.has(key));
  if (paid) {
    paidAdThisSession = true;
    try { sessionStorage.setItem(SALE_PAID_AD_SESSION_KEY, "1"); } catch { /* In-memory session fallback. */ }
  }
  try { return paidAdThisSession || sessionStorage.getItem(SALE_PAID_AD_SESSION_KEY) === "1"; } catch { return paidAdThisSession; }
}

export function isSaleMarketingPath(path: string) {
  return isMarketingPath(path) && !/^\/(earn|partners)(\/|$)/.test(path);
}

export function isSaleSurface(path: string) {
  return isSaleMarketingPath(path) || /^\/i\/[^/]+\/?$/.test(path) || path === "/dashboard" || path.startsWith("/dashboard/");
}

export function saleDestination(owner: boolean) {
  return owner ? "/dashboard?tab=billing&offer=bf2026" : "/signup?offer=bf2026";
}

// Carry only the allowlisted presentation intent, never a checkout instruction.
export function withSaleOffer(destination: string, search: string) {
  if (new URLSearchParams(search).get("offer") !== "bf2026") return destination;
  return `${destination}${destination.includes("?") ? "&" : "?"}offer=bf2026`;
}

export function saleCountdown(serverNow: number, end: string) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Vancouver", year: "numeric", month: "2-digit", day: "2-digit" });
  if (day.format(serverNow) === day.format(Date.parse(end))) return "Ends tonight";
  const days = Math.max(1, Math.ceil((Date.parse(end) - serverNow) / 86400000));
  return `Ends in ${days} ${days === 1 ? "day" : "days"}`;
}