import { SERVICE_WORKER_PATH, shouldRegisterServiceWorker } from "@/config/pwa";

/**
 * Registers the service worker, but only on a production origin outside any
 * iframe or Lovable preview. Anywhere else it actively unregisters a worker
 * that a previous visit may have left behind, so a stale cache can never keep
 * serving deleted chunks in the editor.
 */
export async function initServiceWorker(
  onUpdateReady: () => void,
  reload: () => void = () => window.location.reload(),
) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const allowed = shouldRegisterServiceWorker({
    self: window.self,
    top: window.top,
    location: { hostname: window.location.hostname, search: window.location.search },
    isProduction: import.meta.env.PROD,
  });

  if (!allowed) {
    const existing = await navigator.serviceWorker.getRegistrations().catch(() => []);
    for (const reg of existing) {
      if (reg.active?.scriptURL.endsWith(SERVICE_WORKER_PATH)) await reg.unregister();
    }
    return;
  }

  // A page that was served while an older worker was in control reloads once
  // the moment a new worker takes over, so a returning visitor never stays on
  // a previous deployment. The worker itself never caches HTML, so the reload
  // always fetches the current document from the network.
  if (navigator.serviceWorker.controller) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      reload();
    });
  }

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, { updateViaCache: "none" });

    // Ask the browser for a new worker right away, again whenever the tab
    // becomes visible, and hourly while the tab stays open. Without this the
    // browser may not check for a new deployment for up to a day.
    const checkForUpdate = () => void registration.update().catch(() => {});
    checkForUpdate();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
    window.setInterval(checkForUpdate, 60 * 60 * 1000);

    if (registration.waiting && navigator.serviceWorker.controller) onUpdateReady();

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) onUpdateReady();
      });
    });
  } catch {
    /* a failed registration must never break the app */
  }
}

/** Activates the waiting worker and reloads once it takes control. */
export async function applyServiceWorkerUpdate() {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.waiting) {
    window.location.reload();
    return;
  }
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
    once: true,
  });
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
}
