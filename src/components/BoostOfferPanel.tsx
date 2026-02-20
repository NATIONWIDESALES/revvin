import { Zap, Clock, BadgeCheck, MapPin, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const boosts = [
  { id: "fast_pay", icon: Clock, label: "Fast Pay Boost", desc: "Priority Net 7 payout — attract more referrers", badge: "Coming in Pro" },
  { id: "verified", icon: BadgeCheck, label: "Verified Boost", desc: "Priority placement in verified-only filters", badge: "Coming in Pro" },
  { id: "featured_city", icon: MapPin, label: "Featured in City", desc: "Top placement in your city's marketplace listings", badge: "Coming in Pro" },
];

const BoostOfferPanel = () => {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-bold flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent-foreground" /> Boost Your Offer
        </h3>
        <Badge variant="secondary" className="text-[10px] gap-1"><Lock className="h-2.5 w-2.5" /> Pro</Badge>
      </div>
      <div className="space-y-2.5">
        {boosts.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3 opacity-75 cursor-not-allowed">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 shrink-0">
              <b.icon className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{b.label}</p>
              <p className="text-[10px] text-muted-foreground">{b.desc}</p>
            </div>
            <Badge variant="outline" className="text-[9px] shrink-0">{b.badge}</Badge>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3 text-center">Boost features available in Pro tier — Stripe-ready</p>
    </div>
  );
};

export default BoostOfferPanel;
