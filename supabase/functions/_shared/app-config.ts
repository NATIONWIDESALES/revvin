export const APP_URL = (Deno.env.get("APP_URL") || "https://revvin.co").replace(/\/+$/, "");
export const RESEND_FROM_ADDRESS =
  Deno.env.get("RESEND_FROM_ADDRESS") || "Revvin <info@revvin.co>";
export const RESEND_REPLY_TO = Deno.env.get("RESEND_REPLY_TO") || "info@revvin.co";
export const ADMIN_NOTIFICATION_EMAIL =
  Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "info@revvin.co";

export function appUrl(path = "") {
  if (!path) return APP_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${APP_URL}${normalizedPath}`;
}

const ALLOWED_ORIGIN = /^https:\/\/((www\.)?revvin\.co|[a-z0-9-]+\.lovable\.app)$/;

/** Return destination for Stripe flows: only trusted app origins, never a caller-chosen site. */
export function checkoutOrigin(req: Request) {
  const env = Deno.env.get("APP_URL");
  if (env) return env.replace(/\/+$/, "");
  const o = (req.headers.get("origin") || "").replace(/\/+$/, "");
  return ALLOWED_ORIGIN.test(o) ? o : APP_URL;
}
