import { useMemo, useState } from "react";
import { calculateReward, formatUsd } from "@/lib/toolkit/rewardMath";
import { PRICE_TEXT } from "@/config/pricing";

const num = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(/,/g, "")));

const Field = ({ id, label, prefix, suffix, value, onChange }: { id: string; label: string; prefix?: string; suffix?: string; value: string; onChange: (v: string) => void }) => (
  <div className="mt-5 first:mt-0">
    <label htmlFor={id} className="text-base font-semibold text-foreground">{label}</label>
    <div className="mk-field">
      {prefix && <span aria-hidden="true">{prefix}</span>}
      <input id={id} inputMode="decimal" type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} />
      {suffix && <span aria-hidden="true">{suffix}</span>}
    </div>
  </div>
);

/** The referral worksheet. Pure arithmetic, nothing saved or sent. */
const ReferralWorthCalculator = () => {
  const [revenue, setRevenue] = useState("8000");
  const [margin, setMargin] = useState("30");
  const [reward, setReward] = useState("250");
  const r = useMemo(
    () => calculateReward({ revenue: num(revenue), marginPct: num(margin), reward: num(reward), jobsPerMonth: 1 }),
    [revenue, margin, reward],
  );
  const n = r.jobsToCoverAnnualPro;
  return (
    <div className="mk-ticket">
      <div className="flex flex-wrap justify-between gap-2 border-b-2 border-dashed border-line px-6 pb-[18px] pt-7 font-bold text-forest sm:px-8">
        <span>Referral worksheet</span>
        <span className="font-semibold text-muted-foreground">Your numbers, not ours</span>
      </div>
      <div className="grid sm:grid-cols-2">
        <div className="min-w-0 border-line px-6 pb-8 pt-6 sm:border-r sm:px-8">
          <Field id="rw-revenue" label="Average job value" prefix="$" value={revenue} onChange={setRevenue} />
          <Field id="rw-margin" label="Gross margin" suffix="%" value={margin} onChange={setMargin} />
          <Field id="rw-reward" label="Reward you pay" prefix="$" value={reward} onChange={setReward} />
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-8 border-t border-line px-6 py-8 sm:border-t-0 sm:px-8" aria-live="polite">
          <p>
            <b data-testid="rw-profit" className="block font-display text-[64px] font-extrabold leading-[.9] text-forest">{formatUsd(r.profitAfterReward)}</b>
            <span className="mt-2 block text-base text-muted-foreground">profit on one referred job, after the reward</span>
          </p>
          <p>
            <b data-testid="rw-cover" className="block font-display text-[64px] font-extrabold leading-[.9] text-forest">
              {n === null ? "Not at this reward" : `${n} ${n === 1 ? "job" : "jobs"}`}
            </b>
            <span className="mt-2 block text-base text-muted-foreground">a year covers Revvin Pro at {PRICE_TEXT.annual}</span>
          </p>
        </div>
      </div>
      <p className="border-t border-line px-6 py-4 text-sm text-muted-foreground sm:px-8">Nothing you type here is saved or sent.</p>
    </div>
  );
};

export default ReferralWorthCalculator;
