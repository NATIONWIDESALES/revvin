import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { OPENAI_PIXEL_ID, OPENAI_PIXEL_DEBUG } from "@/config/brand";
import { advertisingAllowed, conversionSafePath, pixelSafePath, resolveAdvertisingRegion } from "@/lib/metaPermission";
import { cleanPreviewAddress } from "@/lib/instantPreview";
import { isLikelyBot } from "@/lib/botCheck";

/** Same permission/activation boundary as Meta, with no private account routes or events. */
const OpenAiPixel = () => {
  const route = useLocation();
  const { user, loading } = useAuth();
  const initialized = useRef(false);
  const demo = useRef(false);
  const bridge = useRef<{ dispose: () => void } | null>(null);
  if (route.pathname === "/sample") demo.current = true;

  useEffect(() => {
    let stopped = false;
    let country: string | null = null;
    const safe = () => {
      cleanPreviewAddress();
      return !loading && !user && !demo.current && !isLikelyBot() &&
        (pixelSafePath(location.pathname, location.search, location.hash) ||
          (location.pathname === "/signup" && conversionSafePath(location.pathname, location.search, location.hash)));
    };
    const permission = () => {
      try {
        return safe() && advertisingAllowed(country, localStorage.getItem("revvin_advertising_choice") === "denied",
          Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl || navigator.doNotTrack === "1"));
      } catch { return false; }
    };
    const stop = () => { bridge.current?.dispose(); bridge.current = null; };
    const revoke = () => { if (!permission()) stop(); };
    const start = async () => {
      if (stopped || initialized.current || !OPENAI_PIXEL_ID || !safe()) return;
      country = await resolveAdvertisingRegion();
      if (stopped || initialized.current || !permission()) return;
      const { loadOpenAiPixel } = await import("@/lib/metaPixelLoader");
      if (stopped || initialized.current || !permission()) return;
      bridge.current = loadOpenAiPixel(OPENAI_PIXEL_ID, OPENAI_PIXEL_DEBUG, permission);
      initialized.current = Boolean(bridge.current);
    };
    // Eligible SPA navigation retains the existing isolated document and its one init.
    if (!safe()) stop();
    const timer = window.setTimeout(() => { void start(); }, 3000);
    const interact = () => { void start(); };
    window.addEventListener("pointerdown", interact, { once: true });
    window.addEventListener("keydown", interact, { once: true });
    window.addEventListener("storage", revoke);
    window.addEventListener("revvin:advertising-choice", revoke);
    return () => {
      stopped = true; clearTimeout(timer);
      window.removeEventListener("pointerdown", interact);
      window.removeEventListener("keydown", interact);
      window.removeEventListener("storage", revoke);
      window.removeEventListener("revvin:advertising-choice", revoke);
    };
  }, [route.pathname, route.search, route.hash, user, loading]);
  useEffect(() => () => { bridge.current?.dispose(); bridge.current = null; }, []);
  return null;
};
export default OpenAiPixel;