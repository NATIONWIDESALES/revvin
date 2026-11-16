import { useSale } from "@/lib/useSale";
import { Button } from "@/components/ui/button";
import { priceTextForSale, annualTermsForSale, PRICE_TEXT, type BillingPlan } from "@/config/pricing";

// Shared monthly/annual chooser for the go-live conversion points.
// Parent surfaces choose the initial plan; live sale upgrades favor Yearly.
const PlanPicker = ({
  plan,
  onChange,
  className = "",
  saleLive,
}: {
  plan: BillingPlan;
  onChange: (plan: BillingPlan) => void;
  className?: string;
  saleLive?: boolean;
}) => {
  const fetchedSale = useSale(false, saleLive === undefined);
  const live = saleLive ?? fetchedSale;
  const prices = priceTextForSale(live);
  const options: { value: BillingPlan; label: string; strike?: string; sub: string }[] = [
    { value: "monthly", label: `${prices.monthlyPerMonth} USD`, strike: live ? PRICE_TEXT.monthly : undefined, sub: "Billed monthly" },
    {
      value: "annual",
      label: `${prices.annualPerYear} USD`,
      strike: live ? PRICE_TEXT.annual : undefined,
      sub: live ? "Best value. Billed once a year." : "Billed once. Two months free.",
    },
  ];

  return (
    <div className={className}>
      <div role="radiogroup" aria-label="Billing period" className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const active = plan === o.value;
          return (
            <Button variant="outline"
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`h-auto justify-start whitespace-normal rounded-lg border p-3 text-left transition-colors ${
                active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="block w-full"><span className="flex flex-wrap items-baseline gap-1.5 text-sm font-semibold text-foreground">
                <span>{o.label}</span>
                {o.strike && (
                  <span className="text-xs font-normal text-muted-foreground line-through">{o.strike}</span>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{o.sub}</span></span>
            </Button>
          );
        })}
      </div>
      {plan === "annual" && (
        <p className="mt-2 text-xs text-muted-foreground">{annualTermsForSale(live)}</p>
      )}
    </div>
  );
};

export default PlanPicker;