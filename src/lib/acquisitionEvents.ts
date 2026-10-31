export const ACQUISITION_EVENTS = new Set(["preview_started", "preview_submitted", "signup_completed"]);
export function acquisitionEventPath(event: string, pathname: string): string | null {
  if (event === "signup_completed") return ["/signup", "/auth", "/welcome", "/dashboard"].includes(pathname) ? pathname : null;
  return ["preview_started", "preview_submitted"].includes(event) && (/^\/start(?:\/[a-z-]{1,40})?$/.test(pathname) || pathname === "/") ? pathname : null;
}