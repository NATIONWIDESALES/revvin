import { Gauge } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { OfferScore } from "@/lib/offerUtils";

interface OfferScoreBadgeProps {
  score: OfferScore;
  compact?: boolean;
}

const OfferScoreBadge = ({ score, compact = true }: OfferScoreBadgeProps) => {
  const color = score.total >= 75 ? "text-earnings" : score.total >= 50 ? "text-primary" : "text-muted-foreground";
  const bgColor = score.total >= 75 ? "bg-earnings/10" : score.total >= 50 ? "bg-primary/10" : "bg-muted";
  const label = score.total >= 75 ? "Excellent" : score.total >= 50 ? "Good" : "Fair";

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${bgColor} ${color}`}>
            <Gauge className="h-3 w-3" />
            {score.total}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] p-3">
          <p className="text-xs font-semibold mb-2">Offer Score: {score.total}/100 — {label}</p>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between"><span>Verified</span><span className="font-bold">{score.verificationScore}/30</span></div>
            <div className="flex justify-between"><span>Payout Rank</span><span className="font-bold">{score.payoutCompetitiveness}/30</span></div>
            <div className="flex justify-between"><span>Pay Speed</span><span className="font-bold">{score.payoutSpeed}/25</span></div>
            <div className="flex justify-between"><span>Close Time</span><span className="font-bold">{score.closeTimeScore}/15</span></div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${score.total >= 75 ? "border-earnings/20 bg-earnings/5" : score.total >= 50 ? "border-primary/20 bg-primary/5" : "border-border bg-muted/30"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium flex items-center gap-1.5"><Gauge className="h-4 w-4" /> Offer Score</span>
        <span className={`text-sm font-bold ${color}`}>{score.total}/100 — {label}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${score.total >= 75 ? "bg-earnings" : score.total >= 50 ? "bg-primary" : "bg-muted-foreground"}`} style={{ width: `${score.total}%` }} />
      </div>
    </div>
  );
};

export default OfferScoreBadge;
