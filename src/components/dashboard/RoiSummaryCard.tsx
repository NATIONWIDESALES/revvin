import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/errors";
import {
  TrendingUp,
  DollarSign,
  Target,
  Inbox,
  HandCoins,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

// The scoreboard that answers "is this worth $49?". Every number here comes from
// real rows: fn_get_business_roi for lead/close/revenue counts and the rewards
// table for payouts. Nothing is estimated or projected.
//
// Honesty rules this component follows:
//   * a failed read is shown as an error, never as $0;
//   * revenue is what the owner reported on their own closed jobs, and is
//     labelled that way;
//   * closed jobs with no close date on record are excluded from a dated view
//     and reported as unknown rather than folded into the total;
//   * what the owner has paid Revvin is not claimed here. Subscription status is
//     access, not a receipt, so the cost tile is gone.

interface Props {
  businessId: string;
}

type Period = "month" | "30d" | "all";

const PERIOD_LABEL: Record<Period, string> = {
  month: "This month",
  "30d": "Last 30 days",
  all: "All time",
};

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

interface RoiResult {
  leads_total: number;
  closed_count: number;
  revenue: number;
  windowed: boolean;
  unknown_close_date_count: number;
  missing_amount_count: number;
}

function periodRange(period: Period): { from: string | null; to: string | null } {
  if (period === "all") return { from: null, to: null };
  const now = new Date();
  if (period === "month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: null };
  }
  return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), to: null };
}

