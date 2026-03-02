import { Trophy, TrendingUp, Info } from "lucide-react";

const placeholderEntries = [
  { rank: 1, name: "Sarah M.", earnings: "$12,450", city: "Austin" },
  { rank: 2, name: "James R.", earnings: "$9,800", city: "Dallas" },
  { rank: 3, name: "Maria L.", earnings: "$8,320", city: "Houston" },
  { rank: 4, name: "David K.", earnings: "$7,100", city: "Austin" },
  { rank: 5, name: "Lisa P.", earnings: "$6,750", city: "San Antonio" },
];

interface LeaderboardPreviewProps {
  city?: string;
}

const LeaderboardPreview = ({ city = "Your City" }: LeaderboardPreviewProps) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-display text-lg font-bold mb-1 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-accent" /> Top Earners in {city}
      </h2>
      <div className="flex items-center gap-1.5 mb-4">
        <Info className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground font-medium">Example leaderboard. Coming soon</span>
      </div>
      <div className="space-y-3">
        {placeholderEntries.map((entry) => (
          <div key={entry.rank} className="flex items-center gap-3">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              entry.rank <= 3 ? "bg-accent/10 text-accent-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {entry.rank}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{entry.name}</p>
              <p className="text-xs text-muted-foreground">{entry.city}</p>
            </div>
            <span className="font-display text-sm font-bold text-earnings">{entry.earnings}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
        <TrendingUp className="h-3.5 w-3.5" />
        <span>Submit more referrals to climb the leaderboard</span>
      </div>
    </div>
  );
};

export default LeaderboardPreview;
