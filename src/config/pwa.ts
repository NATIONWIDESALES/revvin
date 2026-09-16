// Installable app and web push configuration.
//
// The VAPID public key is meant to be public: the browser needs it to create a
// push subscription. The matching private key lives only in backend secrets as
// VAPID_PRIVATE_KEY and is never shipped to the client.

export const VAPID_PUBLIC_KEY =
  "BOtPUsZxzNrKoCZA_tIeLZ_YUpdLSKUmWcfYfORgZ5Gk0dRzGJmeKmEya_FoEaKf8pbDfb_mezvYKUpydRNgaVs";

/** Where the service worker is served from, and the scope it controls. */
export const SERVICE_WORKER_PATH = "/sw.js";

/** How long an install hint stays dismissed. */
export const INSTALL_HINT_DAYS = 14;
export const INSTALL_HINT_KEY = "revvin_install_hint_dismissed_at";

/**
 * Hosts allowed to register the service worker. The Lovable editor preview,
 * any iframe and development must never register one: a worker there can keep
 * serving stale HTML and deleted chunks long after the code changed.
 */
export const isProductionOrigin = (hostname: string) =>
  hostname === "revvin.co" ||
  hostname === "www.revvin.co" ||
  hostname === "revvin.lovable.app";

export const isPreviewOrIframeContext = (win: {
  self: unknown;
  top: unknown;
  location: { hostname: string; search: string };
}) => {
  const h = win.location.hostname;
  if (win.self !== win.top) return true;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  if (win.location.search.includes("sw=off")) return true;
  return false;
};

/** True only where a service worker is both safe and wanted. */
export const shouldRegisterServiceWorker = (win: {
  self: unknown;
  top: unknown;
  location: { hostname: string; search: string };
  isProduction: boolean;
}) => {
  if (!win.isProduction) return false;
  if (isPreviewOrIframeContext(win)) return false;
  return isProductionOrigin(win.location.hostname);
};

/** Standalone means the app was launched from a home screen or app icon. */
export const isStandalone = () => {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    nav.standalone === true
  );
};

export const isIos = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
};

/** In-app browsers cannot add to the home screen, so we send people to Safari. */
export const isInAppBrowser = () => {
  if (typeof navigator === "undefined") return false;
  return /FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp|Snapchat/i.test(navigator.userAgent);
};
