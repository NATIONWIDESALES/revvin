import { isMarketingPath } from "./supabaseLazy";

export const FIRST_TOUCH_KEY = "revvin_first_touch";
export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export type FirstTouch = { landing_path: string } & Partial<Record<(typeof UTM_KEYS)[number], string>>;

export function readFirstTouch(): FirstTouch | null {
  try {
    const input = JSON.parse(sessionStorage.getItem(FIRST_TOUCH_KEY) || "null");
    if (!input || typeof input.landing_path !== "string" || !/^\/[^?#\s]*$/.test(input.landing_path) || input.landing_path.length > 160) return null;
    const data: FirstTouch = { landing_path: input.landing_path };
    for (const key of UTM_KEYS) {
      if (typeof input[key] === "string" && input[key]) data[key] = input[key].slice(0, 200);
    }
    return data;
  } catch { return null; }
}

/** Called at document startup only, never from client-side route changes. */
export function captureFirstTouch(href: string): void {
  try {
    if (sessionStorage.getItem(FIRST_TOUCH_KEY) !== null) return;
    const url = new URL(href);
    const publicPath = isMarketingPath(url.pathname) || /^\/(?:signup|auth|login|reset-password|browse|marketplace|offer|r|feedback|print|docs|preview|i|earn)(?:\/|$)/.test(url.pathname);
    if (!publicPath) return;
    const data: FirstTouch = { landing_path: url.pathname.slice(0, 160) };
    for (const key of UTM_KEYS) {
      const value = url.searchParams.get(key);
      if (value) data[key] = value.slice(0, 200);
    }
    sessionStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(data));
  } catch { /* Signup retains its current-URL fallback when storage is unavailable. */ }
}