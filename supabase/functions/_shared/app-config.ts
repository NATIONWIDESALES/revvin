export const APP_URL = (Deno.env.get("APP_URL") || "https://revvin.co").replace(/\/+$/, "");
export const RESEND_FROM_ADDRESS =
  Deno.env.get("RESEND_FROM_ADDRESS") || "Revvin <updates@revvin.co>";
export const RESEND_REPLY_TO = Deno.env.get("RESEND_REPLY_TO") || "support@revvin.co";
export const ADMIN_NOTIFICATION_EMAIL =
  Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "info@revvin.co";

export function appUrl(path = "") {
  if (!path) return APP_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${APP_URL}${normalizedPath}`;
}

export function checkoutOrigin(req: Request) {
  return (Deno.env.get("APP_URL") || req.headers.get("origin") || APP_URL).replace(/\/+$/, "");
}
