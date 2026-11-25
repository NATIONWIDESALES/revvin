import { forwardRef } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck, Building2, Bug, Car, Flame, Hammer, Home, KeyRound, Paintbrush, Snowflake, Sparkles, Sun, Trees, Wrench, Zap,
  type LucideIcon,
} from "lucide-react";
import { cardRewardAmount, entryHref, placeLine, type DirectoryEntry } from "@/lib/directory";
import { track } from "@/lib/track";

/** A plain trade icon for cards with no photo or logo. Never a stock photo. */
export function tradeIcon(category: string): LucideIcon {
  const c = category.toLowerCase();
  if (c.includes("plumb")) return Wrench;
  if (c.includes("hvac") || c.includes("heat")) return Flame;
  if (c.includes("cool") || c.includes("air")) return Snowflake;
  if (c.includes("roof")) return Home;
  if (c.includes("electric")) return Zap;
  if (c.includes("landscap") || c.includes("lawn") || c.includes("tree")) return Trees;
  if (c.includes("auto") || c.includes("car")) return Car;
  if (c.includes("paint")) return Paintbrush;
  if (c.includes("lock")) return KeyRound;
  if (c.includes("pest")) return Bug;
  if (c.includes("clean")) return Sparkles;
  if (c.includes("solar")) return Sun;
  if (c.includes("contractor") || c.includes("home services") || c.includes("handyman")) return Hammer;
  return Building2;
}

interface Props { entry: DirectoryEntry; selected?: boolean; compact?: boolean; onHover?: (slug: string | null) => void }

const DirectoryCard = forwardRef<HTMLAnchorElement, Props>(({ entry, selected, compact, onHover }, ref) => {
  const reward = cardRewardAmount(entry);
  const place = placeLine(entry);
  const unclaimed = entry.kind === "listing";
  const Icon = tradeIcon(entry.category);
  return (
    <Link
      ref={ref}
      to={entryHref(entry)}
      onClick={() => track("marketplace_card_clicked", { kind: entry.kind })}
      onMouseEnter={() => onHover?.(entry.slug)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(entry.slug)}
      onBlur={() => onHover?.(null)}
      data-slug={entry.slug}
      aria-current={selected ? "true" : undefined}
      className={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        entry.is_pro ? "border-2 border-green" : "border-line"} ${selected ? "ring-2 ring-sign" : ""}`}
    >
      <span className={`relative flex w-full shrink-0 items-center justify-center ${compact ? "aspect-[16/7]" : "aspect-video"} ${unclaimed ? "bg-muted" : "bg-secondary"}`}>
        {entry.logo_url ? (
          <img src={entry.logo_url} alt="" loading="lazy" className="max-h-[60%] max-w-[60%] rounded-lg object-contain" />
        ) : (
          <Icon className={`h-10 w-10 ${unclaimed ? "text-muted-foreground/60" : "text-forest/70"}`} aria-hidden strokeWidth={1.5} />
        )}
        {entry.is_pro && <span className="absolute left-0 top-0 rounded-br-lg bg-green px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">Featured</span>}
        {unclaimed && <span className="absolute right-2 top-2 rounded border border-line bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground">Unclaimed</span>}
      </span>
      <span className="flex min-w-0 flex-1 flex-col p-3">
        <span className={`line-clamp-2 break-words font-semibold ${unclaimed ? "text-foreground/85" : "text-foreground"}`}>{entry.name}</span>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">{[entry.category, place].filter(Boolean).join(" · ")}</span>
        {(entry.is_pro || entry.is_verified) && (
          <span className="mt-1.5 flex flex-wrap items-center gap-2">
            {entry.is_pro && <span className="rounded bg-forest px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">Pro</span>}
            {entry.is_verified && <span className="inline-flex items-center gap-1 text-xs font-medium text-primary"><BadgeCheck className="h-3.5 w-3.5" aria-hidden />Verified</span>}
          </span>
        )}
        {reward && (
          <span className="mt-2 block">
            <span className="inline-block rounded-full bg-sign/30 px-2.5 py-0.5 text-sm font-semibold text-forest">Pays {reward} per referral</span>
            <span className="mt-1 block text-xs text-muted-foreground">paid by the business when the job closes</span>
          </span>
        )}
        {unclaimed && <span className="mt-auto pt-2 text-sm text-primary underline underline-offset-4">Is this yours? Claim it</span>}
      </span>
    </Link>
  );
});
DirectoryCard.displayName = "DirectoryCard";
export default DirectoryCard;

export function OwnerCard() {
  return (
    <div className="flex h-full min-h-[220px] flex-col justify-center rounded-xl bg-forest p-5 text-primary-foreground">
      <p className="text-lg font-bold leading-snug">Own a business? Claim your free profile</p>
      <p className="mt-2 text-sm opacity-90">Add your logo, photos and a referral reward. Free.</p>
      <Link to="/signup" onClick={() => track("cta_clicked", { cta: "marketplace_owner_card" })}
        className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-sign px-4 font-semibold text-forest hover:bg-sign/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        List your business free
      </Link>
    </div>
  );
}

export function CardSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-card" aria-hidden>
      <div className={`${compact ? "aspect-[16/7]" : "aspect-video"} w-full animate-pulse bg-muted motion-reduce:animate-none`} />
      <div className="space-y-2 p-3"><div className="h-4 w-3/4 rounded bg-muted" /><div className="h-3 w-1/2 rounded bg-muted" /><div className="h-3 w-1/3 rounded bg-muted" /></div>
    </div>
  );
}
