/* eslint-disable no-undef */
/**
 * Revvin service worker. Plain JavaScript, copied to /sw.js at build time with
 * __VERSION__ and __PRECACHE__ filled in by plugins/pwa.ts.
 *
 * Strategy:
 * - HTML and navigations: network only. No HTML is ever written to a cache, so
 *   a returning visitor always gets the current deployment's document. The
 *   offline page is served only when the network request actually failed.
 * - Hashed static assets (/assets/*, /fonts/*): cache first. Their names change
 *   on every content change, so a cached copy can never be stale.
 * - Everything else (API, auth, third party, unhashed files): untouched.
 * - A new worker takes over at once (skipWaiting + clients.claim) and deletes
 *   every cache that does not belong to this exact version, including the
 *   revvin-precache-*, revvin-assets-* and revvin-images-* caches of older
 *   builds.
 */

const VERSION = "__VERSION__";
const PRECACHE = "revvin-precache-" + VERSION;
const ASSETS = "revvin-assets-" + VERSION;
const KEEP = [PRECACHE, ASSETS];

const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = __PRECACHE__;

/** Anything that must never be intercepted, cached or replayed. */
function isExcluded(request, url) {
  if (request.method !== "GET") return true;
  if (url.origin !== self.location.origin) {
    // Third party: Supabase, Stripe and analytics all go straight to the
    // network. Nothing cross origin is cached.
    return true;
  }
  if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) return true;
  if (url.pathname.startsWith("/login") || url.pathname.startsWith("/signup")) return true;
  if (url.pathname.startsWith("/reset-password")) return true;
  if (url.pathname.startsWith("/~")) return true;
  if (
    url.pathname.startsWith("/rest/v1") ||
    url.pathname.startsWith("/auth/v1") ||
    url.pathname.startsWith("/storage/v1") ||
    url.pathname.startsWith("/functions/v1")
  ) {
    return true;
  }
  if (url.search.includes("sw=off")) return true;
  return false;
}

/** Content-hashed build output only. Unhashed files are never cached. */
const isHashedAsset = (url) =>
  (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/fonts/")) &&
  /\.(js|mjs|css|woff2?|png|jpe?g|webp|avif|svg)$/i.test(url.pathname);

const isNavigation = (request) =>
  request.mode === "navigate" ||
  request.destination === "document" ||
  (request.headers.get("accept") || "").includes("text/html");

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      await Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(new Request(u, { cache: "reload" }))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.allSettled(
        names.filter((n) => KEEP.indexOf(n) === -1).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

/** Network only. Falls back to the offline page when the network failed, never to cached HTML. */
async function handleNavigation(request) {
  try {
    return await fetch(request, { cache: "no-store" });
  } catch (err) {
    const cache = await caches.open(PRECACHE);
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSETS);
  const cached = (await cache.match(request)) || (await caches.open(PRECACHE).then((c) => c.match(request)));
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (isExcluded(request, url)) return;

  if (isNavigation(request)) {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (isHashedAsset(url)) {
    event.respondWith(cacheFirstAsset(request));
  }
  // Anything else falls through to the browser's normal network handling.
});

/* Web push ---------------------------------------------------------------- */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { title: "Revvin", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Revvin";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: payload.tag || "revvin",
      renotify: true,
      data: { url: payload.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientsList) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const oldEndpoint = event.oldSubscription ? event.oldSubscription.endpoint : null;
      let fresh = event.newSubscription || null;
      if (!fresh) {
        try {
          fresh = await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: "__VAPID_PUBLIC_KEY__",
          });
        } catch (err) {
          return;
        }
      }
      try {
        await fetch("__RESUBSCRIBE_URL__", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ old_endpoint: oldEndpoint, subscription: fresh.toJSON() }),
        });
      } catch (err) {
        /* the next opt-in from the app re-registers the subscription */
      }
    })(),
  );
});
