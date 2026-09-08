// Shared guard for cron-only edge functions.
//
// A request is authorized when EITHER:
//   1. it carries `x-cron-secret` matching the CRON_SECRET function secret, OR
//   2. its bearer token exactly matches the configured service-role credential.
//
// Fails closed: if CRON_SECRET is unset, header auth is impossible and only a
// configured service-role credential gets through. Decoding a JWT is never
// authentication: a caller can put any role in an unsigned payload.

/** Compare every byte without exiting at the first mismatch. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // This avoids an early mismatch return; JavaScript does not guarantee
  // constant-time execution.
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

export interface CronAuthResult {
  ok: boolean;
  via?: "cron_secret" | "service_role";
  reason?: string;
}

export interface CronCredentials {
  cronSecret: string;
  serviceRoleKey: string;
}

function runtimeCredentials(): CronCredentials {
  const env = (globalThis as typeof globalThis & {
    Deno?: { env: { get(name: string): string | undefined } };
  }).Deno?.env;
  return {
    cronSecret: env?.get("CRON_SECRET") ?? "",
    serviceRoleKey: env?.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  };
}

export function checkCronAuth(req: Request, credentials: CronCredentials = runtimeCredentials()): CronAuthResult {
  const configured = credentials.cronSecret;

  const provided = req.headers.get("x-cron-secret");
  if (provided && configured && safeEqual(provided, configured)) {
    return { ok: true, via: "cron_secret" };
  }

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token) {
    const serviceKey = credentials.serviceRoleKey;
    if (serviceKey && safeEqual(token, serviceKey)) {
      return { ok: true, via: "service_role" };
    }
  }

  return {
    ok: false,
    reason: configured ? "invalid_credentials" : "cron_secret_not_configured",
  };
}
