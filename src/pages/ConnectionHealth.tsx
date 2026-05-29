import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const EXPECTED_PROJECT_REF = "olmpplfgzegzqdcznlrp";

type Check = { label: string; value: string; ok: boolean };

export default function ConnectionHealth() {
  const { user, userRole, loading } = useAuth();
  const isAdmin = userRole === "admin";
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(true);

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
              : "⚠ One or more checks failed — review above."}
          </div>
        )}
      </div>
    </div>
  );
}