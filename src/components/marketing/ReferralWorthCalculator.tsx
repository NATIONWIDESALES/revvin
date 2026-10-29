import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateReward, formatUsd } from "@/lib/toolkit/rewardMath";

const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

/** "What is one referral worth to you?" Pure arithmetic, nothing saved. */
const ReferralWorthCalculator = () => {
  const [revenue, setRevenue] = useState("8000");
  const [margin, setMargin] = useState("30");
  const [reward, setReward] = useState("250");
  const r = useMemo(
    () => calculateReward({ revenue: num(revenue), marginPct: num(margin), reward: num(reward), jobsPerMonth: 1 }),
    [revenue, margin, reward],
  );
  return (
    <div className="grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-soft md:grid-cols-2 md:p-8">
      <div className="space-y-4">
        <div>
          <Label htmlFor="rw-revenue">Average job value ($)</Label>
          <Input id="rw-revenue" inputMode="decimal" type="number" min={0} value={revenue} onChange={(e) => setRevenue(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="rw-margin">Gross margin (%)</Label>
          <Input id="rw-margin" inputMode="decimal" type="number" min={0} max={100} value={margin} onChange={(e) => setMargin(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="rw-reward">Reward ($)</Label>
          <Input id="rw-reward" inputMode="decimal" type="number" min={0} value={reward} onChange={(e) => setReward(e.target.value)} className="mt-1.5" />
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-5" aria-live="polite">
        <div>
          <p className="text-sm text-muted-foreground">Profit on a referred job after the reward</p>
          <p data-testid="rw-profit" className="mt-1 text-4xl font-extrabold tracking-tight text-foreground">{formatUsd(r.profitAfterReward)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Referred jobs a year that cover Pro</p>
          <p data-testid="rw-cover" className="mt-1 text-4xl font-extrabold tracking-tight text-foreground">
            {r.jobsToCoverAnnualPro ?? "Not at this reward"}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Your numbers, not ours. Nothing is saved.</p>
      </div>
    </div>
  );
};

export default ReferralWorthCalculator;
