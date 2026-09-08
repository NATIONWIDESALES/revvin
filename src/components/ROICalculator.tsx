import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";
import { MONTHLY_PRICE } from "@/config/pricing";

/**
 * Contribution from referred work.
 *
 * This is deliberately NOT a cost-per-customer comparison against ads. That
 * version asked for ad spend and then implied a saving that only existed if a
 * referral replaced a bought customer, which is an assumption we cannot make on
 * the owner's behalf.
 *
 * Honesty rules this component follows:
 *  - The input is ADDITIONAL jobs actually won from referrals, and zero is a
 *    valid answer: the output then shows the month costing the Pro fee.
 *  - Revenue is never shown as profit. Gross margin is an input, and the result
 *    is estimated contribution after job costs, referral rewards and the
 *    software fee.
 *  - Nothing here is a forecast. The numbers are the owner's own assumptions.
 */
const ROICalculator = () => {
  const [jobsWon, setJobsWon] = useState(2);
  const [jobValue, setJobValue] = useState(3000);
  const [marginPct, setMarginPct] = useState(40);
  const [reward, setReward] = useState(300);

  const revenue = jobsWon * jobValue;
  const grossProfit = Math.round(revenue * (marginPct / 100));
  const rewards = jobsWon * reward;
  const software = MONTHLY_PRICE;
  const contribution = grossProfit - rewards - software;

  const money = (n: number) => `$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <h3 className="mb-2 text-xl font-bold text-foreground">What referred work is worth to you</h3>
      <p className="mb-6 text-sm text-muted-foreground">
        Your numbers, your assumptions. Nothing here is a promise of results.
      </p>

      <div className="space-y-6">
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Extra jobs you win from referrals in a month</span>
            <span className="font-bold text-foreground">{jobsWon}</span>
          </div>
          <Slider
            value={[jobsWon]}
            onValueChange={([v]) => setJobsWon(v)}
            min={0}
            max={20}
            step={1}
            aria-label="Extra jobs won from referrals per month"
          />
        </div>

        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Average job value</span>
            <span className="font-bold text-foreground">${jobValue.toLocaleString()}</span>
          </div>
          <Slider
            value={[jobValue]}
            onValueChange={([v]) => setJobValue(v)}
            min={100}
            max={25000}
            step={100}
            aria-label="Average job value in dollars"
          />
        </div>

        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Gross margin on a job</span>
            <span className="font-bold text-foreground">{marginPct}%</span>
          </div>
          <Slider
            value={[marginPct]}
            onValueChange={([v]) => setMarginPct(v)}
            min={5}
            max={90}
            step={5}
            aria-label="Gross margin percentage on a job"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            What is left of the job after materials, labour and subs. Revenue is not profit.
          </p>
        </div>

        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Reward you pay per closed referral</span>
            <span className="font-bold text-foreground">${reward.toLocaleString()}</span>
          </div>
          <Slider
            value={[reward]}
            onValueChange={([v]) => setReward(v)}
            min={0}
            max={2000}
            step={25}
            aria-label="Reward paid per closed referral in dollars"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <p className="mb-1 text-xs text-muted-foreground">Gross profit on that work</p>
          <p className="text-xl font-bold text-foreground">{money(grossProfit)}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <p className="mb-1 text-xs text-muted-foreground">Rewards you pay out</p>
          <p className="text-xl font-bold text-foreground">{money(rewards)}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <p className="mb-1 text-xs text-muted-foreground">Revvin Pro that month</p>
          <p className="text-xl font-bold text-foreground">{money(software)}</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        aria-live="polite"
        className={`mt-4 rounded-xl border-2 p-5 text-center ${
          contribution > 0 ? "border-primary/20 bg-primary/5" : "border-border bg-muted/30"
        }`}
      >
        <p className="text-sm text-muted-foreground">
          {jobsWon === 0
            ? "With no extra jobs won, the month costs you"
            : contribution >= 0
              ? "Estimated contribution after job costs, rewards and software"
              : "Estimated shortfall after job costs, rewards and software"}
        </p>
        <p className={`text-3xl font-bold ${contribution > 0 ? "text-primary" : "text-foreground"}`}>
          {contribution < 0 ? "-" : ""}
          {money(contribution)}
        </p>
        {jobsWon > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {money(revenue)} of referred revenue at {marginPct}% margin, less {money(rewards)} in
            rewards and {money(software)} for Pro.
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          This is contribution from the referred jobs only, not your total profit. It does not
          include overheads, tax, or the time you spend asking.
        </p>
      </motion.div>

      <p className="mt-4 text-xs text-muted-foreground">
        Publishing your page is free. Revvin Pro is ${MONTHLY_PRICE}/month USD with no per-referral
        fees. You pay the referrer directly when the deal closes: Revvin never handles that money.
      </p>
    </div>
  );
};

export default ROICalculator;
