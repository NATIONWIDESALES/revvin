import { Link } from "react-router-dom";

/**
 * Shared trust block used on the homepage pricing section and the pricing page.
 * Deliberately quiet: it exists to set expectations about who pays whom, not to
 * sell a feature. Every line here is true of the product today: the business
 * sets the reward, referrers submit leads, the business accepts and works them,
 * and Revvin records the reward without ever holding funds.
 */
const STEPS = [
  "You set the referral reward",
  "A referrer submits a lead",
  "You accept it and work the lead",
  "If the deal closes, you pay the referrer directly",
  "Revvin keeps the record. Revvin does not hold funds and does not take a cut",
];

const HowPayoutsWork = ({ className = "" }: { className?: string }) => (
  <section
    aria-labelledby="how-payouts-work"
    className={`rounded-2xl border border-border bg-card p-6 md:p-8 ${className}`}
  >
    <h3
      id="how-payouts-work"
      className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
    >
      How payouts work
    </h3>
    <ol className="mt-4 space-y-2.5">
      {STEPS.map((s, i) => (
        <li key={s} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
          <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-foreground/70">
            {i + 1}
          </span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
    <p className="mt-5 text-xs text-muted-foreground">
      More detail in the{" "}
      <Link to="/trust" className="font-medium text-foreground underline-offset-4 hover:underline">
        trust overview
      </Link>{" "}
      and the{" "}
      <Link to="/referral-agreement" className="font-medium text-foreground underline-offset-4 hover:underline">
        referral agreement
      </Link>
      .
    </p>
  </section>
);

export default HowPayoutsWork;