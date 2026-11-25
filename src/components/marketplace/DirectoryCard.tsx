import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { cardReward, entryHref, initials, placeLine, type DirectoryEntry } from "@/lib/directory";
import { track } from "@/lib/track";

interface Props { entry: DirectoryEntry; selected?: boolean; onHover?: (slug: string | null) => void }

const DirectoryCard = forwardRef<HTMLAnchorElement, Props>(({ entry, selected, onHover }, ref) => {
  const reward = cardReward(entry);
  const place = placeLine(entry);
  return (
    <Link
      ref={ref}
      to={entryHref(entry)}
      onClick={() => track("marketplace_card_clicked", { kind: entry.kind })}
      onMouseEnter={() => onHover?.(entry.slug)}
      onMouseLeave={() => onHover?.(null)}
      data-slug={entry.slug}
      aria-current={selected ? "true" : undefined}
      className={`flex min-w-0 gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-forest ring-2 ring-sign" : "border-line"}`}
    >
      {entry.logo_url ? (
        <img src={entry.logo_url} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover" />
      ) : (
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-forest">{initials(entry.name)}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 break-words font-semibold text-foreground">{entry.name}</span>
          {entry.is_pro && <span className="rounded bg-forest px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">Pro</span>}
          {entry.is_verified && <span className="inline-flex items-center gap-1 text-xs font-medium text-primary"><BadgeCheck className="h-3.5 w-3.5" aria-hidden />Verified</span>}
          {entry.kind === "listing" && <span className="rounded border border-line px-1.5 py-0.5 text-[11px] text-muted-foreground">Unclaimed</span>}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{[entry.category, place].filter(Boolean).join(" · ")}</span>
        {reward && <span className="mt-1.5 block text-sm font-medium text-forest">{reward}</span>}
      </span>
    </Link>
  );
});
DirectoryCard.displayName = "DirectoryCard";
export default DirectoryCard;
