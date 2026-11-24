import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { advertisingAllowed, conversionSafePath, pixelSafePath, resolveAdvertisingRegion } from "@/lib/metaPermission";
import { cleanPreviewAddress } from "@/lib/instantPreview";
import { isLikelyBot } from "@/lib/botCheck";
import { initializeOpenAiAds, setOpenAiAdPermission, withdrawOpenAiAds } from "@/lib/openAiAds";

/** Top-level attribution, with the existing public/signup permission boundary and no matching data. */
const OpenAiPixel = () => {
  const route = useLocation();
  const { user, loading } = useAuth();
  const audience = useRef({ user, loading, demo: false });
  audience.current = { user, loading, demo: audience.current.demo || route.pathname === "/sample" };
  const country = useRef<string | null>(null);
  const start = useRef<() => void>(() => {});
  const safe = (allowPendingAccount = false) => {
    cleanPreviewAddress();
    return (!audience.current.loading || allowPendingAccount) && !audience.current.user && !audience.current.demo && !isLikelyBot() &&
      (pixelSafePath(location.pathname, location.search, location.hash) ||
        (location.pathname === "/signup" && conversionSafePath(location.pathname, location.search, location.hash)));
  };
  const permission = (allowPendingAccount = false) => {
    try {
      return safe(allowPendingAccount) && advertisingAllowed(country.current, localStorage.getItem("revvin_advertising_choice") === "denied",
        Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl || navigator.doNotTrack === "1"));
    } catch { return false; }
  };
  useLayoutEffect(() => {
    setOpenAiAdPermission(() => permission());
    // A lazy anonymous session check pauses our sends, not the visitor's advertising choice.
    // Explicit opt-outs, signed-in accounts and excluded routes still revoke immediately.
    if (!permission(true)) withdrawOpenAiAds();
  }, [route.pathname, route.search, route.hash, user, loading]);

  useEffect(() => {
    let stopped = false;
    const activate = async () => {
      if (stopped || !safe()) return;
      if (!country.current) country.current = await resolveAdvertisingRegion();
      if (stopped || !permission()) return;
      await initializeOpenAiAds();
    };
    start.current = () => { void activate(); };
    const revoke = () => { if (!permission()) withdrawOpenAiAds(); };
    const interact = () => { void activate(); };
    window.addEventListener("pointerdown", interact, { once: true });
    window.addEventListener("keydown", interact, { once: true });
    window.addEventListener("storage", revoke);
    window.addEventListener("revvin:advertising-choice", revoke);
    return () => {
      stopped = true; setOpenAiAdPermission(() => false); withdrawOpenAiAds();
      window.removeEventListener("pointerdown", interact);
      window.removeEventListener("keydown", interact);
      window.removeEventListener("storage", revoke);
      window.removeEventListener("revvin:advertising-choice", revoke);
    };
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => start.current(), 3000);
    return () => clearTimeout(timer);
  }, [route.pathname, route.search, route.hash, user, loading]);
  return null;
};
export default OpenAiPixel;
