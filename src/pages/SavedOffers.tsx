import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Heart, Trash2, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import OfferCard from "@/components/OfferCard";
import SEOHead from "@/components/SEOHead";
import { useDbOffers } from "@/hooks/useDbOffers";
import { useSavedOffers } from "@/hooks/useSavedOffers";
import { sampleOffers } from "@/data/sampleOffers";
import type { Offer } from "@/types/offer";

type SortKey = "recent" | "payout" | "nearest";

const SORT_STORAGE_KEY = "revvin:saved-offers:sort";

function readSort(): SortKey {
  if (typeof window === "undefined") return "recent";
  const v = window.localStorage.getItem(SORT_STORAGE_KEY);
  return v === "payout" || v === "nearest" ? v : "recent";
}

// Great-circle distance in km (haversine).
function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

const SavedOffers = () => {
  const { data: dbOffers = [], isLoading } = useDbOffers();
  const { ids, clear } = useSavedOffers();
  const [sort, setSort] = useState<SortKey>(readSort);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Persist sort selection.
  useEffect(() => {
    try {
      window.localStorage.setItem(SORT_STORAGE_KEY, sort);
    } catch {
      /* no-op */
    }
  }, [sort]);

  // Build the same merged catalogue Browse uses, preserving save order
  // (most recent saves first) before any sort is applied.
  const savedInSaveOrder = useMemo(() => {
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

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast("Location unavailable", {
        description: "Your browser does not support geolocation.",
      });
      setSort("recent");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast("Couldn't get your location", {
          description:
            err.code === err.PERMISSION_DENIED
              ? "Permission denied. Showing most recent instead."
              : "Showing most recent instead.",
        });
        setSort("recent");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  };

  // Auto-request location the first time "nearest" is selected (or chosen via persisted state).
  useEffect(() => {
    if (sort === "nearest" && !coords && !locating) {
      requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const saved = useMemo(() => {
    const list = [...savedInSaveOrder];
    if (sort === "payout") {
      return list.sort((a, b) => b.payout - a.payout);
    }
    if (sort === "nearest" && coords) {
      const withDist = list.map((o) => {
        const hasCoords =
          typeof o.latitude === "number" && typeof o.longitude === "number";
        const d = hasCoords
          ? distanceKm(coords, { lat: o.latitude!, lng: o.longitude! })
          : Number.POSITIVE_INFINITY;
        return { offer: o, d };
      });
      withDist.sort((a, b) => a.d - b.d);
      return withDist.map((x) => x.offer);
    }
    // "recent" — already in save order
    return list;
  }, [savedInSaveOrder, sort, coords]);

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
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <label htmlFor="saved-sort" className="sr-only">
                Sort saved offers
              </label>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger
                  id="saved-sort"
                  className="h-9 w-[180px] text-sm"
                  aria-label="Sort saved offers"
                >
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most recently saved</SelectItem>
                  <SelectItem value="payout">Highest payout</SelectItem>
                  <SelectItem value="nearest">Nearest location</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm("Remove all saved offers?")) clear();
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Clear all
              </Button>
            </div>
          )}
        </header>

        {hasSaved && sort === "nearest" && (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {locating ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Getting your location…
              </span>
            ) : coords ? (
              <>
                <span>Sorted by distance from your current location.</span>
                <button
                  type="button"
                  onClick={requestLocation}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Refresh location
                </button>
              </>
            ) : (
              <>
                <span>Location needed to sort by distance.</span>
                <button
                  type="button"
                  onClick={requestLocation}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Allow location
                </button>
              </>
            )}
          </div>
        )}

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