const RoiSummaryCard = ({ businessId }: Props) => {
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [roi, setRoi] = useState<RoiResult | null>(null);
  const [roiError, setRoiError] = useState<string | null>(null);
  const [rewardsPaid, setRewardsPaid] = useState<number | null>(null);
  const [rewardsError, setRewardsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = periodRange(period);

    const rewardsQuery = supabase
      .from("rewards")
      .select("amount, marked_paid_at")
      .eq("business_id", businessId)
      .eq("status", "paid");
    if (from) rewardsQuery.gte("marked_paid_at", from);
    if (to) rewardsQuery.lt("marked_paid_at", to);

    const [roiRes, rewardsRes] = await Promise.all([
      supabase.rpc("fn_get_business_roi", {
        p_business_id: businessId,
        p_from: from,
        p_to: to,
      }),
      rewardsQuery,
    ]);

    if (roiRes.error) {
      setRoi(null);
      setRoiError(friendlyError(roiRes.error, "We could not load your scoreboard."));
    } else {
      const r = roiRes.data as unknown as Record<string, unknown> | null;
      setRoiError(null);
      setRoi(
        r
          ? {
              leads_total: Number(r.leads_total ?? 0),
              closed_count: Number(r.closed_count ?? 0),
              revenue: Number(r.revenue ?? 0),
              windowed: Boolean(r.windowed),
              unknown_close_date_count: Number(r.unknown_close_date_count ?? 0),
              missing_amount_count: Number(r.missing_amount_count ?? 0),
            }
          : null,
      );
    }

    if (rewardsRes.error) {
      setRewardsPaid(null);
      setRewardsError(friendlyError(rewardsRes.error, "We could not load your rewards paid."));
    } else {
      const paidRows = (rewardsRes.data as { amount: number | null }[] | null) ?? [];
      setRewardsError(null);
      setRewardsPaid(paidRows.reduce((s, x) => s + Number(x.amount || 0), 0));
    }

    setLoading(false);
  }, [businessId, period]);

  useEffect(() => {
    load();
  }, [load]);

  const revenue = roi?.revenue ?? 0;
  const isEmpty =
    !loading && !roiError && !rewardsError && (roi?.leads_total ?? 0) === 0 &&
    (roi?.closed_count ?? 0) === 0 && (roi?.unknown_close_date_count ?? 0) === 0 &&
    (roi?.missing_amount_count ?? 0) === 0 && (rewardsPaid ?? 0) === 0 && revenue === 0;

  const notes: string[] = [];
  if (roi && roi.unknown_close_date_count > 0) {
    notes.push(
      roi.windowed
        ? `${roi.unknown_close_date_count} closed ${roi.unknown_close_date_count === 1 ? "job has" : "jobs have"} no close date on record, so ${roi.unknown_close_date_count === 1 ? "it is" : "they are"} not counted in this date range. They are included in All time.`
        : `${roi.unknown_close_date_count} closed ${roi.unknown_close_date_count === 1 ? "job has" : "jobs have"} no close date on record. Their value is counted here but cannot be placed in a month.`,
    );
  }
  if (roi && roi.missing_amount_count > 0) {
    notes.push(
      `${roi.missing_amount_count} closed ${roi.missing_amount_count === 1 ? "job has" : "jobs have"} no job value entered, including any without a known close date. Add the value on the lead or referral to complete your totals.`,
    );
  }

  return (
    <section className="mb-8 rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Your Revvin scoreboard
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real numbers from your referrals. {PERIOD_LABEL[period]}.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
          {(["month", "30d", "all"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md transition ${
                period === p
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {roiError ? (
        <div className="px-5 py-6 flex items-start gap-2 text-sm text-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
          <div>
            <p className="font-medium">{roiError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-2 text-xs font-medium text-primary underline"
            >
              Try again
            </button>
          </div>
        </div>
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-border border-b border-border">
            <Stat
              icon={<Inbox className="h-4 w-4" />}
              label="Referrals received"
              value={loading ? "…" : String(roi?.leads_total ?? 0)}
            />
            <Stat
              icon={<Target className="h-4 w-4" />}
              label="Deals closed"
              value={loading ? "…" : String(roi?.closed_count ?? 0)}
            />
            <Stat
              icon={<DollarSign className="h-4 w-4" />}
              label="Job value you reported"
              value={loading ? "…" : fmtUsd(revenue)}
              emphasis
            />
            <Stat
              icon={<HandCoins className="h-4 w-4" />}
              label="Rewards paid out"
              value={loading ? "…" : rewardsPaid === null ? "Not available" : fmtUsd(rewardsPaid)}
            />
          </div>

          <div className="px-5 py-3 space-y-1.5 text-xs text-muted-foreground">
            {loading ? null : (
              <p>
                {revenue > 0 ? (
                  <>
                    <span className="text-foreground font-medium">{fmtUsd(revenue)}</span> of work
                    you marked as won came from referrals
                    {roi?.windowed ? ", by the date you closed it." : "."}
                  </>
                ) : (
                  "No job value reported on referral work in this period yet."
                )}
              </p>
            )}
            {rewardsError && <p>{rewardsError}</p>}
            {notes.map((n) => (
              <p key={n}>{n}</p>
            ))}
          </div>
        </>
      )}
    </section>
  );
};


// Zero is shown honestly, with the three things that actually move the number.
const EmptyState = () => (
  <div className="px-5 py-8">
    <div className="text-center">
      <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
      <p className="text-sm text-foreground font-medium">Nothing tracked in this period yet</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
        This board fills in on its own once referrals start arriving. Here is what starts that.
      </p>
    </div>
    <div className="mt-5 grid gap-2 sm:grid-cols-3">
      <NextStep
        to="/dashboard?tab=jobdone"
        title="Mark a job done"
        body="We ask that customer for a referral two hours later."
      />
      <NextStep
        to="/dashboard?tab=share"
        title="Share your link"
        body="Put it in your invoices, texts and email signature."
      />
      <NextStep
        to="/dashboard?tab=customers"
        title="Invite past customers"
        body="Add the people who already know your work."
      />
    </div>
  </div>
);

const NextStep = ({ to, title, body }: { to: string; title: string; body: string }) => (
  <Link
    to={to}
    className="group rounded-xl border border-border p-3 transition hover:border-primary/40 hover:bg-primary/5"
  >
    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
      {title}
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </div>
    <p className="mt-1 text-xs text-muted-foreground">{body}</p>
  </Link>
);

const Stat = ({
  icon,
  label,
  value,
  emphasis,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emphasis?: boolean;
}) => (
  <div className="px-5 py-5">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
      {icon}
      {label}
    </div>
    <div className={`mt-2 text-2xl font-semibold ${emphasis ? "text-primary" : "text-foreground"}`}>
      {value}
    </div>
  </div>
);

export default RoiSummaryCard;
