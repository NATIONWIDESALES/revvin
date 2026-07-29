import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, DollarSign, Target, Inbox, HandCoins, CreditCard, ArrowRight } from "lucide-react";

// The scoreboard that answers "is this worth $49?". Every number here comes
// from real rows: fn_get_business_roi for lead/close/revenue counts, the
// rewards table for payouts, and the business subscription state for cost.
// Nothing is estimated or projected. If a figure cannot be known honestly the
// tile is omitted rather than filled with a placeholder.

interface Props {
  businessId: string;
}

type Period = "month" | "30d" | "all";

const PERIOD_LABEL: Record<Period, string> = {
  month: "This month",
  "30d": "Last 30 days",
  all: "All time",
};

const MONTHLY_PRICE = 49;
const PAID_STATUSES = ["active", "trialing", "paid", "past_due"];

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

interface RoiResult {
  leads_total: number;
  closed_count: number;
  revenue: number;
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
  const [rewardsPaid, setRewardsPaid] = useState<number | null>(null);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);

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

    const [roiRes, rewardsRes, bizRes] = await Promise.all([
      supabase.rpc("fn_get_business_roi", {
        p_business_id: businessId,
        p_from: from,
        p_to: to,
      }),
      rewardsQuery,
      supabase.from("businesses").select("subscription_status").eq("id", businessId).limit(1),
    ]);

    const r = roiRes.data as unknown as RoiResult | null;
    setRoi(
      r
        ? {
            leads_total: Number(r.leads_total || 0),
            closed_count: Number(r.closed_count || 0),
            revenue: Number(r.revenue || 0),
          }
        : null,
    );

    const paidRows = (rewardsRes.data as { amount: number | null }[] | null) ?? null;
    setRewardsPaid(
      rewardsRes.error ? null : (paidRows ?? []).reduce((s, x) => s + Number(x.amount || 0), 0),
    );

    const status = (bizRes.data as { subscription_status: string | null }[] | null)?.[0]
      ?.subscription_status;
    setSubscribed(status ? PAID_STATUSES.includes(status) : false);

    setLoading(false);
  }, [businessId, period]);

  useEffect(() => {
    load();
  }, [load]);

  // Revvin cost. A draft account pays nothing, so $0 is the true figure. For a
  // subscribed account one billing period is one month, which we can state for
  // the month and 30 day views. For all time we do not know how many periods
  // have been billed, so that tile is omitted rather than guessed.
  let cost: number | null = null;
  if (subscribed === false) cost = 0;
  else if (subscribed === true && period !== "all") cost = MONTHLY_PRICE;

  const revenue = roi?.revenue ?? 0;
  const isEmpty = !loading && (roi?.leads_total ?? 0) === 0 && revenue === 0;

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

      {isEmpty ? (
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
              label="Revenue attributed"
              value={loading ? "…" : fmtUsd(revenue)}
              emphasis
            />
            {rewardsPaid !== null && (
              <Stat
                icon={<HandCoins className="h-4 w-4" />}
                label="Rewards paid out"
                value={loading ? "…" : fmtUsd(rewardsPaid)}
              />
            )}
            {cost !== null && (
              <Stat
                icon={<CreditCard className="h-4 w-4" />}
                label="Revvin cost"
                value={loading ? "…" : fmtUsd(cost)}
              />
            )}
          </div>

          <div className="px-5 py-3 text-xs text-muted-foreground">
            {loading ? null : cost === null ? (
              <span>
                {revenue > 0 ? (
                  <>
                    <span className="text-foreground font-medium">{fmtUsd(revenue)}</span> in tracked
                    work came from referrals.
                  </>
                ) : (
                  "No revenue attributed to referrals in this period yet."
                )}
              </span>
            ) : revenue > 0 ? (
              <span>
                <span className="text-foreground font-medium">{fmtUsd(revenue)}</span> in tracked work
                against <span className="text-foreground font-medium">{fmtUsd(cost)}</span> paid to
                Revvin.
              </span>
            ) : (
              <span>
                No revenue attributed yet this period. You have paid Revvin{" "}
                <span className="text-foreground font-medium">{fmtUsd(cost)}</span>.
              </span>
            )}
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
