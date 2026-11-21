import { isHomeServiceTrade } from "./signup-trade.ts";

export const SEND_HASHED_EMAIL = false;
export const META_DATASET_ID = "1941132123224407";
export const registrationEventId = (userId: string) => `reg_${userId}`;

/** Signup intent only, never an authorization or role grant. */
export function eligibleBusinessRegistration(user: { created_at: string; user_metadata?: Record<string, unknown> }, business?: { is_demo?: boolean } | null, now = Date.now()) {
  const created = Date.parse(user.created_at);
  const metadata = user.user_metadata;
  return metadata?.role === "business" && isHomeServiceTrade(metadata?.signup_trade) && metadata?.is_demo !== true && business?.is_demo !== true
    && Number.isFinite(created) && created <= now && now - created <= 10 * 60 * 1000;
}

export async function hashEmail(email: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.trim().toLowerCase()));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function validMetaCookie(value: unknown, click = false, now = Date.now()): value is string {
  if (typeof value !== "string" || value.length > 540) return false;
  const match = value.match(click ? /^fb\.1\.(\d{13})\.([A-Za-z0-9_.-]{1,500})$/ : /^fb\.1\.(\d{13})\.(\d{1,30})$/);
  return Boolean(match && Number(match[1]) > 0 && Number(match[1]) <= now);
}

export type RegistrationInput = {
  userId: string; createdAt: string; advertisingAllowed: boolean;
  fbc?: string; fbp?: string; ip?: string; userAgent: string;
};

export function registrationPayload(input: RegistrationInput, testCode?: string) {
  const user_data: Record<string, string> = { client_user_agent: input.userAgent };
  if (input.ip) user_data.client_ip_address = input.ip;
  if (validMetaCookie(input.fbc, true)) user_data.fbc = input.fbc;
  if (validMetaCookie(input.fbp)) user_data.fbp = input.fbp;
  return {
    data: [{ event_name: "CompleteRegistration", event_time: Math.floor(Date.parse(input.createdAt) / 1000),
      action_source: "website", event_source_url: "https://revvin.co/signup", event_id: registrationEventId(input.userId), user_data }],
    partner_agent: "lovable",
    ...(testCode ? { test_event_code: testCode } : {}),
  };
}

export const META_GRAPH_VERSION = "v26.0";
export const META_GATEWAY_URL = "https://connector-gateway.lovable.dev/meta_ads";

/** Linked Meta connection transport. The gateway supplies Meta authentication; no Meta token exists in app code. */
export function gatewayTransport(lovableApiKey: string, connectionKey: string, fetcher: typeof fetch = fetch) {
  return (payload: ReturnType<typeof registrationPayload>, signal: AbortSignal) =>
    fetcher(`${META_GATEWAY_URL}/${META_GRAPH_VERSION}/${META_DATASET_ID}/events`, {
      method: "POST", signal, body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableApiKey}`, "X-Connection-Api-Key": connectionKey },
    });
}

/** No retries. */
export async function sendRegistration(input: RegistrationInput, options: {
  token?: string; testCode?: string;
  transport?: (payload: ReturnType<typeof registrationPayload>, signal: AbortSignal) => Promise<Response>;
  log?: (message: string) => void;
}) {
  if (!input.advertisingAllowed) return "consent_blocked";
  if (!options.token) { options.log?.("capi disabled: no token"); return "disabled"; }
  if (!options.transport) return "connection_required";
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      options.transport(registrationPayload(input, options.testCode), controller.signal),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, 3000); }),
    ]);
    await response.text();
    // Provider text may echo identifiers or credentials. Never log it.
    if (!response.ok) options.log?.(`capi status: ${response.status}`);
    return response.ok ? "sent" : "failed";
  } catch { return "failed"; }
  finally { clearTimeout(timer); }
}