import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

const fmt = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

const RoiCalculator = () => {
  const [dealValue, setDealValue] = useState(8000);
  const [reward, setReward] = useState(500);
  const [referrals, setReferrals] = useState(3);

  const { revenue, payouts, net, multiple } = useMemo(() => {
    const revenue = dealValue * referrals;
    const payouts = reward * referrals;
    const net = revenue - payouts - 49;
    const multiple = net > 0 ? net / 49 : 0;
    return { revenue, payouts, net, multiple };
  }, [dealValue, reward, referrals]);

  return (
    <div className="mx-auto mt-10 max-w-5xl rounded-2xl border border-border bg-card p-6 shadow-product md:p-10">
      <div className="mb-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Run your own numbers
        </p>
        <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          Your break-even calculator
        </h3>
      </div>

      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="space-y-5">
          <div>
            <label
              htmlFor="roi-deal"
              className="mb-1.5 block text-sm font-semibold text-foreground"
            >
              What's one closed deal worth to you?
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="roi-deal"
                type="number"
                inputMode="numeric"
                min={0}
                step={100}
                aria-label="Revenue per closed deal in dollars"
                value={dealValue}
                onChange={(e) =>
                  setDealValue(clamp(Number(e.target.value) || 0, 0, 10_000_000))
                }
                className="pl-7"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="roi-reward"
              className="mb-1.5 block text-sm font-semibold text-foreground"
            >
              What would you pay a referrer per closed deal?
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="roi-reward"
                type="number"
                inputMode="numeric"
                min={0}
                step={25}
                aria-label="Referrer reward per closed deal in dollars"
                value={reward}
                onChange={(e) =>
                  setReward(clamp(Number(e.target.value) || 0, 0, 1_000_000))
                }
                className="pl-7"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="roi-count"
                className="block text-sm font-semibold text-foreground"
              >
                How many referrals do you expect per month?
              </label>
              <span
                aria-hidden="true"
                className="text-sm font-bold tabular-nums text-primary"
              >
                {referrals}
              </span>
            </div>
            <input
              id="roi-count"
              type="range"
              min={1}
              max={20}
              step={1}
              value={referrals}
              aria-label={`Expected referrals per month: ${referrals}`}
              onChange={(e) => setReferrals(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>1</span>
              <span>20</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-warm p-6 md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Estimated monthly net profit
          </p>
          <p className="mt-2 text-5xl font-extrabold tracking-tight text-foreground md:text-6xl">
            {fmt(net)}
          </p>
          {net > 0 && (
            <p className="mt-3 text-sm font-semibold text-foreground">
              That's <span className="text-primary">{Math.round(multiple).toLocaleString("en-US")}x</span>{" "}
              your $49 Revvin cost.
            </p>
          )}

          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">New revenue</dt>
              <dd className="font-semibold tabular-nums text-foreground">{fmt(revenue)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Referrer payouts</dt>
              <dd className="font-semibold tabular-nums text-foreground">−{fmt(payouts)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Revvin</dt>
              <dd className="font-semibold tabular-nums text-foreground">−$49</dd>
            </div>
          </dl>

          <p className="mt-5 text-xs text-muted-foreground">
            Estimates only — actual results depend on your referrals.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoiCalculator;