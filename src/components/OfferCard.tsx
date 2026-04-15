import { Offer } from "@/types/offer";
import { Link } from "react-router-dom";
import { MapPin, Heart, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCountry } from "@/contexts/CountryContext";
import { toSlug } from "@/lib/utils";
import { useState } from "react";

interface OfferCardProps {
  offer: Offer;
  isSample?: boolean;
  isNew?: boolean;
}

const INITIAL_COLORS = ['#6366F1', '#0D9488', '#D97706', '#E11D48', '#15803D', '#7C3AED'];

const CATEGORY_GRADIENTS: Record<string, string> = {
  "Roofing": "from-slate-700 to-slate-900",
  "Energy": "from-amber-500 to-orange-600",
  "Real Estate": "from-blue-700 to-indigo-900",
  "Mortgage": "from-emerald-700 to-green-900",
  "Finance": "from-emerald-700 to-green-900",
  "Services": "from-rose-500 to-orange-500",
  "Landscaping": "from-green-600 to-emerald-800",
};

function getBusinessColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return INITIAL_COLORS[Math.abs(hash) % INITIAL_COLORS.length];
}

const OfferCard = ({ offer, isSample, isNew }: OfferCardProps) => {
  const { formatPayout } = useCountry();
  const [saved, setSaved] = useState(false);
  const isLogoUrl = offer.businessLogo.startsWith("http");
  const color = getBusinessColor(offer.business);
  const initial = offer.business.charAt(0).toUpperCase();
  const gradientClass = CATEGORY_GRADIENTS[offer.category] || "from-gray-600 to-gray-800";

  return (
    <Link to={`/offer/${toSlug(offer.business)}/${offer.id}`} className="group block">
      <div className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-250 ease-out hover:shadow-card-hover hover:-translate-y-1 h-full flex flex-col" style={{ borderTopColor: color, borderTopWidth: '3px' }}>
        {/* Image / Logo area */}
        <div className="relative aspect-[4/3] bg-surface flex items-center justify-center overflow-hidden">
          {isLogoUrl ? (
            <img src={offer.businessLogo} alt={offer.business} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" />
          ) : isSample ? (
            /* Gradient + monogram for sample offers */
            <div className={`h-full w-full bg-gradient-to-br ${gradientClass} flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105`}>
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm"
              >
                <span className="text-3xl font-bold text-white/90 leading-none">{offer.business.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
              </div>
            </div>
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
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm shadow-sm transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <Heart className={`h-4 w-4 transition-all duration-200 ${saved ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </button>
          {offer.featured && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs shadow-sm">
              Featured
            </Badge>
          )}
          {isSample && !offer.featured && (
            <Badge variant="outline" className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-xs">
              Sample
            </Badge>
          )}
          {isNew && !isSample && (
            <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground text-xs shadow-sm">
              New on REVVIN
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
