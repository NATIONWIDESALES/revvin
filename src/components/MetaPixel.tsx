import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { META_PIXEL_ID } from "@/config/brand";
import { advertisingAllowed, pixelAllowedHere, pixelSafePath, resolveAdvertisingRegion } from "@/lib/metaPermission";
import { clearMetaClick, permittedFbclid } from "@/lib/metaClick";
import { cleanPreviewAddress } from "@/lib/instantPreview";
const MetaPixel = () => {
  const route = useLocation();
  const leave = useRef<() => void>(() => {});
  const visit = useRef<() => void>(() => {});
  useEffect(() => {
    if (!META_PIXEL_ID) return;
    let stopped = false;
    let country: string | null = null;
    let active = false;
    let bridge: { send: (event: string, eventID?: string) => void; dispose: (immediate?: boolean) => void } | null = null;
    const permission = () => {
      let refusal = false;
      try { refusal = localStorage.getItem("revvin_advertising_choice") === "denied"; } catch { return false; }
      return advertisingAllowed(country, refusal, Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl || navigator.doNotTrack === "1"));
    };
    const safe = () => {
      cleanPreviewAddress();
      return pixelAllowedHere(location.pathname, location.search, location.hash);
    };
    const start = async () => {
      if (active || stopped || !safe()) return;
      country = await resolveAdvertisingRegion();
      if (stopped || !permission() || !safe()) return;
      const { loadPixel } = await import("@/lib/metaPixelLoader");
      if (stopped || !permission() || !safe()) return;
      if (active) return;
      bridge = loadPixel(META_PIXEL_ID, permittedFbclid(location.search), permission); active = Boolean(bridge);
      if (pixelSafePath(location.pathname, location.search, location.hash)) bridge?.send("PageView");
    };
    const conversion = (event: Event) => {
      if (!active || !permission() || !safe()) return;
      const detail = (event as CustomEvent<string | { name: string; eventID: string }>).detail;
      const name = typeof detail === "string" ? detail : detail.name;
      if (name === "preview_submitted") bridge?.send("Lead");
      if (name === "signup_completed") bridge?.send("CompleteRegistration", typeof detail === "string" ? undefined : detail.eventID);
      if (name === "page_published") bridge?.send("PagePublished");
    };
    const revoke = () => { if (!permission()) { bridge?.dispose(true); bridge = null; active = false; clearMetaClick(); } };
    leave.current = () => { bridge?.dispose(); bridge = null; active = false; };
    visit.current = () => {
      if (active && permission() && safe()) {
        if (pixelSafePath(location.pathname, location.search, location.hash)) bridge?.send("PageView");
      } else { void start(); }
    };
    const interact = () => { void start(); };
    window.addEventListener("pointerdown", interact, { once: true }); window.addEventListener("keydown", interact, { once: true });
    window.addEventListener("revvin:conversion", conversion); window.addEventListener("storage", revoke); window.addEventListener("revvin:advertising-choice", revoke);
    return () => { stopped = true; bridge?.dispose(); window.removeEventListener("pointerdown", interact); window.removeEventListener("keydown", interact); window.removeEventListener("revvin:conversion", conversion); window.removeEventListener("storage", revoke); window.removeEventListener("revvin:advertising-choice", revoke); };
  }, []);
  useEffect(() => {
    cleanPreviewAddress();
    if (!pixelAllowedHere(route.pathname, route.pathname === location.pathname ? location.search : route.search, route.hash)) { leave.current(); return; }
    const timer = window.setTimeout(() => visit.current(), 3000);
    return () => clearTimeout(timer);
  }, [route.pathname, route.search, route.hash]);
  return null;
};
export default MetaPixel;
