import { BadgeCheck, FileCheck, HandCoins, MessageSquareQuote, Star } from "lucide-react";

export interface TrustFacts {
  /** Reward amount text, e.g. "$100", only when the business has an active, allowed reward. */
  reward: string | null;
  reviewCount: number;
  ratingAvg: number | null;
  hasLicense: boolean;
  takesQuotes: boolean;
}
export interface TrustBadge { key: string; label: string }

/** Badges for a claimed business, in priority order. Each appears only when true. */
export function trustBadges(f: TrustFacts): TrustBadge[] {
  const out: TrustBadge[] = [{ key: "claimed", label: "Claimed by owner" }];
  if (f.reward) out.push({ key: "reward", label: `Pays referral rewards: ${f.reward}` });
  if (f.reviewCount > 0) out.push({ key: "reviews", label: `${f.reviewCount} review${f.reviewCount === 1 ? "" : "s"}${f.ratingAvg !== null ? `, ${f.ratingAvg.toFixed(1)} stars` : ""}` });
  if (f.hasLicense) out.push({ key: "license", label: "Licence on file" });
  if (f.takesQuotes) out.push({ key: "quotes", label: "Takes quote requests" });
  return out;
}

const ICON = { claimed: BadgeCheck, reward: HandCoins, reviews: Star, license: FileCheck, quotes: MessageSquareQuote } as const;

export default function TrustBadges({ facts, max, className = "" }: { facts: TrustFacts; max?: number; className?: string }) {
  const list = trustBadges(facts).slice(0, max ?? 99);
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Trust badges" data-testid="trust-badges">
      {list.map((b) => {
        const I = ICON[b.key as keyof typeof ICON];
        return (
          <li key={b.key} className="inline-flex items-center gap-1 rounded-full border border-green/40 bg-secondary px-2 py-0.5 text-xs font-medium text-forest">
            <I className={`h-3.5 w-3.5 ${b.key === "reviews" ? "fill-sign text-sign" : ""}`} aria-hidden />{b.label}
          </li>
        );
      })}
    </ul>
  );
}
