import { lazy as reactLazy, type ComponentType } from "react";

export const CHUNK_RELOAD_KEY = "revvin:chunk-reload-at";
export const CHUNK_RELOAD_PARAM = "_revvin_reload";
export const CHUNK_RELOAD_INTERVAL = 5 * 60 * 1000;
let reloadStarted = false;

export function isChunkLoadError(error: unknown): boolean {
  const message = typeof error === "string" ? error :
    error && typeof error === "object" && "message" in error ? String(error.message) : "";
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  return /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(`${name} ${message}`);
}

/** Persist the guard before navigation. If storage is blocked, keep the existing error path. */
export function recoverChunkLoad(error: unknown, host: Window | undefined = typeof window === "undefined" ? undefined : window, now = Date.now()): boolean {
  if (!host || !isChunkLoadError(error)) return false;
  if (reloadStarted) return true;
  try {
    const url = new URL(host.location.href);
    const lastReload = Math.max(Number(host.sessionStorage.getItem(CHUNK_RELOAD_KEY)) || 0, Number(url.searchParams.get(CHUNK_RELOAD_PARAM)) || 0);
    if (lastReload && now - lastReload < CHUNK_RELOAD_INTERVAL) return false;
    host.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
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
  const onPreloadError = (event: Event) => {
    if (recoverChunkLoad((event as Event & { payload?: unknown }).payload, host)) event.preventDefault();
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