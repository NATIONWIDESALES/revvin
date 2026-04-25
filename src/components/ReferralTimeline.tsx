import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Send, CheckCircle2, Phone, ShieldCheck, Loader2, Trophy, XCircle, Ban, Scale,
} from "lucide-react";

interface Props {
  referralId: string;
  createdAt: string;
}

const EVENT_META: Record<string, { label: string; Icon: any; color: string; isKey: boolean }> = {
  referral_submitted: { label: "Submitted", Icon: Send, color: "text-muted-foreground", isKey: true },
  referral_accepted: { label: "Accepted", Icon: CheckCircle2, color: "text-primary", isKey: false },
  referral_contacted: { label: "Contacted", Icon: Phone, color: "text-blue-600", isKey: true },
  referral_qualified: { label: "Qualified", Icon: ShieldCheck, color: "text-primary", isKey: true },
  referral_in_progress: { label: "In Progress", Icon: Loader2, color: "text-accent-foreground", isKey: false },
  referral_won: { label: "Won", Icon: Trophy, color: "text-earnings", isKey: true },
  referral_lost: { label: "Lost", Icon: XCircle, color: "text-destructive", isKey: true },
  referral_declined: { label: "Declined", Icon: Ban, color: "text-muted-foreground", isKey: false },
  dispute_submitted: { label: "Disputed", Icon: Scale, color: "text-accent-foreground", isKey: false },
  dispute_resolved: { label: "Dispute resolved", Icon: Scale, color: "text-primary", isKey: false },
};

type FilterMode = "key" | "disputes" | "all";

const DISPUTE_EVENTS = new Set(["dispute_submitted", "dispute_resolved"]);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const ReferralTimeline = ({ referralId, createdAt }: Props) => {
  const [events, setEvents] = useState<Array<{ event_type: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("key");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("event_type, created_at")
        .eq("referral_id", referralId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setEvents((data ?? []).filter((e) => EVENT_META[e.event_type]));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [referralId]);

  // Always lead with the submission event derived from referral.created_at
  const allItems = [
    { event_type: "referral_submitted", created_at: createdAt },
    ...events.filter((e) => e.event_type !== "referral_submitted"),
  ];
  const items =
    filter === "key"
      ? allItems.filter((e) => EVENT_META[e.event_type]?.isKey)
      : filter === "disputes"
      ? allItems.filter(
          (e) => EVENT_META[e.event_type]?.isKey || DISPUTE_EVENTS.has(e.event_type),
        )
      : allItems;
  const hiddenCount = allItems.length - items.length;
  const disputeCount = allItems.filter((e) => DISPUTE_EVENTS.has(e.event_type)).length;

  if (loading) {
    return (
      <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        Loading timeline…
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Status Timeline
        </p>
        <div
          className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5 text-xs"
          role="tablist"
          aria-label="Timeline filter"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filter === "key"}
            onClick={() => setFilter("key")}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              filter === "key"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Key stages
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "disputes"}
            onClick={() => setFilter("disputes")}
            disabled={disputeCount === 0}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              filter === "disputes"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={disputeCount === 0 ? "No dispute events for this referral" : undefined}
          >
            Disputes{disputeCount > 0 ? ` (${disputeCount})` : ""}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "all"}
            onClick={() => setFilter("all")}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              filter === "all"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All events
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No events to display.</p>
      ) : (
      <ol className="space-y-3">
        {items.map((e, i) => {
          const meta = EVENT_META[e.event_type];
          const Icon = meta.Icon;
          const isLast = i === items.length - 1;
          return (
            <li key={`${e.event_type}-${e.created_at}-${i}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full bg-muted ${meta.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                {!isLast && <div className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="pb-1">
                <p className="text-sm font-medium text-foreground">{meta.label}</p>
                <p className="text-xs text-muted-foreground">{formatDate(e.created_at)}</p>
              </div>
            </li>
          );
        })}
      </ol>
      )}
      {filter === "key" && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setFilter("all")}
          className="mt-3 text-xs text-primary hover:underline"
        >
          + Show {hiddenCount} more {hiddenCount === 1 ? "event" : "events"}
        </button>
      )}
    </div>
  );
};

export default ReferralTimeline;