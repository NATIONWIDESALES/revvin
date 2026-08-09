import { Link, useLocation } from "react-router-dom";
import { Timer } from "lucide-react";
import {
  PROMO_END_DATE_TEXT,
  PROMO_TEXT,
  isPromoLive,
} from "@/config/promo";
import { usePromoCountdown } from "@/components/promo/PromoCountdown";

// Routes where the persistent promo bar belongs. /signup is deliberately
// excluded: the bar costs ~124px above the first field on a phone and the page
// already states the price, so it was pushing the whole form below the fold.
const ALLOWED = ["/", "/auth", "/login", "/welcome"];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Persistent launch-promotion bar. Not dismissible on purpose: a visitor must
 * always see promo pricing and the deadline before converting. Renders nothing
 * once the fixed deadline passes.
 */
const PromoBar = ({ standalone = false }: { standalone?: boolean }) => {
  const { pathname } = useLocation();
  const left = usePromoCountdown();

  if (!isPromoLive() || left.expired) return null;
  if (!standalone && !ALLOWED.includes(pathname)) return null;

  return (
    <div className="border-b border-primary/30 bg-primary/10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-[13px] text-foreground">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" /> Launch promotion
        </span>
        <span>
          <span className="font-bold">{PROMO_TEXT.pricePerMonth}</span>{" "}
          <span className="text-muted-foreground line-through">{PROMO_TEXT.regularPerMonth}</span>{" "}
          <span className="text-muted-foreground">or</span>{" "}
          <span className="font-bold">{PROMO_TEXT.annualPerYear}</span>{" "}
          <span className="text-muted-foreground line-through">{PROMO_TEXT.annualRegularPerYear}</span>
        </span>
        <span className="text-muted-foreground">
          Publish before {PROMO_END_DATE_TEXT} and your price is locked.
        </span>
        <span className="font-semibold tabular-nums text-foreground">
          {left.days}d {pad(left.hours)}h {pad(left.minutes)}m {pad(left.seconds)}s left
        </span>
        <Link
          to="/signup?plan=monthly"
          className="font-semibold text-primary underline underline-offset-2 hover:text-primary-deep"
        >
          Build your page free
        </Link>
      </div>
    </div>
  );
};

export default PromoBar;
