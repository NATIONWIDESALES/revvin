import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import OfferCard from "@/components/OfferCard";
import SEOHead from "@/components/SEOHead";
import { useDbOffers } from "@/hooks/useDbOffers";
import { useSavedOffers } from "@/hooks/useSavedOffers";
import { sampleOffers } from "@/data/sampleOffers";
import type { Offer } from "@/types/offer";

const SavedOffers = () => {
  const { data: dbOffers = [], isLoading } = useDbOffers();
  const { ids, clear } = useSavedOffers();

  // Build the same merged catalogue Browse uses, then preserve the order
  // in which offers were saved (most recent first).
  const saved = useMemo(() => {
    const real: (Offer & { isSample?: boolean })[] = dbOffers.map((o) => ({
      ...o,
      isSample: false as const,
    }));
    const samples: (Offer & { isSample?: boolean })[] = sampleOffers.map((o) => ({
      ...o,
      isSample: true as const,
    }));
    const all = [...real, ...samples];
    const byId = new Map(all.map((o) => [o.id, o] as const));
    return ids
      .map((id) => byId.get(id))
      .filter((o): o is Offer & { isSample?: boolean } => Boolean(o));
  }, [dbOffers, ids]);

  const hasSaved = saved.length > 0;

  return (
    <>
      <SEOHead
        title="Saved offers — Revvin"
        description="Your bookmarked referral opportunities. Open any saved offer to review the details and submit a warm lead."
      />
      <div className="container py-8 md:py-12">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Bookmark className="h-3.5 w-3.5" /> Your list
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Saved offers
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasSaved
                ? `${saved.length} offer${saved.length === 1 ? "" : "s"} bookmarked. Open any card to view full details.`
                : "Tap the heart on any offer to bookmark it for later."}
            </p>
          </div>
          {hasSaved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm("Remove all saved offers?")) clear();
              }}
              className="self-start sm:self-auto"
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Clear all
            </Button>
          )}
        </header>

        {isLoading && ids.length > 0 && saved.length === 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: Math.min(ids.length, 4) }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] animate-pulse rounded-xl bg-muted"
                aria-hidden
              />
            ))}
          </div>
        ) : hasSaved ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {saved.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                isSample={offer.isSample}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Heart className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              No saved offers yet
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Browse the marketplace and tap the heart icon on any referral
              opportunity to keep it here for quick access.
            </p>
            <Button asChild className="mt-5">
              <Link to="/browse">Browse referral offers</Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default SavedOffers;