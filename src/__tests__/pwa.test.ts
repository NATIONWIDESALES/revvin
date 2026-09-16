import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { shouldRegisterServiceWorker } from "@/config/pwa";

const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
const workerSource = readFileSync("src/pwa/service-worker.js", "utf8");
const indexHtml = readFileSync("index.html", "utf8");
const pushSource = readFileSync("supabase/functions/_shared/push.ts", "utf8");

describe("web app manifest", () => {
  it("describes an installable standalone app", () => {
    expect(manifest.name).toContain("Revvin");
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toContain("/dashboard");
    expect(manifest.theme_color).toMatch(/^#/);
    expect(manifest.background_color).toMatch(/^#/);
  });

  it("ships the icon sizes Android and iOS need, including maskable", () => {
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    for (const size of ["192x192", "512x512"]) expect(sizes).toContain(size);
    const maskable = manifest.icons.filter((icon: { purpose?: string }) =>
      (icon.purpose || "").includes("maskable"),
    );
    expect(maskable.length).toBeGreaterThanOrEqual(2);
  });

  it("is linked from the document head together with the iOS metadata", () => {
    expect(indexHtml).toContain('rel="manifest"');
    expect(indexHtml).toContain("apple-mobile-web-app-capable");
    expect(indexHtml).toContain("apple-touch-icon");
    expect(indexHtml).toContain("viewport-fit=cover");
  });
});

describe("service worker safety rules", () => {
  it("never caches an HTML document, so crawlers and first visits get the prerendered page", () => {
    expect(workerSource).not.toMatch(/cache\.put\([^)]*navigat/i);
    expect(workerSource).toMatch(/text\/html/);
  });

  it("skips anything that is not a same-origin GET", () => {
    expect(workerSource).toContain('request.method !== "GET"');
    expect(workerSource).toContain("self.location.origin");
  });

  it("never touches auth or backend API traffic", () => {
    for (const path of ["/auth", "/login", "/signup", "/reset-password"]) {
      expect(workerSource).toContain(`"${path}"`);
    }
    expect(workerSource).toMatch(/\/rest\/v1|supabase/i);
    expect(workerSource).toContain("/functions/v1");
  });

  it("keeps an escape hatch and an offline fallback", () => {
    expect(workerSource).toContain("sw=off");
    expect(workerSource).toContain("/offline.html");
  });
});

describe("registration guard", () => {
  const win = {} as Window;
  const base = { self: win, top: win, isProduction: true };

  it("registers on the production domains only", () => {
    for (const hostname of ["revvin.co", "www.revvin.co", "revvin.lovable.app"]) {
      expect(shouldRegisterServiceWorker({ ...base, location: { hostname, search: "" } })).toBe(true);
    }
  });

  it("never registers in the editor preview, an iframe, development or with sw=off", () => {
    expect(
      shouldRegisterServiceWorker({
        ...base,
        location: { hostname: "id-preview--abc.lovable.app", search: "" },
      }),
    ).toBe(false);
    expect(
      shouldRegisterServiceWorker({
        self: win,
        top: {} as Window,
        isProduction: true,
        location: { hostname: "revvin.co", search: "" },
      }),
    ).toBe(false);
    expect(
      shouldRegisterServiceWorker({
        ...base,
        isProduction: false,
        location: { hostname: "revvin.co", search: "" },
      }),
    ).toBe(false);
    expect(
      shouldRegisterServiceWorker({ ...base, location: { hostname: "revvin.co", search: "?sw=off" } }),
    ).toBe(false);
    expect(
      shouldRegisterServiceWorker({ ...base, location: { hostname: "localhost", search: "" } }),
    ).toBe(false);
  });
});

describe("build output", () => {
  it("fills in every service worker placeholder, including the ones named in its own comment", () => {
    const plugin = readFileSync("plugins/pwa.ts", "utf8");
    for (const token of ["__VERSION__", "__PRECACHE__", "__VAPID_PUBLIC_KEY__", "__RESUBSCRIBE_URL__"]) {
      expect(plugin).toContain(`replaceAll("${token}"`);
    }
  });
});

describe("push failure handling", () => {
  it("treats a gone endpoint as permanently gone so dead devices stop being retried", () => {
    expect(pushSource).toMatch(/404[\s\S]{0,40}410/);
    expect(pushSource).toContain('"gone"');
    expect(pushSource).toContain("disabled_at");
  });

  it("logs every attempt", () => {
    expect(pushSource).toContain("push_send_log");
  });
});
