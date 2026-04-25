import { Offer } from "@/types/offer";
import { Link } from "react-router-dom";
import { MapPin, Heart, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCountry } from "@/contexts/CountryContext";
import { toSlug } from "@/lib/utils";
import { useSavedOffers } from "@/hooks/useSavedOffers";
import { toast } from "sonner";

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
  "HVAC": "from-cyan-600 to-blue-800",
  "Plumbing": "from-sky-600 to-blue-900",
  "Insurance": "from-violet-600 to-purple-900",
  "Legal": "from-stone-600 to-stone-900",
  "Home Inspection": "from-teal-600 to-teal-900",
  "Paving": "from-zinc-600 to-zinc-800",
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
  const { isSaved, toggle } = useSavedOffers();
  const saved = isSaved(offer.id);
  const isLogoUrl = offer.businessLogo.startsWith("http");
  const color = getBusinessColor(offer.business);
  const monogram = offer.business
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const gradientClass = CATEGORY_GRADIENTS[offer.category] || "from-gray-600 to-gray-800";

  return (
    <Link
      to={`/offer/${toSlug(offer.business)}/${offer.id}`}
      className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`${offer.business} — ${offer.title}`}
    >
      <div className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-250 ease-out hover:shadow-card-hover hover:-translate-y-1 group-focus-visible:shadow-card-hover group-focus-visible:-translate-y-1 h-full flex flex-col" style={{ borderTopColor: color, borderTopWidth: '3px' }}>
        {/* Image / Logo area */}
        <div className="relative aspect-[4/3] bg-surface flex items-center justify-center overflow-hidden">
          {isLogoUrl ? (
            <img
              src={offer.businessLogo}
              alt={offer.business}
              className="h-full w-full object-cover transform-gpu will-change-transform transition-transform duration-500 ease-out group-hover:scale-105 group-focus-visible:scale-105"
            />
          ) : isSample ? (
            /* Gradient + monogram for sample offers */
            <div
              className={`h-full w-full bg-gradient-to-br ${gradientClass} flex items-center justify-center transform-gpu will-change-transform transition-transform duration-500 ease-out group-hover:scale-105 group-focus-visible:scale-105`}
            >
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm"
              >
                <span className="text-3xl font-bold text-white/90 leading-none">{offer.business.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
              </div>
            </div>
          ) : (
            /* Polished initials avatar for real businesses without a logo */
            <div
              className={`relative h-full w-full bg-gradient-to-br ${gradientClass} flex items-center justify-center overflow-hidden transform-gpu will-change-transform transition-transform duration-500 ease-out group-hover:scale-105 group-focus-visible:scale-105`}
            >
              {/* Soft radial highlight for depth */}
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  background:
                    "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.25), transparent 55%)",
                }}
              />
              {/* Faint grid texture */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
              <div
                className="relative flex h-24 w-24 items-center justify-center rounded-full ring-1 ring-white/30 border border-white/20 bg-white/15 backdrop-blur-sm shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)]"
                style={{ boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.12)` }}
              >
                <span
                  className="font-display text-3xl font-bold tracking-tight text-white leading-none"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
                >
                  {monogram}
                </span>
              </div>
            </div>
          )}
          {/* Heart icon */}
          <button
            type="button"
            aria-label={saved ? "Remove from saved" : "Save offer"}
            aria-pressed={saved}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const nowSaved = toggle(offer.id);
              toast(nowSaved ? "Saved to your list" : "Removed from saved", {
                description: offer.title,
              });
            }}
            className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm shadow-sm transform-gpu transition-transform duration-200 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <Heart className={`h-4 w-4 transition-all duration-200 ${saved ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </button>
          {offer.featured && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs shadow-sm">
              Featured
            </Badge>
          )}
          {/* Showcase offers blend in — no badge label */}
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
