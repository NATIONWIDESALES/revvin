import { Offer } from "@/types/offer";
import { Link } from "react-router-dom";
import { MapPin, Heart, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCountry } from "@/contexts/CountryContext";
import { toSlug } from "@/lib/utils";
import { useState } from "react";

interface OfferCardProps {
  offer: Offer;
}

const INITIAL_COLORS = ['#6366F1', '#0D9488', '#D97706', '#E11D48', '#15803D', '#7C3AED'];

function getBusinessColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return INITIAL_COLORS[Math.abs(hash) % INITIAL_COLORS.length];
}

const OfferCard = ({ offer }: OfferCardProps) => {
  const { formatPayout } = useCountry();
  const [saved, setSaved] = useState(false);
  const isLogoUrl = offer.businessLogo.startsWith("http");
  const color = getBusinessColor(offer.business);
  const initial = offer.business.charAt(0).toUpperCase();

  return (
    <Link to={`/offer/${toSlug(offer.business)}/${offer.id}`} className="group block">
      <div className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 h-full flex flex-col" style={{ borderTopColor: color, borderTopWidth: '3px' }}>
        {/* Image / Logo area */}
        <div className="relative aspect-[4/3] bg-surface flex items-center justify-center overflow-hidden">
          {isLogoUrl ? (
            <img src={offer.businessLogo} alt={offer.business} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: color }}
            >
              <span className="text-[28px] font-bold text-white leading-none">{initial}</span>
            </div>
          )}
          {/* Heart icon */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSaved(!saved); }}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm shadow-sm transition-all duration-200 hover:scale-110"
          >
            <Heart className={`h-4 w-4 transition-all duration-200 ${saved ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </button>
          {offer.featured && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs shadow-sm">
              Featured
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {offer.business}
              {offer.verified !== false && <BadgeCheck className="inline ml-1 h-3.5 w-3.5 text-primary" />}
            </p>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-1">{offer.title}</p>

          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" /> {offer.location}
          </p>

          <div className="flex items-center justify-between mt-auto pt-2">
            <Badge variant="outline" className="text-xs font-normal">
              {offer.category}
            </Badge>
            <p className="text-base font-bold text-foreground">
              {formatPayout(offer.payout, offer.currency)}
              <span className="text-xs font-normal text-muted-foreground ml-1">/ referral</span>
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default OfferCard;
