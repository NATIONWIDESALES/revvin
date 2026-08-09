import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { friendlyError } from "@/lib/errors";

/** Funnel order — keep in sync with src/lib/track.ts event names. */
const FUNNEL_ORDER: { event: string; label: string }[] = [
  { event: "page_viewed", label: "Visits (page views)" },
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
  "page_viewed",
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

type AttributionRow = {
  key: string;
  source: string;
  campaign: string;
  events7: number;
  events30: number;
  signups7: number;
  signups30: number;
};

type Mode = "human" | "all";

type Row = {
  event: string;
  created_at: string | null;
  meta?: Record<string, unknown> | null;
  session_id: string | null;
  bot_reason?: string | null;
};

const FunnelPanel = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [d7, setD7] = useState<Counts>(emptyCounts());
  const [d30, setD30] = useState<Counts>(emptyCounts());
  const [visitors, setVisitors] = useState({ v7: 0, v30: 0 });
  const [attribution, setAttribution] = useState<AttributionRow[]>([]);
  const [mode, setMode] = useState<Mode>("human");
  const [botCounts, setBotCounts] = useState<Record<string, number>>({});
  const [filtered, setFiltered] = useState({ bots: 0, total: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } =
        mode === "human"
          ? await supabase
              .from("funnel_events_human")
              .select("event, created_at, meta, session_id")
              .gte("created_at", since30)
              .limit(50000)
          : await supabase
              .from("funnel_events")
              .select("event, created_at, meta, session_id, bot_reason")
              .gte("created_at", since30)
              .limit(50000);
      if (error) {
        setError(friendlyError(error, "Could not load the funnel data."));
        setLoading(false);
        return;
      }

      // Filtered share over the same window, counted on distinct sessions.
      const { data: shareRows } = await supabase
        .from("funnel_events")
        .select("session_id, bot_reason")
        .gte("created_at", since30)
        .limit(50000);
      const allSessions = new Set<string>();
      const botSessions = new Set<string>();
      for (const r of (shareRows ?? []) as {
        session_id: string | null;
        bot_reason: string | null;
      }[]) {
        if (!r.session_id) continue;
        allSessions.add(r.session_id);
        if (r.bot_reason) botSessions.add(r.session_id);
      }
      setFiltered({ bots: botSessions.size, total: allSessions.size });

      const a = emptyCounts();
      const b = emptyCounts();
      const attr = new Map<string, AttributionRow>();
      const sessions30 = new Set<string>();
      const sessions7 = new Set<string>();
      const counts: Record<string, number> = {};
      for (const row of ((data ?? []) as unknown as Row[])) {
        const e = row.event ?? "";
        const recent = (row.created_at ?? "") >= since7;
        const sid = row.session_id;
        if (sid) {
          sessions30.add(sid);
          if (recent) sessions7.add(sid);
        }
        if (row.bot_reason && e) counts[e] = (counts[e] ?? 0) + 1;
        const meta = (row.meta ?? {}) as Record<string, unknown>;
        const source =
          typeof meta.utm_source === "string" && meta.utm_source
            ? meta.utm_source
            : meta.fbclid
              ? "facebook (fbclid)"
              : meta.gclid
                ? "google (gclid)"
                : null;
        if (source) {
          const campaign =
            typeof meta.utm_campaign === "string" && meta.utm_campaign
              ? meta.utm_campaign
              : "(none)";
          const key = `${source}||${campaign}`;
          const existing =
            attr.get(key) ??
            {
              key,
              source,
              campaign,
              events7: 0,
              events30: 0,
              signups7: 0,
              signups30: 0,
            };
          existing.events30 += 1;
          if (recent) existing.events7 += 1;
          if (e === "signup_succeeded") {
            existing.signups30 += 1;
            if (recent) existing.signups7 += 1;
          }
          attr.set(key, existing);
        }
        if (!(e in b)) continue;
        b[e] += 1;
        if (recent) a[e] += 1;
      }
      setD7(a);
      setD30(b);
      setVisitors({ v7: sessions7.size, v30: sessions30.size });
      setAttribution(
        [...attr.values()].sort((x, y) => y.events30 - x.events30).slice(0, 50),
      );
      setBotCounts(counts);
      setLoading(false);
    };
    void load();
  }, [mode]);

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
      <p className="-mt-3 mb-4 text-xs text-muted-foreground">
        {filtered.bots > 0 && filtered.total > 0
          ? `${filtered.bots} of ${filtered.total} sessions (${Math.round((filtered.bots / filtered.total) * 100)}%) filtered as automated — spoofed user agents, headless browsers and declared crawlers.`
          : "No automated traffic detected."}
      </p>

      <div className="mb-4 inline-flex rounded-lg border border-border p-0.5">
        {([
          { key: "human", label: "Human traffic" },
          { key: "all", label: "All traffic" },
        ] as { key: Mode; label: string }[]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setMode(t.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Visits (7d)", value: d7["page_viewed"] ?? 0 },
          { label: "Unique visitors (7d)", value: visitors.v7 },
          { label: "Signup starts (7d)", value: d7["signup_submitted"] ?? 0 },
          { label: "Completed signups (7d)", value: d7["signup_succeeded"] ?? 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-background p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Step</th>
                <th className="py-2 pr-4 text-right font-medium">Last 7d</th>
                <th className="py-2 pr-4 text-right font-medium">Last 30d</th>
                <th className="py-2 text-right font-medium">Drop-off (30d)</th>
                {mode === "all" && (
                  <th className="py-2 pl-4 text-right font-medium">Automated</th>
                )}
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
                    {mode === "all" && (
                      <td className="py-2 pl-4 text-right text-xs text-muted-foreground">
                        {(botCounts[f.event] ?? 0) > 0 ? `${botCounts[f.event]} bot` : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 border-t border-border pt-6">
        <h4 className="mb-1 text-sm font-semibold text-foreground">
          Traffic sources (first-touch)
        </h4>
        <p className="mb-4 text-xs text-muted-foreground">
          Grouped by the utm_source and utm_campaign captured on the visitor's
          first visit. Only campaign parameters are stored, never personal data.
        </p>
        {attribution.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No campaign-tagged traffic in the last 30 days.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Source</th>
                  <th className="py-2 pr-4 font-medium">Campaign</th>
                  <th className="py-2 pr-4 text-right font-medium">Events 7d</th>
                  <th className="py-2 pr-4 text-right font-medium">Events 30d</th>
                  <th className="py-2 pr-4 text-right font-medium">Signups 7d</th>
                  <th className="py-2 text-right font-medium">Signups 30d</th>
                </tr>
              </thead>
              <tbody>
                {attribution.map((r) => (
                  <tr key={r.key} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-4 font-medium text-foreground">{r.source}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.campaign}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">{r.events7}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">{r.events30}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-foreground">{r.signups7}</td>
                    <td className="py-2 text-right tabular-nums text-foreground">{r.signups30}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FunnelPanel;
