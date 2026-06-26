import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Privacy-friendly Plausible analytics.
 *
 * To enable: set VITE_PLAUSIBLE_DOMAIN in your environment (e.g. "revvin.co").
 * Until that env var is set, this component renders nothing — no script is
 * injected, no pageviews are sent.
 *
 * If you'd rather use PostHog or a different provider, swap the injected
 * script below; the route-change pageview pattern stays the same.
 */
const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN as
  | string
  | undefined;
const SCRIPT_ID = "plausible-analytics-script";

declare global {
  interface Window {
    plausible?: (event: string, options?: Record<string, unknown>) => void;
  }
}

const Analytics = () => {
  const location = useLocation();

  // Inject the Plausible script once, only if a domain is configured.
  useEffect(() => {
    if (!PLAUSIBLE_DOMAIN) return;
    if (document.getElementById(SCRIPT_ID)) return;
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.defer = true;
    s.setAttribute("data-domain", PLAUSIBLE_DOMAIN);
    s.src = "https://plausible.io/js/script.js";
    document.head.appendChild(s);
  }, []);

  // Fire a pageview on every client-side route change.
  useEffect(() => {
    if (!PLAUSIBLE_DOMAIN) return;
    if (typeof window.plausible === "function") {
      window.plausible("pageview");
    }
  }, [location.pathname, location.search]);

  return null;
};

export default Analytics;