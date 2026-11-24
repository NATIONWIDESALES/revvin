const CONSENT_COUNTRIES = new Set(["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IE","IT","LI","LV","LT","LU","MT","NL","NO","PL","PT","RO","SK","SI","ES","SE","GB","CH"]);
export function advertisingAllowed(country: string | null, refusal = false, optedOut = false) {
  return Boolean(country && /^[A-Z]{2}$/.test(country) && !["XX","T1"].includes(country) && !CONSENT_COUNTRIES.has(country) && !refusal && !optedOut);
}
export function pixelSafePath(path: string, search: string, hash: string) {
  if (hash || [...new URLSearchParams(search).keys()].some(k => !/^(utm_(source|medium|campaign|content|term|id)|fbclid|oppref|gclid|msclkid|ttclid|li_fat_id)$/.test(k))) return false;
  return ["/", "/pricing", "/about", "/how-it-works", "/compare", "/guides", "/tools", "/privacy", "/start"].includes(path) || /^\/(compare|guides|referral-program|start)\/[a-z0-9-]+$/.test(path);
}
/** Owner conversion pages: only the bare path, or campaign/offer keys with no hash. */
const CONVERSION_PATHS = ["/signup", "/welcome", "/dashboard", "/auth"];
export function conversionSafePath(path: string, search: string, hash: string) {
  return CONVERSION_PATHS.includes(path) && !hash && [...new URLSearchParams(search).keys()].every(k => /^(utm_(source|medium|campaign|content|term|id)|fbclid|oppref|gclid|msclkid|ttclid|li_fat_id|offer)$/.test(k));
}
export function pixelAllowedHere(path: string, search: string, hash: string) {
  return pixelSafePath(path, search, hash) || conversionSafePath(path, search, hash);
}
export async function resolveAdvertisingRegion(): Promise<string | null> {
  try {
    const response = await fetch("/cdn-cgi/trace", { signal: AbortSignal.timeout(2000), cache: "no-store" });
    if (!response.ok) return null;
    const lines = Object.fromEntries((await response.text()).trim().split("\n").map(line => line.split("=")));
    return lines.h === window.location.hostname ? lines.loc ?? null : null;
  } catch { return null; }
}