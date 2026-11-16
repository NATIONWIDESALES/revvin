import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SALE_BANNER_COPY } from "@/config/pricing";
import { FREE_CTA_LABEL } from "@/config/planFeatures";

export default function SaleBanner({ live, onClick, disabled }: { live: boolean; onClick?: () => void; disabled?: boolean }) {
  if (!live) return null;
  return (
    <aside aria-label="Early Black Friday sale" className="border-y border-border bg-primary/5 px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-foreground">
        <p className="min-w-0 flex-1">{SALE_BANNER_COPY}</p>
        {onClick ? <Button size="sm" onClick={onClick} disabled={disabled}>Upgrade to Pro</Button> : <Button size="sm" asChild><Link to="/signup">{FREE_CTA_LABEL}</Link></Button>}
      </div>
    </aside>
  );
}