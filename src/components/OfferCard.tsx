import { Offer } from "@/types/offer";
import { Link } from "react-router-dom";
import { MapPin, Star, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OfferCardProps {
  offer: Offer;
}

const OfferCard = ({ offer }: OfferCardProps) => {
  return (
    <Link to={`/offer/${offer.id}`} className="group block">
      <div className="card-hover rounded-xl border border-border bg-card p-6 shadow-sm">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl">
              {offer.businessLogo}
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-card-foreground group-hover:text-primary transition-colors">
                {offer.title}
              </h3>
              <p className="text-sm text-muted-foreground">{offer.business}</p>
            </div>
          </div>
          {offer.featured && (
            <Badge variant="secondary" className="text-xs">Featured</Badge>
          )}
        </div>

        {/* Description */}
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">
          {offer.description}
        </p>

        {/* Payout */}
        <div className="mb-4 rounded-lg bg-muted p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Earn per referral</span>
            <span className="earnings-badge rounded-full px-3 py-1 text-sm font-bold">
              {offer.payoutType === "flat" ? `$${offer.payout}` : `${offer.payout}%`}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
            {offer.successRate}% success
          </span>
        </div>
      </div>
    </Link>
  );
};

export default OfferCard;
