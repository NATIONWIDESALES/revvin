import { useEffect } from "react";
import { META_PIXEL_ID } from "@/config/brand";
import { advertisingAllowed, pixelSafePath, resolveAdvertisingRegion } from "@/lib/metaPermission";
const MetaPixel = () => {
  useEffect(() => {
    if (!META_PIXEL_ID) return;
    let stopped = false;
    let country: string | null = null;
    let active = false;
    const permission = () => {
      let refusal = false;
      try { refusal = localStorage.getItem("revvin_advertising_choice") === "denied"; } catch { return false; }
      return advertisingAllowed(country, refusal, Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl || navigator.doNotTrack === "1"));
    };
    const safe = () => pixelSafePath(location.pathname, location.search, location.hash);
    const start = async () => {
      if (active || stopped || !safe()) return;
      country = await resolveAdvertisingRegion();
      if (stopped || !permission() || !safe()) return;
      const { loadPixel } = await import("@/lib/metaPixelLoader");
      if (stopped || !permission() || !safe()) return;
      loadPixel(META_PIXEL_ID); active = true; window.fbq?.("track", "PageView");
    };
    const conversion = (event: Event) => {
      if (!active || !permission() || !safe()) return;
      const name = (event as CustomEvent<string>).detail;
      if (name === "preview_submitted") window.fbq?.("track", "Lead");
      if (name === "signup_completed") window.fbq?.("track", "CompleteRegistration");
      if (name === "page_published") window.fbq?.("trackCustom", "PagePublished");
    };
    // A provider script must not follow a SPA transition into private URLs.
    const navigate = (event: MouseEvent) => {
      if (!active) return;
      const anchor = (event.target as Element)?.closest("a[href]");
      if (!anchor || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const url = new URL(anchor.getAttribute("href") || "", location.href);
      if (url.origin === location.origin && !pixelSafePath(url.pathname, url.search, url.hash)) {
        event.preventDefault(); event.stopImmediatePropagation(); window.location.assign(url.href);
      }
    };
    const revoke = () => { if (!permission()) window.fbq?.("consent", "revoke"); };
    const timer = window.setTimeout(() => { void start(); }, 3000);
    const interact = () => { void start(); };
    window.addEventListener("pointerdown", interact, { once: true }); window.addEventListener("keydown", interact, { once: true });
    window.addEventListener("revvin:conversion", conversion); window.addEventListener("storage", revoke); window.addEventListener("revvin:advertising-choice", revoke); document.addEventListener("click", navigate, true);
    return () => { stopped = true; clearTimeout(timer); window.removeEventListener("pointerdown", interact); window.removeEventListener("keydown", interact); window.removeEventListener("revvin:conversion", conversion); window.removeEventListener("storage", revoke); window.removeEventListener("revvin:advertising-choice", revoke); document.removeEventListener("click", navigate, true); };
  }, []);
  return null;
};
export default MetaPixel;
