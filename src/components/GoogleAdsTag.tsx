import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { advertisingAllowed, resolveAdvertisingRegion } from "@/lib/metaPermission";
import { cleanPreviewAddress } from "@/lib/instantPreview";
import { isLikelyBot } from "@/lib/botCheck";
import { googleSafePath, googleWelcomeAllowed, leaveGoogleWelcome, pauseGoogleAds,
  setGoogleAdPermission, trackGooglePageView, withdrawGoogleAds } from "@/lib/googleAds";

const GoogleAdsTag = () => {
  const route = useLocation();
  const { user, loading } = useAuth();
  const audience = useRef({ user, loading, demo: false, visit: route.key });
  audience.current = { user, loading, demo: audience.current.demo || route.pathname === "/sample", visit: route.key };
  const country = useRef<string | null>(null);
  const resolving = useRef<Promise<string | null>>();
  const start = useRef<() => void>(() => {});
  const localAllowed = () => {
    try {
      return !audience.current.demo && !isLikelyBot() && localStorage.getItem("revvin_advertising_choice") !== "denied" &&
        !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl && navigator.doNotTrack !== "1";
    } catch { return false; }
  };
  const consentAllowed = () => localAllowed() && advertisingAllowed(country.current);
  const safe = () => {
    cleanPreviewAddress();
    if (audience.current.loading || !localAllowed()) return false;
    if (location.pathname === "/welcome") return googleSafePath(location.pathname, location.search, location.hash, true) &&
      googleWelcomeAllowed(audience.current.user?.id, audience.current.visit);
    return !audience.current.user && (googleSafePath(location.pathname, location.search, location.hash) ||
      (location.pathname === "/signup" && googleSafePath(location.pathname, location.search, location.hash, true)));
  };
  const resolveConsent = async () => {
    if (!localAllowed()) return false;
    if (!country.current) {
      resolving.current ??= resolveAdvertisingRegion();
      country.current = await resolving.current;
    }
    return consentAllowed();
  };
  useLayoutEffect(() => {
    leaveGoogleWelcome(route.pathname);
    setGoogleAdPermission({ permitted: () => safe() && consentAllowed(), consentAllowed, resolveConsent,
      captureAllowed: () => location.pathname === "/signup" && safe() });
    if (!localAllowed()) withdrawGoogleAds();
    else if (!safe()) pauseGoogleAds();
  }, [route.pathname, route.search, route.hash, route.key, user, loading]);
  useEffect(() => {
    let stopped = false;
    const activate = async () => {
      if (stopped || !safe() || !await resolveConsent() || stopped || !safe()) return;
      trackGooglePageView(audience.current.visit);
    };
    start.current = () => { void activate(); };
    const revoke = () => { if (!localAllowed()) withdrawGoogleAds(); };
    const interact = () => { void activate(); };
    window.addEventListener("pointerdown", interact, { once: true });
    window.addEventListener("keydown", interact, { once: true });
    window.addEventListener("storage", revoke);
    window.addEventListener("revvin:advertising-choice", revoke);
    window.addEventListener("revvin:google-signup", interact);
    return () => {
      stopped = true;
      setGoogleAdPermission({ permitted: () => false, captureAllowed: () => false, consentAllowed: () => false, resolveConsent: async () => false });
      pauseGoogleAds();
      window.removeEventListener("pointerdown", interact); window.removeEventListener("keydown", interact);
      window.removeEventListener("storage", revoke); window.removeEventListener("revvin:advertising-choice", revoke);
      window.removeEventListener("revvin:google-signup", interact);
    };
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => start.current(), 3000);
    return () => clearTimeout(timer);
  }, [route.pathname, route.search, route.hash, route.key, user, loading]);
  return null;
};
export default GoogleAdsTag;