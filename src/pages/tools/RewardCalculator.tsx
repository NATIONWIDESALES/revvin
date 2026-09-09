import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ToolShell from "@/components/toolkit/ToolShell";
import { track } from "@/lib/track";
import { TOOLKIT_CTAS } from "@/lib/toolkit/analytics";
import { MONTHLY_PRICE, PRICE_TEXT } from "@/config/pricing";
import {
  calculateReward,
  formatUsd,
  rewardSummaryText,
  DEFAULT_JOBS_PER_MONTH,
  MAX_JOBS_PER_MONTH,
  MAX_REVENUE,
  MAX_REWARD,
} from "@/lib/toolkit/rewardMath";
import { copyText } from "@/lib/clipboard";
import { Check, Copy } from "lucide-react";

/**
 * All four inputs stay in component state and every figure below is computed by
 * the pure module. Nothing is stored, sent or added to analytics: the funnel
 * events say only that the calculator was opened and used.
 */
const RewardCalculator = () => {
  const [revenue, setRevenue] = useState("");
  const [marginPct, setMarginPct] = useState("");
  const [reward, setReward] = useState("");
  const [jobsPerMonth, setJobsPerMonth] = useState(String(DEFAULT_JOBS_PER_MONTH));
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () =>
      calculateReward({
        revenue: Number(revenue),
        marginPct: Number(marginPct),
        reward: Number(reward),
        jobsPerMonth: Number(jobsPerMonth),
      }),
    [revenue, marginPct, reward, jobsPerMonth],
  );

  const hasFigures = result.revenue > 0 && result.marginPct > 0;

  const onEdit = (setter: (value: string) => void) => (value: string) => {
    if (!started) {
      setStarted(true);
      track("cta_clicked", { cta: TOOLKIT_CTAS.calculatorStarted });
    }
    setter(value);
  };

  // "Completed" fires once, when there is enough input for the results to mean
  // something. The event carries no figure, only the tool and the step.
  useEffect(() => {
    if (hasFigures && result.reward > 0 && !completed) {
      setCompleted(true);
      track("cta_clicked", { cta: TOOLKIT_CTAS.calculatorCompleted });
    }
  }, [hasFigures, result.reward, completed]);

  const copySummary = async () => {
    const ok = await copyText(rewardSummaryText(result));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const rows: { label: string; value: string; help: string }[] = [
    {
      label: "Gross profit before the reward",
      value: formatUsd(result.grossProfit),
      help: "Your average collected job revenue multiplied by your gross margin, for one closed referred job.",
    },
    {
      label: "Gross profit after the reward",
      value: formatUsd(result.profitAfterReward),
      help: "The same figure with your proposed fixed reward taken off.",
    },
    {
      label: `Rewards at ${result.jobsPerMonth} closed referred job${result.jobsPerMonth === 1 ? "" : "s"} a month`,
      value: formatUsd(result.totalRewards),
      help: "What you would pay your referrers in a month at that volume, directly, with no fee on top.",
    },
    {
      label: "Contribution after rewards, that month",
      value: formatUsd(result.netContribution),
      help: "Gross profit after rewards at the volume you chose. It is not net profit: your overheads are not in here.",
    },
  ];

  return (
    <ToolShell
      path="/tools/referral-reward-calculator"
      metaTitle="Referral Reward Calculator | What a Referral Reward Costs You | Revvin"
      metaDescription="Enter your average job revenue, your gross margin and the reward you are considering, and see what a closed referred job leaves you. Free, no account, nothing saved."
      eyebrow="Free tool"
      h1="See what a referral reward leaves you per closed job."
      intro="Put in your own figures and this does the arithmetic for you: revenue times margin, minus the reward you are considering. It does not recommend an amount, it does not promise profit, and it is not accounting advice. All amounts are USD."
      appName="Referral Reward Calculator"
      appDescription="Works out gross profit per closed referred job before and after a proposed fixed referral reward, the monthly reward cost at a chosen volume, and how many closed referred jobs cover a Revvin Pro subscription. Runs in the browser with no account and no saved input."
      ctaHeading="Set the reward on a page that is free to publish."
      ctaCta={TOOLKIT_CTAS.calculatorSignup}
    >
      <div className="rounded-2xl border border-border bg-background p-6 md:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="revenue" className="text-sm font-semibold">
              Average collected job revenue (USD)
            </Label>
            <Input
              id="revenue"
              type="number"
              inputMode="decimal"
              min={0}
              max={MAX_REVENUE}
              step="any"
              placeholder="4000"
              value={revenue}
              onChange={(e) => onEdit(setRevenue)(e.target.value)}
              className="mt-2"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              What you actually collect on a typical job, not what you quote.
            </p>
          </div>

          <div>
            <Label htmlFor="margin" className="text-sm font-semibold">
              Gross margin (%)
            </Label>
            <Input
              id="margin"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="any"
              placeholder="35"
              value={marginPct}
              onChange={(e) => onEdit(setMarginPct)(e.target.value)}
              className="mt-2"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              What is left after materials and labour, before overheads. Between 0 and 100.
            </p>
          </div>

          <div>
            <Label htmlFor="reward" className="text-sm font-semibold">
              Proposed fixed reward (USD)
            </Label>
            <Input
              id="reward"
              type="number"
              inputMode="decimal"
              min={0}
              max={MAX_REWARD}
              step="any"
              placeholder="150"
              value={reward}
              onChange={(e) => onEdit(setReward)(e.target.value)}
              className="mt-2"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              One amount you pay your referrer directly when a referred job closes.
            </p>
          </div>

          <div>
            <Label htmlFor="jobs" className="text-sm font-semibold">
              Closed referred jobs a month (optional)
            </Label>
            <Input
              id="jobs"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_JOBS_PER_MONTH}
              step="1"
              value={jobsPerMonth}
              onChange={(e) => onEdit(setJobsPerMonth)(e.target.value)}
              className="mt-2"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Your own expectation, used only to scale the figures. Defaults to one.
            </p>
          </div>
        </div>

        {!hasFigures ? (
          <p className="mt-8 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            Add your average job revenue and your gross margin to see the figures.
          </p>
        ) : (
          <div className="mt-8">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Your figures</h2>
            <dl className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
              {rows.map((row) => (
                <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-2 p-4">
                  <div className="min-w-0 flex-1">
                    <dt className="text-sm font-semibold text-foreground">{row.label}</dt>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.help}</p>
                  </div>
                  <dd className="shrink-0 text-lg font-extrabold tracking-tight text-foreground">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            {result.rewardExceedsProfit && (
              <p className="mt-4 rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-foreground">
                Your proposed reward is the same as or more than the gross profit on a closed job, so
                a referred job would leave you nothing before overheads. Worth revisiting the reward,
                the margin or the kind of job you advertise it on.
              </p>
            )}

            <div className="mt-6 rounded-xl border border-border bg-background p-5">
              <h3 className="text-sm font-bold text-foreground">Against the cost of Revvin Pro</h3>
              {result.jobsToCoverMonthlyPro === null ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {`With this reward there is nothing left per closed referred job, so no number of jobs would cover the ${PRICE_TEXT.monthlyPerMonth} USD Revvin Pro subscription. Your referral page itself is free either way.`}
                </p>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {`At ${formatUsd(result.profitAfterReward)} left per closed referred job, ${result.jobsToCoverMonthlyPro} closed referred job${result.jobsToCoverMonthlyPro === 1 ? "" : "s"} would cover the $${MONTHLY_PRICE}/month Revvin Pro subscription, and ${result.jobsToCoverAnnualPro} would cover ${PRICE_TEXT.annualPerYear} USD billed once for a year. Publishing your referral page is free, so Pro is the only subscription in this comparison.`}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" size="lg" className="h-12 sm:px-6" onClick={copySummary}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" aria-hidden="true" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" aria-hidden="true" /> Copy this summary
                  </>
                )}
              </Button>
              <Button size="lg" className="h-12 sm:px-6" asChild>
                <Link
                  to="/signup"
                  onClick={() => track("cta_clicked", { cta: TOOLKIT_CTAS.calculatorSignup })}
                >
                  Build my referral page free
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              The summary is copied to your own clipboard. Nothing you typed leaves this page.
            </p>
          </div>
        )}

        <p className="mt-8 text-sm text-muted-foreground">
          Not sure what to pay?{" "}
          <Link
            to="/guides/how-much-to-pay-for-a-referral"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            How much to pay for a referral
          </Link>{" "}
          walks through it, and the{" "}
          <Link
            to="/tools/referral-program-grader"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            program grader
          </Link>{" "}
          checks the rest of the setup.
        </p>
      </div>
    </ToolShell>
  );
};

export default RewardCalculator;
