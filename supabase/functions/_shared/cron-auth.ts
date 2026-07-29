// Shared guard for cron-only edge functions.
//
// A request is authorized when EITHER:
//   1. it carries `x-cron-secret` matching the CRON_SECRET function secret, OR
//   2. its bearer JWT has role === 'service_role' (manual/admin invocation).
//
// Fails closed: if CRON_SECRET is unset, header auth is impossible and only a
// service-role JWT gets through.

/** Length-independent, timing-safe-ish string comparison. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // Compare a fixed-size digest-ish accumulation so length alone does not
  // short-circuit the loop.
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

function jwtRole(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload?.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export interface CronAuthResult {
  ok: boolean;
  via?: "cron_secret" | "service_role";
  reason?: string;
}

export function checkCronAuth(req: Request): CronAuthResult {
  const configured = Deno.env.get("CRON_SECRET") ?? "";

  const provided = req.headers.get("x-cron-secret");
  if (provided && configured && safeEqual(provided, configured)) {
    return { ok: true, via: "cron_secret" };
  }

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token) {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (serviceKey && safeEqual(token, serviceKey)) {
      return { ok: true, via: "service_role" };
    }
    if (jwtRole(token) === "service_role") {
      return { ok: true, via: "service_role" };
    }
  }

  return {
    ok: false,
    reason: configured ? "invalid_credentials" : "cron_secret_not_configured",
  };
}
