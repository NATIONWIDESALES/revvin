import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Target, Inbox } from "lucide-react";

interface Props {
  businessId: string;
}

type Mode = "month" | "all";

interface LeadRow { created_at: string; status: string; deal_value: number | null; }
interface RefRow  { created_at: string; status: string; deal_value: number | null; }

interface RecapRow {
  period_month: string;
  summary: {
    leads_total: number;
    closed_count: number;
    revenue: number;
    top_referrer: string | null;
    period_label: string;
  };
  sent_at: string;
}

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const RoiSummaryCard = ({ businessId }: Props) => {
  const [mode, setMode] = useState<Mode>("all");
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [refs, setRefs] = useState<RefRow[]>([]);
  const [recap, setRecap] = useState<RecapRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [leadRes, refRes, recapRes] = await Promise.all([
        supabase.from("leads").select("created_at, status, deal_value").eq("business_id", businessId),
        supabase.from("referrals").select("created_at, status, deal_value").eq("business_id", businessId),
        supabase
          .from("monthly_recap_log")
          .select("period_month, summary, sent_at")
          .eq("business_id", businessId)
          .order("period_month", { ascending: false })
          .limit(1),
      ]);
      if (cancelled) return;
      setLeads((leadRes.data as LeadRow[]) ?? []);
      setRefs((refRes.data as RefRow[]) ?? []);
      const r = (recapRes.data as RecapRow[] | null)?.[0] ?? null;
      setRecap(r);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const inRange = (iso: string) => mode === "all" || new Date(iso) >= monthStart;

    const l = leads.filter((r) => inRange(r.created_at));
    const r = refs.filter((r) => inRange(r.created_at));
    const closedL = l.filter((x) => x.status === "closed_won");
    const closedR = r.filter((x) => x.status === "won");
    const revenue =
      closedL.reduce((s, x) => s + (Number(x.deal_value) || 0), 0) +
      closedR.reduce((s, x) => s + (Number(x.deal_value) || 0), 0);
    return {
      total: l.length + r.length,
      closed: closedL.length + closedR.length,
      revenue,
    };
  }, [leads, refs, mode]);

  const isEmpty = !loading && stats.total === 0 && stats.revenue === 0;

  return (
    <section className="mb-8 rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Revvin ROI
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Revenue your referral program has produced.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("month")}
            className={`px-3 py-1 rounded-md transition ${mode === "month" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            This month
          </button>
          <button
            type="button"
            onClick={() => setMode("all")}
            className={`px-3 py-1 rounded-md transition ${mode === "all" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            All time
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div className="px-5 py-8 text-center">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-foreground font-medium">No revenue tracked yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            When you mark a referral as closed and add a deal value, it shows up here. Your first month's recap arrives by email.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <Stat icon={<Inbox className="h-4 w-4" />} label="Referral leads" value={loading ? "…" : String(stats.total)} />
          <Stat icon={<Target className="h-4 w-4" />} label="Closed deals" value={loading ? "…" : String(stats.closed)} />
          <Stat icon={<DollarSign className="h-4 w-4" />} label="Attributed revenue" value={loading ? "…" : fmtUsd(stats.revenue)} emphasis />
        </div>
      )}

      {recap && (
        <div className="px-5 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>
            Latest recap: <span className="text-foreground font-medium">{recap.summary.period_label}</span>
            {" "}— {recap.summary.closed_count} closed, {fmtUsd(recap.summary.revenue)} revenue
            {recap.summary.top_referrer ? <> · Top referrer: <span className="text-foreground">{recap.summary.top_referrer}</span></> : null}
          </span>
          <span className="text-muted-foreground/70">Sent {new Date(recap.sent_at).toLocaleDateString()}</span>
        </div>
      )}
    </section>
  );
};

const Stat = ({ icon, label, value, emphasis }: { icon: React.ReactNode; label: string; value: string; emphasis?: boolean }) => (
  <div className="px-5 py-5">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
      {icon}
      {label}
    </div>
    <div className={`mt-2 text-2xl font-semibold ${emphasis ? "text-primary" : "text-foreground"}`}>{value}</div>
  </div>
);

export default RoiSummaryCard;