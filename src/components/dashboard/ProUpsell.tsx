import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRICE_TEXT } from "@/config/pricing";
import { PRO_FEATURES } from "@/config/planFeatures";

// Publishing a referral page is free. Revvin Pro buys leverage: the tools that
// ask a whole customer list for you, the reporting that shows what it produced,
// and custom branding. This copy lives in one place so no surface describes Pro
// differently.
export const PRO_COPY = {
  customers: {
    title: PRO_FEATURES[1].label,
    body: `${PRO_FEATURES[0].description} ${PRO_FEATURES[1].description}`,
  },
  reporting: {
    title: PRO_FEATURES[3].label,
    body: PRO_FEATURES[3].description,
  },
  branding: {
    title: PRO_FEATURES[4].label,
    body: PRO_FEATURES[4].description,
  },
} as const;

/**
 * Not a lock. The page and the referrals are already free, so this is an
 * upgrade offer rather than a gate on something the owner has paid for.
 */
const ProUpsell = ({ title, body }: { title: string; body: string }) => (
  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
      <TrendingUp className="h-4 w-4" />
    </div>
    <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
    <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{body}</p>
    <Button asChild size="lg" className="mt-5">
      <Link to="/pricing">See Revvin Pro, {PRICE_TEXT.monthlyPerMonth}</Link>
    </Button>
    <p className="mt-3 text-xs text-muted-foreground">Your page and your referrals stay free.</p>
  </div>
);

export default ProUpsell;
