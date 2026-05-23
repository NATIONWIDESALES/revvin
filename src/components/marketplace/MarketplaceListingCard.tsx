import { Link } from "react-router-dom";
import { Star, MapPin, BadgeCheck } from "lucide-react";
import type { MockListing } from "@/hooks/useMockListings";

interface Props {
  listing: MockListing;
  compact?: boolean;
}

export default function MarketplaceListingCard({ listing, compact }: Props) {
  const services = listing.services.slice(0, 3);
  return (
    <Link
      to={`/business/${listing.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-product focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={listing.hero_image}
          alt={`${listing.name} — ${listing.category} in ${listing.city}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {listing.verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-foreground/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-background backdrop-blur">
            <BadgeCheck className="h-3 w-3" /> Verified
          </span>
        )}
        <span className="absolute bottom-3 left-3 inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm">
          Referral ${listing.referral_fee.toLocaleString()}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold leading-tight tracking-tight text-foreground line-clamp-1">
            {listing.name}
          </h3>
          <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            {listing.rating.toFixed(1)}
            <span className="text-xs font-normal text-muted-foreground">({listing.review_count})</span>
          </div>
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" /> {listing.city}, {listing.region} · {listing.category}
        </p>
        {!compact && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {services.map((s) => (
              <span
                key={s.name}
                className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-foreground/80"
              >
                {s.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}