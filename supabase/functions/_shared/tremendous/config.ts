// Sandbox-only configuration resolution.
//
// Production environments and hosts must fail here, BEFORE any transport call
// is attempted. There is no environment access in this module: the caller passes
// the raw configuration in explicitly.

/** The only base URL this foundation is allowed to talk to. */
export const SANDBOX_BASE_URL = "https://testflight.tremendous.com/api/v2/";

/** Documented API key prefixes (sandbox vs production). */
export const SANDBOX_API_KEY_PREFIX = "TEST_";
export const PRODUCTION_API_KEY_PREFIXES = ["PROD_", "prod_"] as const;

export type CredentialKind = "api_key" | "oauth_access_token";

export interface RawSandboxConfig {
  /** Master kill switch. Defaults to disabled when absent. */
  enabled?: boolean;
  environment?: string;
  baseUrl?: string;
  credentialKind?: CredentialKind;
  credential?: string;
  /** Explicitly approved sandbox campaign/program. Never guessed. */
  campaignId?: string;
  /** Only BALANCE is supported here. */
  fundingSourceId?: string;
}

export interface SandboxConfig {
  environment: "sandbox";
  baseUrl: typeof SANDBOX_BASE_URL;
  credentialKind: CredentialKind;
  credential: string;
  campaignId: string;
  fundingSourceId: "BALANCE";
}

export type ConfigFailureCode =
  | "disabled"
  | "non_sandbox_environment"
  | "non_sandbox_host"
  | "missing_credential"
  | "production_credential_prefix"
  | "invalid_sandbox_api_key_prefix"
  | "missing_campaign"
  | "unsupported_funding_source";

export type ConfigResult =
  | { ok: true; value: SandboxConfig }
  | { ok: false; code: ConfigFailureCode; message: string };

const fail = (code: ConfigFailureCode, message: string): ConfigResult => ({ ok: false, code, message });

/**
 * Resolve a usable sandbox configuration or fail closed.
 * The returned messages never contain credential material.
 */
export function resolveSandboxConfig(raw: RawSandboxConfig | null | undefined): ConfigResult {
  const input = raw ?? {};

  if (input.enabled !== true) {
    return fail("disabled", "Tremendous sandbox foundation is disabled.");
  }
  if (input.environment !== "sandbox") {
    return fail("non_sandbox_environment", "Only the sandbox environment is permitted.");
  }
  if (input.baseUrl !== SANDBOX_BASE_URL) {
    return fail("non_sandbox_host", "Only the sandbox API base URL is permitted.");
  }

  const credential = typeof input.credential === "string" ? input.credential.trim() : "";
  if (!credential) {
    return fail("missing_credential", "No sandbox credential was supplied.");
  }
  if (PRODUCTION_API_KEY_PREFIXES.some((p) => credential.startsWith(p))) {
    return fail("production_credential_prefix", "A production credential prefix was rejected.");
  }

  const credentialKind: CredentialKind = input.credentialKind ?? "api_key";
  // OAuth access tokens are NOT expected to carry API key prefixes, so the
  // prefix rule applies to API keys only.
  if (credentialKind === "api_key" && !credential.startsWith(SANDBOX_API_KEY_PREFIX)) {
    return fail("invalid_sandbox_api_key_prefix", "Sandbox API keys must use the sandbox prefix.");
  }

  const campaignId = typeof input.campaignId === "string" ? input.campaignId.trim() : "";
  if (!campaignId) {
    return fail("missing_campaign", "An explicitly approved sandbox campaign is required.");
  }

  if ((input.fundingSourceId ?? "BALANCE") !== "BALANCE") {
    return fail("unsupported_funding_source", "Only the BALANCE funding source is supported.");
  }

  return {
    ok: true,
    value: {
      environment: "sandbox",
      baseUrl: SANDBOX_BASE_URL,
      credentialKind,
      credential,
      campaignId,
      fundingSourceId: "BALANCE",
    },
  };
}

/** Build an allowed absolute sandbox URL, rejecting arbitrary hosts and traversal. */
export function sandboxUrl(path: string): { ok: true; url: string } | { ok: false; message: string } {
  const clean = path.replace(/^\/+/, "");
  if (!/^[a-z0-9][a-z0-9_\-/]*$/i.test(clean) || clean.includes("..")) {
    return { ok: false, message: "Rejected an unsupported sandbox API path." };
  }
  const url = SANDBOX_BASE_URL + clean;
  if (!url.startsWith(SANDBOX_BASE_URL)) {
    return { ok: false, message: "Rejected a URL outside the sandbox API base." };
  }
  return { ok: true, url };
}
