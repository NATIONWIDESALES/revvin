import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { friendlyError } from "@/lib/errors";

// Match the public events and traffic labels admitted by analyticsPrivacy.ts.
// Cohorts are independent activity counts, not a person-level conversion chain.
const PUBLIC_EVENTS = [
  ["page_viewed", "Page views"],
  ["cta_clicked", "CTA clicks"],
  ["sample_page_viewed", "Sample views"],
  ["demo_started", "Demo starts"],
  ["demo_completed", "Demo completions"],
  ["email_lead_submitted", "Email requests"],
  ["referral_submitted", "Referrals submitted"],
  ["promo_popup_shown", "Promotion views"],
  ["promo_cta_clicked", "Promotion clicks"],
] as const;
const COHORTS = ["marketing", "demo", "referral"] as const;
type Cohort = typeof COHORTS[number];
type Row = { event: string; created_at: string | null; session_id: string | null; meta: Record<string, unknown> | null };
type CohortStats = { events: Record<string, { d7: number; d30: number }>; visitors7: number; visitors30: number };
const empty = (): Record<Cohort, CohortStats> => Object.fromEntries(COHORTS.map(c => [c, { events: {}, visitors7: 0, visitors30: 0 }])) as Record<Cohort, CohortStats>;

const FunnelPanel = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"human" | "all">("human");
  const [stats, setStats] = useState(empty);
  const [paid, setPaid] = useState<{ first: number; renewals: number } | null>(null);
  const [paidError, setPaidError] = useState<string | null>(null);
  const [activityWarning, setActivityWarning] = useState<string | null>(null);
  const [paymentWarning, setPaymentWarning] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    const load = async () => {
      setLoading(true); setError(null); setPaid(null); setPaidError(null);
      setActivityWarning(null); setPaymentWarning(null);
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const [activity, payments] = await Promise.all([
        mode === "human"
          ? supabase.from("funnel_events_human").select("event, created_at, meta, session_id", { count: "exact" }).gte("created_at", since30).limit(50000)
          : supabase.from("funnel_events").select("event, created_at, meta, session_id", { count: "exact" }).gte("created_at", since30).limit(50000),
        // Pending migration introduces this table; it is not in generated types yet.
        (supabase as any).from("stripe_payments").select("kind", { count: "exact" }).eq("collected", true).gte("paid_at", since30),
      ]);
      if (!current) return;
      if (activity.error) {
        setError(friendlyError(activity.error, "Could not load public activity."));
      } else {
        if (activity.count == null) setActivityWarning("Activity completeness could not be verified. Counts below may be partial.");
        else if (activity.count > (activity.data?.length ?? 0)) setActivityWarning(`Partial activity results: ${activity.data?.length ?? 0} of ${activity.count} rows returned. Counts below are incomplete.`);
        const next = empty();
        const sessions = Object.fromEntries(COHORTS.map(c => [c, { d7: new Set<string>(), d30: new Set<string>() }])) as Record<Cohort, { d7: Set<string>; d30: Set<string> }>;
        for (const row of (activity.data ?? []) as unknown as Row[]) {
          const meta = row.meta ?? {};
          const cohort = meta.traffic as Cohort;
          // Legacy rows without a reviewed traffic label are excluded. Demo
          // activity remains visible only in its own column, never commercial.
          if (!COHORTS.includes(cohort) || meta.staging === true || meta.admin === true ||
              ((meta.demo === true || meta.is_demo === true) && cohort !== "demo") ||
              !row.session_id || /^(stripe_|server_)/.test(row.session_id) ||
              !PUBLIC_EVENTS.some(([event]) => event === row.event)) continue;
          const recent = (row.created_at ?? "") >= since7;
          const count = next[cohort].events[row.event] ?? { d7: 0, d30: 0 };
          count.d30++; if (recent) count.d7++;
          next[cohort].events[row.event] = count;
          sessions[cohort].d30.add(row.session_id);
          if (recent) sessions[cohort].d7.add(row.session_id);
        }
        for (const cohort of COHORTS) {
          next[cohort].visitors7 = sessions[cohort].d7.size;
          next[cohort].visitors30 = sessions[cohort].d30.size;
        }
        setStats(next);
      }
      if (payments.error) setPaidError("Collected payments could not be loaded. Please try again.");
      else {
        if (payments.count == null) setPaymentWarning("Payment completeness could not be verified. Invoice counts may be partial.");
        else if (payments.count > (payments.data?.length ?? 0)) setPaymentWarning(`Partial payment results: ${payments.data?.length ?? 0} of ${payments.count} invoices returned. Invoice counts are incomplete.`);
        setPaid({
          first: (payments.data ?? []).filter((p: { kind: string }) => p.kind === "first_payment").length,
          renewals: (payments.data ?? []).filter((p: { kind: string }) => p.kind === "renewal").length,
        });
      }
      setLoading(false);
    };
    void load().catch(() => {
      if (current) { setError("Could not load reporting. Please try again."); setLoading(false); }
    });
    return () => { current = false; };
  }, [mode]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Public activity and paid invoices</h3>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Anonymous production activity is grouped by marketing, demo and public referral pages.
        Counts cover reviewed traffic labels from the reporting update onward; older unlabelled rows are excluded.
        These are separate activity groups, so no conversion drop-off is calculated between them.
      </p>
      <p className="mb-4 text-xs text-muted-foreground">
        Signup, account and activation browser measurements are unavailable while those routes are excluded for privacy.
        Reviewed server events are required before a signup-to-payment funnel can be reported.
      </p>
      <p className="mb-4 text-sm" role={paidError ? "alert" : undefined}>
        {paid ? `Paid invoices in the last 30 days: ${paid.first} new paying ${paid.first === 1 ? "business" : "businesses"}, ${paid.renewals} ${paid.renewals === 1 ? "renewal" : "renewals"}.` : paidError ?? "Paid invoice reporting is loading."}
      </p>
      {paymentWarning && <p className="mb-4 text-sm text-amber-700" role="status">{paymentWarning}</p>}
      <p className="mb-4 text-xs text-muted-foreground">
        Payments come from the server invoice ledger and are separate from browser activity. Zero-charge invoices are excluded.
        Meta Purchase forwarding is not implemented.
      </p>
      <div className="mb-4 inline-flex rounded-lg border border-border p-0.5">
        {(["human", "all"] as const).map(value => <button key={value} type="button" onClick={() => setMode(value)} className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          {value === "human" ? "Human traffic" : "Including automated traffic"}
        </button>)}
      </div>
      {activityWarning && <p className="mb-4 text-sm text-amber-700" role="status">{activityWarning}</p>}
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead><tr className="border-b border-border text-xs"><th className="py-2">Activity</th>{COHORTS.map(c => <th key={c} className="py-2 text-right capitalize">{c}<span className="block text-[11px] font-normal text-muted-foreground">7 days / 30 days</span></th>)}</tr></thead>
          <tbody>
            <tr className="border-b border-border"><td className="py-2 font-medium">Unique sessions</td>{COHORTS.map(c => <td key={c} className="py-2 text-right tabular-nums">{stats[c].visitors7} / {stats[c].visitors30}</td>)}</tr>
            {PUBLIC_EVENTS.map(([event, label]) => <tr key={event} className="border-b border-border/60"><td className="py-2">{label}</td>{COHORTS.map(c => <td key={c} className="py-2 text-right tabular-nums">{stats[c].events[event]?.d7 ?? 0} / {stats[c].events[event]?.d30 ?? 0}</td>)}</tr>)}
          </tbody>
        </table>
      </div>}
    </div>
  );
};
export default FunnelPanel;
