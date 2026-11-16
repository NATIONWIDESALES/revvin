import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, ArrowUpRight } from "lucide-react";
import { SALE_CTA_LABEL, saleDestination } from "@/lib/salePresentation";

export default function SaleBanner({ live, owner = false, countdown = "Ends November 30", onDismiss }: { live: boolean; owner?: boolean; countdown?: string; onDismiss?: () => void }) {
  if (!live) return null;
  return (
    <aside aria-label="Early Black Friday sale" className="bf-bar bg-forest text-primary-foreground">
      <div className="bf-bar-inner">
        <p className="bf-bar-copy"><strong className="text-sign">Early Black Friday</strong><span>30% off monthly, 40% off yearly. <span className="bf-bar-lock">Locked in for as long as you stay subscribed.</span></span></p>
        <span className="bf-countdown text-sign">{countdown}</span>
        <Button variant="sign" asChild className="bf-bar-cta"><Link to={saleDestination(owner)}>{SALE_CTA_LABEL}<ArrowUpRight aria-hidden="true" className="hidden lg:block" /></Link></Button>
        {onDismiss && <Button variant="ghost" size="icon" className="bf-dismiss text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" aria-label="Dismiss sale banner" onClick={onDismiss}><X aria-hidden="true" /></Button>}
      </div>
    </aside>
  );
}