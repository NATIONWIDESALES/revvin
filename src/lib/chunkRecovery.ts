import { lazy as reactLazy, type ComponentType } from "react";
import { reportFailure } from "@/lib/reportFailure";

export const CHUNK_RELOAD_KEY = "revvin:chunk-reload-at";
export const CHUNK_RELOAD_PARAM = "_revvin_reload";
export const CHUNK_RELOAD_INTERVAL = 30 * 1000;
export const CHUNK_REPORT_KEY = "revvin:chunk-reload-report";
let reloadStarted = false;

export function chunkReloadKey(href: string): string {
  return `${CHUNK_RELOAD_KEY}:${new URL(href).pathname}`;
}

export function isChunkLoadError(error: unknown): boolean {
  const message = typeof error === "string" ? error :
    error && typeof error === "object" && "message" in error ? String(error.message) : "";
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  return /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Unable to preload CSS/i.test(`${name} ${message}`);
}

/** Persist the guard before navigation. If storage is blocked, keep the existing error path. */
export function recoverChunkLoad(error: unknown, host: Window | undefined = typeof window === "undefined" ? undefined : window, now = Date.now()): boolean {
  if (!host || !isChunkLoadError(error)) return false;
  if (reloadStarted) return true;
  try {
    const url = new URL(host.location.href);
    const key = chunkReloadKey(url.href);
    const lastReload = Math.max(Number(host.sessionStorage.getItem(key)) || 0, Number(host.sessionStorage.getItem(CHUNK_RELOAD_KEY)) || 0, Number(url.searchParams.get(CHUNK_RELOAD_PARAM)) || 0);
    if (lastReload && now - lastReload < CHUNK_RELOAD_INTERVAL) return false;
    host.sessionStorage.setItem(key, String(now));
    if (host.sessionStorage.getItem(key) !== String(now)) return false;
    // Report from the fresh document, not an unload-racing lazy backend import.
    host.sessionStorage.setItem(CHUNK_REPORT_KEY, "pending");
    url.searchParams.set(CHUNK_RELOAD_PARAM, String(now));
    reloadStarted = true;
    host.location.replace(url.href);
    return true;
  } catch {
    reloadStarted = false;
    return false;
  }
}

export function installChunkRecovery(host: Window = window): () => void {
  try {
    if (host.sessionStorage.getItem(CHUNK_REPORT_KEY) === "pending") {
      host.sessionStorage.removeItem(CHUNK_REPORT_KEY);
      // The existing RPC allowlists render_crash. Distinguish recovery via code/message.
      reportFailure("render_crash", { error: { code: "chunk_reload", message: "chunk_reload: stale deployment module; automatic recovery attempted" } });
    }
  } catch { /* Blocked storage must not prevent startup. */ }
  const onPreloadError = (event: Event) => {
    const payload = (event as Event & { payload?: unknown }).payload;
    if (recoverChunkLoad(isChunkLoadError(payload) ? payload : new Error("Failed to fetch dynamically imported module"), host)) event.preventDefault();
  };
  host.addEventListener("vite:preloadError", onPreloadError);
  return () => host.removeEventListener("vite:preloadError", onPreloadError);
}

export function lazyWithChunkRecovery<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return reactLazy(() => load().catch(error => {
    if (recoverChunkLoad(error)) return new Promise<{ default: T }>(() => {});
    throw error;
  }));
}