import { Offer } from "@/types/offer";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Star, TrendingUp, Clock, DollarSign, Wifi, BadgeCheck, ArrowRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import QualificationTooltip from "@/components/QualificationTooltip";
import OfferScoreBadge from "@/components/OfferScoreBadge";
import { useCountry } from "@/contexts/CountryContext";
import { calculateOfferScore } from "@/data/mockOffers";

interface OfferCardProps {
  offer: Offer;
}

const payoutTimelineLabel = (timeline?: string) => {
  if (timeline === "net7") return "Paid Net 7 after close";
  if (timeline === "net14") return "Paid Net 14 after close";
  if (timeline === "net30") return "Paid Net 30 after close";
  return null;
};

const OfferCard = ({ offer }: OfferCardProps) => {
  const navigate = useNavigate();
  const { formatPayout } = useCountry();
  const countryFlag = offer.country === "CA" ? "🇨🇦" : "🇺🇸";
  const offerScore = calculateOfferScore(offer);

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
                {countryFlag} {offer.business}
                {(offer.verified !== false) && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
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

        {/* Payout Highlight */}
        <div className="mb-4 rounded-xl bg-earnings/5 border border-earnings/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-earnings uppercase tracking-wide">Earn per referral</span>
            <div className="flex items-center gap-1.5">
              {offer.fundSecured && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 border-primary/30 text-primary">
                  <ShieldCheck className="h-3 w-3" /> Secured
                </Badge>
              )}
              <QualificationTooltip rules={offer.qualificationRules} />
            </div>
          </div>
          <div className="text-center mb-2">
            <span className="earnings-badge rounded-full px-6 py-2 text-lg font-bold shadow-sm inline-block">
              {offer.payoutType === "flat" ? formatPayout(offer.payout, offer.currency) : `${offer.payout}%`}
            </span>
            <span className="ml-2 text-xs font-medium text-muted-foreground">{offer.currency}</span>
          </div>
          {(offer.dealSizeMin || offer.dealSizeMax) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Avg deal size</span>
              <span className="font-medium">{offer.currency === "CAD" ? "CA" : ""}${offer.dealSizeMin?.toLocaleString()} – ${offer.dealSizeMax?.toLocaleString()}</span>
            </div>
          )}
          {offer.closeTimeDays && (
            <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Payout timeline</span>
              <span className="font-medium">{payoutTimelineLabel(offer.payoutTimeline) ?? `~${offer.closeTimeDays} days`}</span>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mb-4">
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{offer.location}</span>
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-accent text-accent" />{offer.rating}</span>
          <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />{offer.successRate}%</span>
          {offer.serviceRadius && <span className="text-[10px] text-muted-foreground/60">• {offer.serviceRadius}</span>}
          <OfferScoreBadge score={offerScore} />
        </div>

        {/* CTAs */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button size="sm" className="flex-1 gap-1 text-xs" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/offer/${offer.id}`); }}>
            Submit Referral <ArrowRight className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="text-xs" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/offer/${offer.id}`); }}>
            View Offer
          </Button>
        </div>
      </div>
    </Link>
  );
};

export default OfferCard;
