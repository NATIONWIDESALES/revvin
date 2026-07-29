import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/** Funnel order — keep in sync with src/lib/track.ts event names. */
const FUNNEL_ORDER: { event: string; label: string }[] = [
  { event: "sample_page_viewed", label: "Sample page viewed" },
  { event: "signup_viewed", label: "Signup viewed" },
  { event: "signup_submitted", label: "Signup submitted" },
  { event: "signup_succeeded", label: "Signup succeeded" },
  { event: "signup_failed", label: "Signup failed" },
  { event: "onboarding_started", label: "Onboarding started" },
  { event: "onboarding_completed", label: "Onboarding completed" },
  { event: "go_live_clicked", label: "Go live clicked" },
  { event: "checkout_redirected", label: "Checkout redirected" },
  { event: "checkout_succeeded", label: "Checkout succeeded" },
  { event: "checkout_canceled", label: "Checkout canceled" },
  { event: "email_lead_submitted", label: "Email lead submitted" },
  { event: "referral_submitted", label: "Referral submitted" },
];

/** Steps that form the actual conversion path (drop-off is computed on these). */
const DROPOFF_CHAIN = [
  "signup_viewed",
  "signup_submitted",
  "signup_succeeded",
  "onboarding_completed",
  "go_live_clicked",
  "checkout_redirected",
  "checkout_succeeded",
];

type Counts = Record<string, number>;

const emptyCounts = (): Counts =>
  Object.fromEntries(FUNNEL_ORDER.map((f) => [f.event, 0]));

const FunnelPanel = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [d7, setD7] = useState<Counts>(emptyCounts());
  const [d30, setD30] = useState<Counts>(emptyCounts());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("funnel_events")
        .select("event, created_at")
        .gte("created_at", since30)
        .limit(50000);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const a = emptyCounts();
      const b = emptyCounts();
      for (const row of data ?? []) {
        const e = (row as { event: string }).event;
        if (!(e in b)) continue;
        b[e] += 1;
        if ((row as { created_at: string }).created_at >= since7) a[e] += 1;
      }
      setD7(a);
      setD30(b);
      setLoading(false);
    };
    void load();
  }, []);

  const dropoff = (counts: Counts, event: string): string => {
    const idx = DROPOFF_CHAIN.indexOf(event);
    if (idx <= 0) return "—";
    const prev = counts[DROPOFF_CHAIN[idx - 1]] ?? 0;
    const curr = counts[event] ?? 0;
    if (prev === 0) return "—";
    const pct = Math.max(0, Math.round(((prev - curr) / prev) * 100));
    return `${pct}%`;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Signup funnel</h3>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        First-party event counts. Drop-off is measured against the previous step
        in the conversion path. No personal data is recorded.
      </p>

      {error ? (
        <p className="text-sm text-destructive">Could not load funnel: {error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Step</th>
                <th className="py-2 pr-4 text-right font-medium">Last 7d</th>
                <th className="py-2 pr-4 text-right font-medium">Last 30d</th>
                <th className="py-2 text-right font-medium">Drop-off (30d)</th>
              </tr>
            </thead>
            <tbody>
              {FUNNEL_ORDER.map((f) => {
                const inChain = DROPOFF_CHAIN.includes(f.event);
                const drop = dropoff(d30, f.event);
                return (
                  <tr key={f.event} className="border-b border-border/60 last:border-0">
                    <td className={`py-2 pr-4 ${inChain ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {f.label}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-foreground">{d7[f.event] ?? 0}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-foreground">{d30[f.event] ?? 0}</td>
                    <td className={`py-2 text-right tabular-nums ${drop !== "—" && parseInt(drop, 10) >= 50 ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                      {drop}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FunnelPanel;
