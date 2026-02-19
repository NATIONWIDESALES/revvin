import { Offer } from "@/types/offer";
import { Link } from "react-router-dom";
import { MapPin, Star, TrendingUp, Clock, DollarSign, Shield, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OfferCardProps {
  offer: Offer;
}

const OfferCard = ({ offer }: OfferCardProps) => {
  return (
    <Link to={`/offer/${offer.id}`} className="group block">
      <div className="card-hover rounded-2xl border border-border bg-card p-6 shadow-sm h-full flex flex-col">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl shadow-sm">
              {offer.businessLogo}
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-card-foreground group-hover:text-primary transition-colors">
                {offer.title}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                {offer.business}
                <Shield className="h-3 w-3 text-primary" />
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {offer.featured && (
              <Badge className="bg-accent text-accent-foreground text-xs">Featured</Badge>
            )}
            {offer.remoteEligible && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Wifi className="h-3 w-3" /> Remote
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2 flex-1">
          {offer.description}
        </p>

        {/* Payout + Deal Size */}
        <div className="mb-4 rounded-xl bg-muted/50 border border-border/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Earn per referral</span>
            <span className="earnings-badge rounded-full px-3.5 py-1 text-sm font-bold shadow-sm">
              {offer.payoutType === "flat" ? `$${offer.payout}` : `${offer.payout}%`}
            </span>
          </div>
          {(offer.dealSizeMin || offer.dealSizeMax) && (
            <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Deal size</span>
              <span className="font-medium">${offer.dealSizeMin?.toLocaleString()} – ${offer.dealSizeMax?.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {offer.location}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            {offer.rating}
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            {offer.successRate}%
          </span>
          {offer.closeTimeDays && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {offer.closeTimeDays}d
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default OfferCard;
