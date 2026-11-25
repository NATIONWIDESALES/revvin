import { forwardRef } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck, BrickWall, Bug, Building2, Car, CircleDot, ClipboardCheck, DoorOpen, Droplets, Fence, Flame, Hammer, Home, KeyRound,
  Layers, Paintbrush, Refrigerator, Sparkles, Sun, Trash2, Trees, Truck, Warehouse, Waves, Wrench, Zap,
  type LucideIcon,
} from "lucide-react";
import { tradeInfo, cardRewardAmount, entryHref, placeLine, tradePlace, type DirectoryEntry } from "@/lib/directory";
import { track } from "@/lib/track";
import { cardMedia } from "@/lib/profile";
import Stars from "@/components/profile/Stars";

const ICONS: Record<string, LucideIcon> = {
  roof: Home, door: DoorOpen, garage: Warehouse, paint: Paintbrush, brick: BrickWall, hammer: Hammer, layers: Layers,
  fridge: Refrigerator, key: KeyRound, inspect: ClipboardCheck, flame: Flame, wrench: Wrench, zap: Zap, sun: Sun, trees: Trees,
  fence: Fence, waves: Waves, drops: Droplets, sparkles: Sparkles, bug: Bug, truck: Truck, trash: Trash2, car: Car, tire: CircleDot,
  building: Building2,
};
/** A plain trade icon for cards with no photo or logo, from the shared trade list. Never a stock photo. */
export function tradeIcon(category: string | null | undefined): LucideIcon {
  return ICONS[tradeInfo(category)?.icon ?? ""] ?? Building2;
}

interface Props { entry: DirectoryEntry; selected?: boolean; compact?: boolean; onHover?: (slug: string | null) => void }

const DirectoryCard = forwardRef<HTMLAnchorElement, Props>(({ entry, selected, compact, onHover }, ref) => {
  const reward = cardRewardAmount(entry);
  const place = placeLine(entry);
  const unclaimed = entry.kind === "listing";
  const Icon = tradeIcon(entry.category);
  const media = cardMedia(entry, entry.extra);
  const rated = entry.is_pro && entry.extra && entry.extra.review_count > 0 && entry.extra.rating_avg !== null;
  if (unclaimed) return (
    <Link
      ref={ref}
      to={entryHref(entry)}
      onClick={() => track("marketplace_card_clicked", { kind: entry.kind })}
      onMouseEnter={() => onHover?.(entry.slug)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(entry.slug)}
      onBlur={() => onHover?.(null)}
      data-slug={entry.slug}
      data-compact="1"
      aria-current={selected ? "true" : undefined}
      className={`flex min-h-[84px] min-w-0 items-center gap-3 rounded-xl border border-line bg-card p-3 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "ring-2 ring-sign" : ""}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground/70" aria-hidden strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-foreground/85">{entry.name}</span>
          <span className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[11px] text-muted-foreground">Unclaimed</span>
        </span>
        <span className="block truncate text-sm text-muted-foreground">{tradePlace(entry)}</span>
        <span className="block text-sm text-primary underline underline-offset-4">Is this yours? Claim it</span>
      </span>
    </Link>
  );
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
        {media?.kind === "photo" ? (
          <img src={media.url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : media?.kind === "logo" ? (
          <img src={media.url} alt="" loading="lazy" className="max-h-[60%] max-w-[60%] rounded-lg object-contain" />
        ) : (
          <Icon className={`h-10 w-10 ${unclaimed ? "text-muted-foreground/60" : "text-forest/70"}`} aria-hidden strokeWidth={1.5} />
        )}
        {entry.is_pro && <span className="absolute left-0 top-0 rounded-br-lg bg-green px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">Featured</span>}
        {unclaimed && <span className="absolute right-2 top-2 rounded border border-line bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground">Unclaimed</span>}
      </span>
      <span className="flex min-w-0 flex-1 flex-col p-3">
        <span className={`line-clamp-2 break-words font-semibold ${unclaimed ? "text-foreground/85" : "text-foreground"}`}>{entry.name}</span>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">{tradePlace(entry)}</span>
        {rated && (
          <span className="mt-1 flex items-center gap-1.5 text-sm">
            <Stars value={entry.extra!.rating_avg!} size={14} />
            <span className="text-muted-foreground">{entry.extra!.rating_avg!.toFixed(1)} ({entry.extra!.review_count.toLocaleString("en-US")})</span>
          </span>
        )}
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

export function OwnerCard({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`flex h-full ${wide ? "min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-4" : ""} flex-col justify-center rounded-xl bg-forest px-4 py-3 text-primary-foreground`}>
      <div>
      <p className="text-base font-bold leading-snug">Own a business? Claim your free profile</p>
      <p className="mt-1 text-sm opacity-90">Add your logo, photos and a referral reward. Free.</p>
      </div>
      <Link to="/signup" onClick={() => track("cta_clicked", { cta: "marketplace_owner_card" })}
        className={`${wide ? "mt-3 min-[480px]:mt-0" : "mt-3"} inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-sign px-4 font-semibold text-forest hover:bg-sign/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}>
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
