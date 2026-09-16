import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { VAPID_PUBLIC_KEY } from "../src/config/pwa";

/**
 * Emits /sw.js from src/pwa/service-worker.js with the build version, the
 * precache list and the push configuration filled in.
 *
 * Written by hand instead of using vite-plugin-pwa: the SEO prerender plugin
 * rewrites dist/index.html and writes extra HTML documents after the bundle
 * closes, so a generated precache manifest would pin stale HTML revisions. The
 * worker here never caches HTML at all, which keeps crawlers and first visits
 * on the fresh prerendered documents.
 */
export default function pwaPlugin(): Plugin {
  const precache = new Set<string>([
    "/offline.html",
    "/manifest.webmanifest",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/maskable-192.png",
    "/icons/badge-96.png",
  ]);

  return {
    name: "revvin-pwa",
    apply: "build",
    generateBundle(_options, bundle) {
      // The entry chunk, the chunks it imports statically and every emitted CSS
      // file. Lazy route chunks stay out: they are fetched on demand and served
      // stale-while-revalidate once seen.
      const entry = Object.values(bundle).find(
        (c) => c.type === "chunk" && (c as { isEntry?: boolean }).isEntry,
      ) as { fileName: string; imports: string[] } | undefined;
      if (entry) {
        precache.add(`/${entry.fileName}`);
        for (const imp of entry.imports ?? []) precache.add(`/${imp}`);
      }
      for (const file of Object.values(bundle)) {
        if (file.type === "asset" && file.fileName.endsWith(".css")) {
          precache.add(`/${file.fileName}`);
        }
      }
    },
    closeBundle() {
      const dist = path.resolve(process.cwd(), "dist");
      if (!fs.existsSync(dist)) return;
      const source = fs.readFileSync(
        path.resolve(process.cwd(), "src/pwa/service-worker.js"),
        "utf8",
      );
      const version = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
      const env = readEnv();
      const resubscribeUrl = env.VITE_SUPABASE_URL
        ? `${env.VITE_SUPABASE_URL}/functions/v1/push-resubscribe`
        : "/functions/v1/push-resubscribe";

      // replaceAll, not replace: the file's own comment mentions the tokens, so a
      // single replacement would leave the real placeholders untouched.
      const out = source
        .replaceAll("__VERSION__", version)
        .replaceAll("__PRECACHE__", JSON.stringify([...precache].sort()))
        .replaceAll("__VAPID_PUBLIC_KEY__", VAPID_PUBLIC_KEY)
        .replaceAll("__RESUBSCRIBE_URL__", resubscribeUrl);

      fs.writeFileSync(path.join(dist, "sw.js"), out, "utf8");
      console.log(`[pwa] wrote sw.js (version ${version}, ${precache.size} precached files)`);
    },
  };
}

/** Minimal .env reader; process env wins, same as Vite. */
function readEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of [".env", ".env.local", ".env.production"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  if (process.env.VITE_SUPABASE_URL) out.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  return out;
}
