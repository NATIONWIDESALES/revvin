import { useEffect } from "react";
import { META_PIXEL_ID } from "@/config/brand";
import { advertisingAllowed, pixelSafePath, resolveAdvertisingRegion } from "@/lib/metaPermission";
const MetaPixel = () => {
  useEffect(() => {
    if (!META_PIXEL_ID) return;
    let stopped = false;
    let country: string | null = null;
    let active = false;
    let bridge: { send: (event: string) => void; dispose: () => void } | null = null;
    const permission = () => {
      let refusal = false;
      try { refusal = localStorage.getItem("revvin_advertising_choice") === "denied"; } catch { return false; }
      return advertisingAllowed(country, refusal, Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl || navigator.doNotTrack === "1"));
    };
    const safe = () => pixelSafePath(location.pathname, location.search, location.hash) || (["/signup", "/welcome", "/dashboard", "/auth"].includes(location.pathname) && !location.hash);
    const start = async () => {
      if (active || stopped || !safe()) return;
      country = await resolveAdvertisingRegion();
      if (stopped || !permission() || !safe()) return;
      const { loadPixel } = await import("@/lib/metaPixelLoader");
      if (stopped || !permission() || !safe()) return;
      bridge = loadPixel(META_PIXEL_ID); active = Boolean(bridge);
      if (pixelSafePath(location.pathname, location.search, location.hash)) bridge?.send("PageView");
    };
    const conversion = (event: Event) => {
      if (!active || !permission() || !safe()) return;
      const name = (event as CustomEvent<string>).detail;
      if (name === "preview_submitted") bridge?.send("Lead");
      if (name === "signup_completed") bridge?.send("CompleteRegistration");
      if (name === "page_published") bridge?.send("PagePublished");
    };
    const revoke = () => { if (!permission()) { bridge?.dispose(); bridge = null; active = false; } };
    const timer = window.setTimeout(() => { void start(); }, 3000);
    const interact = () => { void start(); };
    window.addEventListener("pointerdown", interact, { once: true }); window.addEventListener("keydown", interact, { once: true });
    window.addEventListener("revvin:conversion", conversion); window.addEventListener("storage", revoke); window.addEventListener("revvin:advertising-choice", revoke);
    return () => { stopped = true; bridge?.dispose(); clearTimeout(timer); window.removeEventListener("pointerdown", interact); window.removeEventListener("keydown", interact); window.removeEventListener("revvin:conversion", conversion); window.removeEventListener("storage", revoke); window.removeEventListener("revvin:advertising-choice", revoke); };
  }, []);
  return null;
};
export default MetaPixel;
