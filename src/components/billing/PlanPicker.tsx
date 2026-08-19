import { PRICE_TEXT, ANNUAL_TERMS_COPY, type BillingPlan } from "@/config/pricing";

// Shared monthly/annual chooser for the go-live conversion points.
// Monthly is always the default.
const PlanPicker = ({
  plan,
  onChange,
  className = "",
}: {
  plan: BillingPlan;
  onChange: (plan: BillingPlan) => void;
  className?: string;
}) => {
  const options: { value: BillingPlan; label: string; strike?: string; sub: string }[] = [
    { value: "monthly", label: `${PRICE_TEXT.monthlyPerMonth} USD`, sub: "Billed monthly" },
    {
      value: "annual",
      label: `${PRICE_TEXT.annualPerYear} USD`,
      sub: `${PRICE_TEXT.effectiveMonthly}, save ${PRICE_TEXT.saving} (${PRICE_TEXT.discount} off)`,
    },
  ];

  return (
    <div className={className}>
      <div role="radiogroup" aria-label="Billing period" className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const active = plan === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="flex flex-wrap items-baseline gap-1.5 text-sm font-semibold text-foreground">
                <span>{o.label}</span>
                {o.strike && (
                  <span className="text-xs font-normal text-muted-foreground line-through">{o.strike}</span>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{o.sub}</span>
            </button>
          );
        })}
      </div>
      {plan === "annual" && (
        <p className="mt-2 text-xs text-muted-foreground">{ANNUAL_TERMS_COPY}</p>
      )}
    </div>
  );
};

export default PlanPicker;