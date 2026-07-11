import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const EXPECTED_PROJECT_REF = "olmpplfgzegzqdcznlrp";

type Check = { label: string; value: string; ok: boolean };

type EmailResult = {
  ok: boolean;
  step?: string;
  hasLovableKey?: boolean;
  hasResendKey?: boolean;
  from?: string;
  to?: string;
  latencyMs?: number;
  messageId?: string;
  subject?: string;
  error?: string;
};

type LogRow = {
  id: string;
  type: string;
  recipient_email: string;
  subject: string;
  status: string;
  created_at: string;
};

type ResendStatus = {
  checkedAt: string;
  hasLovableKey: boolean;
  hasResendKey: boolean;
  fromAddress: string;
  sendingDomain: string | null;
  gatewayOk: boolean;
  latencyMs?: number;
  domain: { name: string; status: string; region?: string; createdAt?: string } | null;
  allDomains?: Array<{ name: string; status: string }>;
  error?: string | null;
};

export default function ConnectionHealth() {
  const { user, userRole, loading } = useAuth();
  const isAdmin = userRole === "admin";
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(true);
  const [emailResult, setEmailResult] = useState<EmailResult | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [recentLogs, setRecentLogs] = useState<LogRow[]>([]);
  const [resendStatus, setResendStatus] = useState<ResendStatus | null>(null);
  const [checkingResend, setCheckingResend] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const refreshResendStatus = async () => {
    setCheckingResend(true);
    setResendError(null);
    try {
      const { data, error } = await supabase.functions.invoke("resend-status");
      if (error) {
        setResendError(error.message);
      } else {
        setResendStatus(data as ResendStatus);
      }
    } finally {
      setCheckingResend(false);
    }
  };

  const loadRecentLogs = async () => {
    const { data } = await supabase
      .from("notifications_log")
      .select("id,type,recipient_email,subject,status,created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    setRecentLogs((data as LogRow[]) || []);
  };

  const sendTestEmail = async () => {
    setSendingTest(true);
    setEmailResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("email-health-check");
      if (error) {
        setEmailResult({ ok: false, error: error.message });
      } else {
        setEmailResult(data as EmailResult);
      }
      await loadRecentLogs();
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    if (loading || !isAdmin) return;
    (async () => {
      const url = import.meta.env.VITE_SUPABASE_URL as string;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
      const refFromUrl = (url || "").match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] ?? "unknown";

      const next: Check[] = [
        { label: "Backend URL", value: url || "(missing)", ok: !!url },
        { label: "Project ref (from URL)", value: refFromUrl, ok: refFromUrl === EXPECTED_PROJECT_REF },
        { label: "VITE_SUPABASE_PROJECT_ID", value: projectId || "(missing)", ok: projectId === EXPECTED_PROJECT_REF },
        { label: "Expected project ref", value: EXPECTED_PROJECT_REF, ok: true },
      ];

      // Live DB read
      const t0 = performance.now();
      const { data, error } = await supabase.from("businesses").select("id", { count: "exact", head: true });
      const ms = Math.round(performance.now() - t0);
      next.push({
        label: "Live DB read (businesses)",
        value: error ? `ERROR: ${error.message}` : `ok (${ms}ms)`,
        ok: !error,
      });

      // Auth session round-trip
      const { data: s } = await supabase.auth.getSession();
      next.push({
        label: "Auth session",
        value: s.session ? `signed in as ${s.session.user.email}` : "no session",
        ok: !!s.session,
      });

      setChecks(next);
      setRunning(false);
      await loadRecentLogs();
      await refreshResendStatus();
    })();
  }, [loading, isAdmin]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const allGood = checks.length > 0 && checks.every((c) => c.ok);

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Connection Health</h1>
        <p className="mt-2 text-muted-foreground">
          Verifies the Revvin app is reading from the correct Lovable Cloud backend.
        </p>

        <div className="mt-8 rounded-lg border border-border bg-card divide-y divide-border">
          {running && <div className="p-6 text-sm text-muted-foreground">Running checks…</div>}
          {checks.map((c) => (
            <div key={c.label} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{c.label}</div>
                <div className="mt-1 text-xs font-mono break-all text-muted-foreground">{c.value}</div>
              </div>
              <span
                className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  c.ok
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {c.ok ? "OK" : "FAIL"}
              </span>
            </div>
          ))}
        </div>

        {!running && (
          <div
            className={`mt-6 rounded-lg p-4 text-sm font-medium ${
              allGood
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {allGood
              ? `✓ Connected to Lovable Cloud project ${EXPECTED_PROJECT_REF}`
              : "⚠ One or more checks failed, review above."}
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Resend configuration</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifies the Resend API key is present and the sending domain is verified.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={refreshResendStatus}
              disabled={checkingResend}
              className="inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
            >
              {checkingResend ? "Checking…" : "Recheck"}
            </button>
            {resendStatus && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  resendStatus.hasResendKey && resendStatus.gatewayOk && resendStatus.domain?.status === "verified"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {resendStatus.hasResendKey && resendStatus.gatewayOk && resendStatus.domain?.status === "verified"
                  ? "Ready to send"
                  : "Attention needed"}
              </span>
            )}
          </div>

          {(resendStatus || resendError) && (
            <div className="mt-4 rounded-lg border border-border bg-card divide-y divide-border">
              {resendStatus && (
                <>
                  <Row
                    label="RESEND_API_KEY"
                    value={resendStatus.hasResendKey ? "present" : "missing"}
                    ok={resendStatus.hasResendKey}
                  />
                  <Row
                    label="LOVABLE_API_KEY"
                    value={resendStatus.hasLovableKey ? "present" : "missing"}
                    ok={resendStatus.hasLovableKey}
                  />
                  <Row label="From address" value={resendStatus.fromAddress} ok={!!resendStatus.fromAddress} />
                  <Row
                    label="Sending domain"
                    value={resendStatus.sendingDomain || "(not parsed)"}
                    ok={!!resendStatus.sendingDomain}
                  />
                  <Row
                    label="Resend gateway reachable"
                    value={
                      resendStatus.gatewayOk
                        ? `ok${typeof resendStatus.latencyMs === "number" ? ` (${resendStatus.latencyMs}ms)` : ""}`
                        : "failed"
                    }
                    ok={resendStatus.gatewayOk}
                  />
                  <Row
                    label="Domain verification"
                    value={
                      resendStatus.domain
                        ? `${resendStatus.domain.name} · ${resendStatus.domain.status}${
                            resendStatus.domain.region ? ` · ${resendStatus.domain.region}` : ""
                          }`
                        : "not found in Resend account"
                    }
                    ok={resendStatus.domain?.status === "verified"}
                  />
                  <Row
                    label="Last checked"
                    value={new Date(resendStatus.checkedAt).toLocaleString()}
                    ok={true}
                  />
                </>
              )}
              {(resendStatus?.error || resendError) && (
                <div className="p-4">
                  <div className="text-sm font-medium text-red-700">Error</div>
                  <div className="mt-1 text-xs font-mono whitespace-pre-wrap break-all text-red-700">
                    {resendError || resendStatus?.error}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Email delivery health</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sends a real message through the Resend gateway to the admin inbox and logs the outcome.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={sendTestEmail}
              disabled={sendingTest}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {sendingTest ? "Sending test email…" : "Send test email"}
            </button>
            {emailResult && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  emailResult.ok
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {emailResult.ok ? "Delivered to Resend" : "Failed"}
              </span>
            )}
          </div>

          {emailResult && (
            <div className="mt-4 rounded-lg border border-border bg-card p-4 text-xs font-mono space-y-1 text-muted-foreground">
              <div>from: {emailResult.from}</div>
              <div>to: {emailResult.to}</div>
              {typeof emailResult.latencyMs === "number" && <div>latency: {emailResult.latencyMs}ms</div>}
              {emailResult.messageId && <div>message id: {emailResult.messageId}</div>}
              <div>LOVABLE_API_KEY: {emailResult.hasLovableKey ? "present" : "missing"}</div>
              <div>RESEND_API_KEY: {emailResult.hasResendKey ? "present" : "missing"}</div>
              {emailResult.error && <div className="text-red-700 whitespace-pre-wrap break-all">error: {emailResult.error}</div>}
            </div>
          )}

          <div className="mt-6 rounded-lg border border-border bg-card">
            <div className="p-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recent notifications (last 10)
            </div>
            {recentLogs.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No entries yet.</div>
            )}
            {recentLogs.map((row) => (
              <div key={row.id} className="p-3 border-b border-border last:border-b-0 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{row.subject || row.type}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground truncate">
                    {row.type} · {row.recipient_email} · {new Date(row.created_at).toLocaleString()}
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    row.status === "sent"
                      ? "bg-green-100 text-green-800"
                      : row.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}