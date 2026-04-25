import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Send, CheckCircle2, Phone, ShieldCheck, Loader2, Trophy, XCircle, Ban, Scale,
} from "lucide-react";

interface Props {
  referralId: string;
  createdAt: string;
}

const EVENT_META: Record<string, { label: string; Icon: any; color: string }> = {
  referral_submitted: { label: "Submitted", Icon: Send, color: "text-muted-foreground" },
  referral_accepted: { label: "Accepted", Icon: CheckCircle2, color: "text-primary" },
  referral_contacted: { label: "Contacted", Icon: Phone, color: "text-blue-600" },
  referral_qualified: { label: "Qualified", Icon: ShieldCheck, color: "text-primary" },
  referral_in_progress: { label: "In Progress", Icon: Loader2, color: "text-accent-foreground" },
  referral_won: { label: "Won", Icon: Trophy, color: "text-earnings" },
  referral_lost: { label: "Lost", Icon: XCircle, color: "text-destructive" },
  referral_declined: { label: "Declined", Icon: Ban, color: "text-muted-foreground" },
  dispute_submitted: { label: "Disputed", Icon: Scale, color: "text-accent-foreground" },
  dispute_resolved: { label: "Dispute resolved", Icon: Scale, color: "text-primary" },
};

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
  const items = [
    { event_type: "referral_submitted", created_at: createdAt },
    ...events.filter((e) => e.event_type !== "referral_submitted"),
  ];

  if (loading) {
    return (
      <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        Loading timeline…
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Status Timeline
      </p>
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
    </div>
  );
};

export default ReferralTimeline;