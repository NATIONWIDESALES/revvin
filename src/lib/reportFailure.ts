import { loadSupabase } from "@/lib/supabaseLazy";

type FailureDetail = { error?: unknown; business_id?: string; is_demo?: boolean };

// Only error message/code are read. Never serialize caller objects or form data.
function safeError(error: unknown) {
  const value = error && typeof error === "object" ? error as { message?: unknown; code?: unknown } : {};
  const scrub = (text: unknown) => String(text ?? "")
    .replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]+|Bearer\s+\S+|eyJ[\w.-]+/gi, "[redacted]")
    .replace(/(password|token|secret|authorization)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/\([^)]*\)|"[^"]*"|'[^']*'/g, "[redacted]").slice(0, 300);
  return { message: scrub(value.message ?? (typeof error === "string" ? error : "Operation failed")), code: scrub(value.code) };
}

/** Fire-and-forget operational reporting, separate from visitor analytics. */
export function reportFailure(step: string, detail: FailureDetail = {}): void {
  try {
    if (import.meta.env.MODE === "test" || typeof window === "undefined" || detail.is_demo) return;
    const error = safeError(detail.error);
    void (async () => {
      try {
        const client = await loadSupabase();
        const { data: session } = await client.auth.getSession();
        const uid = session.session?.user.id;
        if (uid) {
          const { data, error: lookupError } = await client.from("businesses").select("is_demo").eq("user_id", uid).limit(1);
          if (lookupError || data?.[0]?.is_demo) return;
        }
        await client.rpc("fn_report_failure", {
          p_step: step, p_message: error.message, p_code: error.code,
          p_route: window.location.pathname.replace(/\/(preview|claim)\/[^/]+/g, "/$1/[redacted]").replace(/\/r\/status\/[^/]+/g, "/r/status/[redacted]"),
          p_business_id: detail.business_id ?? null,
          p_build_id: import.meta.env.VITE_APP_BUILD_ID ?? "development",
          p_user_agent: navigator.userAgent.slice(0, 300),
        });
      } catch { /* Reporting must never affect the customer's operation. */ }
    })();
  } catch { /* Even unusual browser getters must not escape into the UI. */ }
}