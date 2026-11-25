import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { List, Map as MapIcon, Search } from "lucide-react";
import { lazyWithChunkRecovery as lazy } from "@/lib/chunkRecovery";
import SEOHead from "@/components/SEOHead";
import { PAGE_META } from "@/content/pageMeta";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DirectoryCard from "@/components/marketplace/DirectoryCard";
import OwnerStrip from "@/components/marketplace/OwnerStrip";
import { track } from "@/lib/track";
import { zoomBucket } from "@/lib/analyticsPrivacy";
import {
  DIRECTORY_CATEGORIES, PIN_ZOOM, directoryClusters, searchDirectory,
  type Bounds, type DirectoryCluster, type DirectoryEntry,
} from "@/lib/directory";

// MapLibre is only downloaded when a map is actually shown.
const DirectoryMap = lazy(() => import("@/components/marketplace/DirectoryMap"));

export const MARKETPLACE_H1 = "Find local businesses that pay for referrals";
export const MARKETPLACE_SUB = "Browse businesses near you. Know someone who needs one? Refer them, and the business pays you a reward when the job closes.";
export const MARKETPLACE_EMPTY = "No businesses listed here yet.";
const ALL = "all";

const useDebounced = <T,>(value: T, ms: number) => {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
};

export default function Marketplace() {
  const [query, setQuery] = useState("");
  const q = useDebounced(query, 300);
  const [category, setCategory] = useState(ALL);
  const cat = category === ALL ? "" : category;
  const [view, setView] = useState<"list" | "map">("list");
  const [desktop, setDesktop] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  // Bounds that filter the list: null until someone moves the map, so the first
  // list also includes listed businesses that have no location yet.
  const [listBounds, setListBounds] = useState<Bounds | null>(null);
  const [mapView, setMapView] = useState<{ bounds: Bounds; zoom: number } | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [clusters, setClusters] = useState<DirectoryCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const cards = useRef(new Map<string, HTMLAnchorElement>());
  const lastBucket = useRef<string | null>(null);

  useEffect(() => { track("marketplace_viewed"); }, []);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setFailed(false);
    searchDirectory({ bounds: listBounds, category: cat, q, limit: 200 })
      .then((rows) => { if (live) setEntries(rows ?? []); })
      .catch(() => { if (live) { setEntries([]); setFailed(true); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [listBounds, cat, q, retry]);

  const clustered = Boolean(mapView && mapView.zoom < PIN_ZOOM && !q);
  useEffect(() => {
    if (!mapView || !clustered) { setClusters([]); return; }
    let live = true;
    directoryClusters(mapView.bounds, mapView.zoom, cat).then((c) => { if (live) setClusters(c ?? []); }).catch(() => { if (live) setClusters([]); });
    return () => { live = false; };
  }, [mapView, clustered, cat]);

  const onMove = useCallback((bounds: Bounds, zoom: number, initial: boolean) => {
    setMapView({ bounds, zoom });
    if (initial) return;
    setListBounds(bounds);
    const bucket = zoomBucket(zoom);
    if (bucket !== lastBucket.current) { lastBucket.current = bucket; track("marketplace_map_moved", { zoom: bucket }); }
  }, []);
  const onSelect = useCallback((slug: string) => {
    setSelected(slug);
    setView("list");
    requestAnimationFrame(() => cards.current.get(slug)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }, []);
  const onFail = useCallback(() => { setMapFailed(true); setView("list"); }, []);

  const showMap = !mapFailed && (desktop || view === "map");
  const pins = useMemo(() => (clustered ? [] : entries), [clustered, entries]);
  const located = entries.filter((e) => e.lat != null).length;

  const list = (
    <div className="min-w-0">
      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {loading ? "Loading businesses" : failed ? "" : `${entries.length} ${entries.length === 1 ? "business" : "businesses"}${listBounds ? " in this area" : ""}`}
      </p>
      {failed ? (
        <div className="rounded-xl border border-line bg-card p-6 text-center">
          <p className="font-semibold">The list could not load.</p>
          <Button variant="outline" className="mt-3 h-11" onClick={() => setRetry((n) => n + 1)}>Try again</Button>
        </div>
      ) : !loading && entries.length === 0 ? (
        <div className="rounded-xl border border-line bg-card p-6 text-center">
          <p className="font-semibold">{MARKETPLACE_EMPTY} Own one? <Link to="/signup" className="text-primary underline underline-offset-4">List it free.</Link></p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {entries.map((e) => (
            <li key={`${e.kind}:${e.slug}`}>
              <DirectoryCard
                entry={e}
                selected={selected === e.slug}
                onHover={(s) => s && setSelected(s)}
                ref={(node) => { if (node) cards.current.set(e.slug, node); else cards.current.delete(e.slug); }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <main className="bg-paper">
      <SEOHead title={PAGE_META["/browse"].title} description={PAGE_META["/browse"].description} path="/browse" noindex follow />
      <section className="mk-wrap pt-10 pb-6">
        <h1 className="font-display text-[clamp(30px,4.4vw,52px)] leading-[1.02] text-forest">{MARKETPLACE_H1}</h1>
        <p className="mt-3 max-w-[40em] text-lg text-muted-foreground">{MARKETPLACE_SUB}</p>
        <form className="mt-6 flex flex-col gap-3 sm:flex-row" role="search" onSubmit={(e) => e.preventDefault()}>
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search by business name or city</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value.slice(0, 80))} placeholder="Business name or city" className="h-11 pl-9" />
          </label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-11 sm:w-52" aria-label="Trade"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All trades</SelectItem>
              {DIRECTORY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </form>
        <OwnerStrip className="mt-5" />
        {mapFailed && <p className="mt-4 text-sm text-muted-foreground" role="status">The map could not load, so here is the list.</p>}
        {!mapFailed && (
          <div className="mt-4 inline-flex rounded-lg border border-line bg-card p-1 lg:hidden" role="group" aria-label="View">
            <Button type="button" variant={view === "list" ? "default" : "ghost"} className="h-11 gap-2" aria-pressed={view === "list"} onClick={() => setView("list")}><List className="h-4 w-4" aria-hidden />List</Button>
            <Button type="button" variant={view === "map" ? "default" : "ghost"} className="h-11 gap-2" aria-pressed={view === "map"} onClick={() => setView("map")}><MapIcon className="h-4 w-4" aria-hidden />Map</Button>
          </div>
        )}
      </section>
      <section className="mk-wrap pb-16" aria-label="Businesses">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          {showMap && (
            <div className="min-w-0 lg:sticky lg:top-[88px] lg:self-start">
              <Suspense fallback={<div className="h-[60vh] rounded-xl border border-line bg-card lg:h-[calc(100vh-120px)]" />}>
                <DirectoryMap
                  clusters={clusters}
                  pins={pins}
                  selected={selected}
                  onMove={onMove}
                  onSelect={onSelect}
                  onFail={onFail}
                  className="h-[60vh] overflow-hidden rounded-xl border border-line lg:h-[calc(100vh-120px)]"
                />
              </Suspense>
              {!loading && entries.length > located && !clustered && (
                <p className="mt-2 text-xs text-muted-foreground">{entries.length - located} listed without a location are in the list only.</p>
              )}
            </div>
          )}
          <div className={view === "map" && !desktop && !mapFailed ? "hidden" : ""}>{list}</div>
        </div>
      </section>
    </main>
  );
}
