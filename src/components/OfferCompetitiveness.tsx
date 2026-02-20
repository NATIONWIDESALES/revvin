interface OfferCompetitivenessProps {
  score?: number; // 0-100
  label?: string;
}

const OfferCompetitiveness = ({ score = 65, label = "Competitive" }: OfferCompetitivenessProps) => {
  const color = score >= 75 ? "bg-earnings" : score >= 50 ? "bg-accent" : "bg-destructive";
  const textColor = score >= 75 ? "text-earnings" : score >= 50 ? "text-accent-foreground" : "text-destructive";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Offer Competitiveness</span>
        <span className={`text-sm font-bold ${textColor}`}>{label}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {score >= 75 ? "Your payout is higher than most in this category." : score >= 50 ? "Competitive, but could improve with a higher payout or faster timeline." : "Consider increasing your payout to attract more referrers."}
      </p>
    </div>
  );
};

export default OfferCompetitiveness;
