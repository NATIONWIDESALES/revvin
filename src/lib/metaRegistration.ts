import { advertisingAllowed, pixelAllowedHere, resolveAdvertisingRegion } from "@/lib/metaPermission";
import { permittedFbclid, FBCLID_FIRST_SEEN_KEY } from "@/lib/metaClick";
import { cleanPreviewAddress } from "@/lib/instantPreview";
import { registrationEventId, validMetaCookie } from "../../supabase/functions/_shared/meta-registration";

export { registrationEventId };

export function advertisingPermissionNow(country: string | null) {
  try {
    return advertisingAllowed(country, localStorage.getItem("revvin_advertising_choice") === "denied",
      Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl || navigator.doNotTrack === "1"));
  } catch { return false; }
}

export async function registrationConsent() {
  const country = await resolveAdvertisingRegion();
  cleanPreviewAddress();
  if (!advertisingPermissionNow(country) || !pixelAllowedHere(location.pathname, location.search, location.hash)) return { advertising_allowed: false, country };
  let fbc: string | undefined;
  let fbp: string | undefined;
  const click = permittedFbclid(location.search);
  try {
    const timestamp = sessionStorage.getItem(FBCLID_FIRST_SEEN_KEY);
    const candidate = click && timestamp ? `fb.1.${timestamp}.${click}` : undefined;
    if (validMetaCookie(candidate, true)) fbc = candidate;
    const cookie = document.cookie.split(";").map(v => v.trim()).find(v => v.startsWith("_fbp="))?.slice(5);
    if (validMetaCookie(cookie)) fbp = cookie;
  } catch { /* optional identifiers stay absent when storage is unavailable */ }
  return { advertising_allowed: true, country, ...(fbc ? { fbc } : {}), ...(fbp ? { fbp } : {}) };
}

/** Once per successful signup; failures cannot affect account creation or navigation. */
export function reportRegistration(userId: string, accessToken: string, consent: Awaited<ReturnType<typeof registrationConsent>>) {
  if (!consent.advertising_allowed || !advertisingPermissionNow(consent.country)) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try { void fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-capi`, {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(consent), signal: controller.signal, keepalive: true,
  }).catch(() => {}).finally(() => clearTimeout(timer)); }
  catch { clearTimeout(timer); }
}