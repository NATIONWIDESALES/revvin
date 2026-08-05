import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { captureAttribution } from "@/lib/attribution";

/**
 * Meta (Facebook) pixel.
 *
 * To enable: set VITE_META_PIXEL_ID in your environment. Until that env var is
 * set this component renders nothing — no script is injected, no events sent.
 *
 * PRIVACY: no Advanced Matching, no PII. Only page views and the funnel events
 * mapped in src/lib/track.ts are sent.
 */
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
const SCRIPT_ID = "meta-pixel-script";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      queue?: unknown[];
      callMethod?: (...args: unknown[]) => void;
      push?: unknown;
      loaded?: boolean;
      version?: string;
    };
    _fbq?: unknown;
  }
}

const MetaPixel = () => {
  const location = useLocation();

  // Inject the base code once, only if a pixel id is configured.
  useEffect(() => {
    if (!META_PIXEL_ID) return;
    if (document.getElementById(SCRIPT_ID)) return;
    try {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const w = window as any;
      const n: any = (w.fbq = function (...args: unknown[]) {
        n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
      });
      if (!w._fbq) w._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      /* eslint-enable @typescript-eslint/no-explicit-any */

      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.async = true;
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(s);

      window.fbq?.("init", META_PIXEL_ID);
      window.fbq?.("track", "PageView");
    } catch {
      /* analytics must never break the UI */
    }
  }, []);

  // Capture first-touch attribution as soon as a URL carrying UTMs is seen.
  useEffect(() => {
    captureAttribution(location.search);
  }, [location.search]);

  // SPA navigations are not page loads: fire PageView on route change.
  useEffect(() => {
    if (!META_PIXEL_ID) return;
    try {
      window.fbq?.("track", "PageView");
    } catch {
      /* ignore */
    }
  }, [location.pathname, location.search]);

  return null;
};

export default MetaPixel;