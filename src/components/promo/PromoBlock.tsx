import { Link } from "react-router-dom";
import { Timer } from "lucide-react";
import {
  PROMO_END_DATE_TEXT,
  PROMO_TERMS,
  isPromoLive,
  promoFiguresFor,
  promoTermsFor,
} from "@/config/promo";
import type { BillingPlan } from "@/config/pricing";
import PromoCountdown, { usePromoCountdown } from "@/components/promo/PromoCountdown";

/**
 * Shared launch-promotion block. Used on the pricing page and at the go-live
 * moments. Renders nothing once the deadline has passed.
 *
 * `variant="full"` shows the headline price, the struck-through regular price,
 * the countdown and the terms. `variant="compact"` is a one-line strip for
 * banners that already carry their own CTA.
 */
/** `plan="both"` shows the monthly and annual promo prices side by side, for
 *  surfaces where no plan has been chosen yet. */
const PromoBlock = ({
  variant = "full",
  showCta = false,
  plan = "monthly",
  className = "",
}: {
  variant?: "full" | "compact";
  showCta?: boolean;
  plan?: BillingPlan | "both";
  className?: string;
}) => {
  const left = usePromoCountdown();
  if (!isPromoLive() || left.expired) return null;

  const both = plan === "both";
  const f = promoFiguresFor(both ? "monthly" : plan);
  const annual = promoFiguresFor("annual");
  const terms = both ? PROMO_TERMS : promoTermsFor(plan);

  if (variant === "compact") {
    return (
      <div className={`rounded-lg border border-primary/30 bg-primary/5 p-3 ${className}`}>
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-foreground">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Timer className="h-3.5 w-3.5" aria-hidden="true" /> Launch promotion
          </span>
          {both ? (
            <>
              <span className="font-bold">{f.priceWithPeriod}</span>
              <span className="text-muted-foreground">or</span>
              <span className="font-bold">{annual.priceWithPeriod}</span>
              <span className="text-muted-foreground">
                Instead of {f.regularWithPeriod} or {annual.regularWithPeriod}, if you publish before{" "}
                {PROMO_END_DATE_TEXT}.
              </span>
            </>
          ) : (
            <>
              <span className="font-bold">{f.priceWithPeriod}</span>
              <span className="text-muted-foreground line-through">{f.regularWithPeriod}</span>
              <span className="text-muted-foreground">
                Save {f.saving}, {f.discount} off, if you publish before {PROMO_END_DATE_TEXT}.
              </span>
            </>
          )}
        </p>
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{terms}</p>
        <PromoCountdown className="mt-1 text-[11px] text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border-2 border-primary/40 bg-primary/5 p-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" /> Launch promotion, ends {PROMO_END_DATE_TEXT}
        </p>
        <PromoCountdown className="text-xs text-muted-foreground" />
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-3">
        <span className="text-5xl font-extrabold tracking-tight text-foreground">
          {f.price}
        </span>
        <span className="text-sm text-muted-foreground">{f.period}</span>
        <span className="text-2xl font-semibold text-muted-foreground line-through">
          {f.regularWithPeriod}
        </span>
      </div>

      {both ? (
        <p className="mt-2 flex flex-wrap items-baseline gap-2 text-sm font-semibold text-foreground">
          <span>or {annual.priceWithPeriod}, paid once</span>
          <span className="font-normal text-muted-foreground line-through">{annual.regularWithPeriod}</span>
          <span className="font-normal text-muted-foreground">{annual.discount} off</span>
        </p>
      ) : (
        <p className="mt-2 text-sm font-semibold text-foreground">
          Save {f.saving} · {f.discount} off
        </p>
      )}

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{terms}</p>

      {showCta && (
        <Link
          to={`/signup?plan=${both ? "monthly" : plan}`}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-deep"
        >
          Build your page free
        </Link>
      )}
    </div>
  );
};

export default PromoBlock;
