import { loadSupabase } from "@/lib/supabaseLazy";

type FailureDetail = { error?: unknown; business_id?: string; is_demo?: boolean; componentStack?: string | null };

/** Keep only source basenames and line/column, never URLs, arguments or arbitrary stack text. */
export function stackLocations(stack: unknown): string {
  if (typeof stack !== "string") return "";
  return stack.split("\n").slice(0, 8).flatMap(line => {
    const match = line.match(/(?:^|[\s/(])([a-zA-Z0-9_.-]+\.(?:[cm]?js|[jt]sx?))(?::(\d+):(\d+)|\?[^\s)]*?:(\d+):(\d+))/);
    if (!match) return [];
    const file = match[1].replace(/eyJ[\w.-]+|[a-f0-9]{24,}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/gi, "redacted");
    return [`${file}:${match[2] ?? match[4]}:${match[3] ?? match[5]}`];
  }).slice(0, 3).join("\n").slice(0, 170);
}

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
    if (step === "render_crash" && detail.componentStack != null) {
      const value = detail.error && typeof detail.error === "object" ? detail.error as { stack?: unknown } : {};
      const stack = stackLocations(value.stack);
      const components = stackLocations(detail.componentStack);
      // Existing server fields each allow 300 chars. Bare locations survive its scrubber.
      error.message = `${error.message.slice(0, 120)}${stack ? `\nstack:\n${stack}` : ""}`.slice(0, 300);
      if (components) error.code = `components:\n${components}`;
    }
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