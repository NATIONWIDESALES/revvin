import { panelColumns } from "@/lib/directory";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { List, Map as MapIcon, Search, SlidersHorizontal } from "lucide-react";
import { lazyWithChunkRecovery as lazy } from "@/lib/chunkRecovery";
import SEOHead from "@/components/SEOHead";
import { PAGE_META } from "@/content/pageMeta";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DirectoryCard, { CardSkeleton, OwnerCard } from "@/components/marketplace/DirectoryCard";
import type { DirectoryMapHandle } from "@/components/marketplace/DirectoryMap";
import { track } from "@/lib/track";
import { loadCardExtras } from "@/lib/profile";
import { zoomBucket } from "@/lib/analyticsPrivacy";
import {
  DIRECTORY_CATEGORIES, PAGE_SIZE, PIN_ZOOM, cityLocation, countLine, directoryClusters, entryHref,
  marketplaceSearch, openingView, parseMarketplaceParams, rewardBounds, searchMap,
  type Bounds, type DirectoryCluster, type DirectoryEntry, type MapSort, type MarketplaceState,
} from "@/lib/directory";

// MapLibre is only downloaded when a map is actually shown.
const DirectoryMap = lazy(() => import("@/components/marketplace/DirectoryMap"));

export const MARKETPLACE_H1 = "Find a local business";
export const MARKETPLACE_EMPTY = "No businesses listed here yet.";
export const REWARDS_EMPTY = "No businesses with a referral reward in this area yet.";
const ALL = "all";

const useDebounced = <T,>(value: T, ms: number) => {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
};

type View = { bounds: Bounds; zoom: number; center: { lat: number; lng: number } };

export default function Marketplace() {
  const navigate = useNavigate();
  // URL state is read after mount so the prerendered first render matches.
  const [init, setInit] = useState<{ state: MarketplaceState; view: { lat: number; lng: number; z: number } | null } | null>(null);
  const [query, setQuery] = useState("");
  const q = useDebounced(query, 300);
  const [placeQ, setPlaceQ] = useState<string | null>(null);
  const [trade, setTrade] = useState(ALL);
  const cat = trade === ALL ? "" : trade;
  const [rewards, setRewards] = useState(false);
  const [sort, setSort] = useState<MapSort>("featured");
  const [desktop, setDesktop] = useState(true);
  const [mapFailed, setMapFailed] = useState(false);
  const [rawView, setRawView] = useState<View | null>(null);
  const view = useDebounced(rawView, 300);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [clusters, setClusters] = useState<DirectoryCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [panelCols, setPanelCols] = useState(1);
  const mapRef = useRef<DirectoryMapHandle>(null);
  const panel = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<string, HTMLAnchorElement>());
  const lastBucket = useRef<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const state = parseMarketplaceParams(window.location.search);
    let tz: string | undefined;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { tz = undefined; }
    setQuery(state.q);
    setTrade(state.trade || ALL);
    setRewards(state.rewards);
    setInit({ state, view: openingView(state, tz) });
    track("marketplace_viewed");
  }, []);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  useEffect(() => {
    const el = panel.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setPanelCols(panelColumns(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [desktop]);

  // Shareable view: position and filters in the query string.
  useEffect(() => {
    if (!init) return;
    const s: MarketplaceState = {
      lat: rawView?.center.lat ?? init.view?.lat ?? null, lng: rawView?.center.lng ?? init.view?.lng ?? null,
      z: rawView?.zoom ?? init.view?.z ?? null, q: query, trade: cat, rewards,
    };
    if (!rawView && !init.state.lat) { s.lat = null; s.lng = null; s.z = null; }
    const next = `${window.location.pathname}${marketplaceSearch(window.location.search, s)}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(window.history.state, "", next);
    try { sessionStorage.setItem("revvin:marketplace_view", marketplaceSearch("", s)); } catch { /* storage blocked */ }
  }, [init, rawView, query, cat, rewards]);

  // A search that names a known city moves the map there instead of filtering by text.
  useEffect(() => {
    if (!init || q.trim().length < 3) { setPlaceQ(null); return; }
    let live = true;
    cityLocation(q).then((loc) => {
      if (!live) return;
      if (loc) { setPlaceQ(q); mapRef.current?.flyTo(loc.lat, loc.lng, 10); } else setPlaceQ(null);
    }).catch(() => { if (live) setPlaceQ(null); });
    return () => { live = false; };
  }, [q, init]);
  const textQ = placeQ !== null && placeQ === q ? "" : q;
  const cityPending = q.trim().length >= 3 && placeQ === null;

  const bounds = mapFailed ? null : view?.bounds ?? null;
  const ready = Boolean(init) && (mapFailed || Boolean(view));
  useEffect(() => {
    if (!ready || cityPending) return;
    const id = ++reqId.current;
    setLoading(true);
    setFailed(false);
    searchMap({ bounds, category: cat, q: textQ, rewardsOnly: rewards, sort, offset: 0 })
      .then(({ rows, total: t }) => { if (id === reqId.current) { setEntries(rows); setTotal(t); panel.current?.scrollTo({ top: 0 }); } })
      .catch(() => { if (id === reqId.current) { setEntries([]); setTotal(0); setFailed(true); } })
      .finally(() => { if (id === reqId.current) setLoading(false); });
  }, [ready, bounds, cat, textQ, rewards, sort, retry, cityPending]);

  const hasMore = !loading && entries.length < total;
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const id = reqId.current;
    setLoadingMore(true);
    searchMap({ bounds, category: cat, q: textQ, rewardsOnly: rewards, sort, offset: entries.length })
      .then(({ rows }) => { if (id === reqId.current) setEntries((prev) => [...prev, ...rows]); })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, bounds, cat, textQ, rewards, sort, entries.length]);
  useEffect(() => {
    const el = sentinel.current, root = panel.current;
    if (!el || !root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); }, { root, rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  const clustered = Boolean(view && view.zoom < PIN_ZOOM && !textQ && !rewards);
  useEffect(() => {
    if (!view || !clustered) { setClusters([]); return; }
    let live = true;
    directoryClusters(view.bounds, view.zoom, cat).then((c) => { if (live) setClusters(c ?? []); }).catch(() => { if (live) setClusters([]); });
    return () => { live = false; };
  }, [view, clustered, cat]);

  const onMove = useCallback((b: Bounds, zoom: number, initial: boolean, center?: { lat: number; lng: number }) => {
    setRawView({ bounds: b, zoom, center: center ?? { lat: (b.minLat + b.maxLat) / 2, lng: (b.minLng + b.maxLng) / 2 } });
    if (initial) return;
    const bucket = zoomBucket(zoom);
    if (bucket !== lastBucket.current) { lastBucket.current = bucket; track("marketplace_map_moved", { zoom: bucket }); }
  }, []);
  const onSelect = useCallback((slug: string) => {
    setSelected(slug);
    requestAnimationFrame(() => cards.current.get(slug)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" }));
  }, []);
  const onFail = useCallback(() => { setMapFailed(true); setSheetOpen(true); }, []);
  const onOpen = useCallback((e: DirectoryEntry) => navigate(entryHref(e)), [navigate]);
  const showAllRewards = async () => {
    const b = await rewardBounds().catch(() => null);
    if (b) mapRef.current?.fitBounds(b);
    else if (!mapFailed) mapRef.current?.flyTo(45, -96, 3);
  };

  // Photos and stars for claimed businesses, one batched call per page of results.
  const [extras, setExtras] = useState<Record<string, NonNullable<DirectoryEntry["extra"]>>>({});
  useEffect(() => {
    const need = entries.filter((e) => e.kind === "business" && !(e.slug in extras)).map((e) => e.slug);
    if (need.length === 0) return;
    let live = true;
    loadCardExtras(need).then((x) => { if (live) setExtras((prev) => {
      const next = { ...prev, ...x };
      for (const s of need) if (!(s in next)) next[s] = { cover_url: null, photo_url: null, rating_avg: null, review_count: 0 };
      return next;
    }); }).catch(() => {});
    return () => { live = false; };
  }, [entries, extras]);
  const shown = useMemo(() => entries.map((e) => (e.kind === "business" && extras[e.slug] ? { ...e, extra: extras[e.slug] } : e)), [entries, extras]);
  const pins = useMemo(() => (clustered ? [] : shown), [clustered, shown]);
  const showSkeleton = loading || !ready;
  const header = showSkeleton ? "Loading businesses" : failed ? "" : countLine(total);
  const cols = !desktop || panelCols === 1 ? "grid-cols-1" : panelCols === 2 ? "grid-cols-2" : "grid-cols-3";
  const compact = !desktop;

  const listFree = (
    <Button asChild className="h-10 shrink-0">
      <Link to="/signup" onClick={() => track("cta_clicked", { cta: "marketplace_list_free" })}>List your business free</Link>
    </Button>
  );
  const tradeSelect = (cls: string) => (
    <Select value={trade} onValueChange={setTrade}>
      <SelectTrigger className={cls} aria-label="Trade"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All trades</SelectItem>
        {DIRECTORY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
      </SelectContent>
    </Select>
  );
  const sortSelect = (cls: string) => (
    <Select value={sort} onValueChange={(v) => setSort(v as MapSort)}>
      <SelectTrigger className={cls} aria-label="Sort"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="featured">Featured</SelectItem>
        <SelectItem value="name">Name A to Z</SelectItem>
      </SelectContent>
    </Select>
  );
  const rewardsChip = (
    <button type="button" aria-pressed={rewards} onClick={() => setRewards((r) => !r)}
      className={`h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${rewards ? "border-forest bg-forest text-primary-foreground" : "border-line bg-card text-foreground hover:border-forest"}`}>
      Pays referral rewards
    </button>
  );
  const searchBox = (
    <label className="relative min-w-0 flex-1 lg:max-w-sm">
      <span className="sr-only">Search by business name or city</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input value={query} onChange={(e) => setQuery(e.target.value.slice(0, 80))} placeholder="Business name or city" className="h-10 pl-9" />
    </label>
  );

  const items: React.ReactNode[] = shown.map((e) => (
    <li key={`${e.kind}:${e.slug}`}>
      <DirectoryCard entry={e} compact={compact} selected={selected === e.slug}
        onHover={(s) => setSelected(s)}
        ref={(node) => { if (node) cards.current.set(e.slug, node); else cards.current.delete(e.slug); }} />
    </li>
  ));
  if (!rewards && entries.length > 0) items.unshift(<li key="owner-card" className="col-span-full"><OwnerCard wide={!desktop || panelCols > 1} /></li>);

  const list = (
    <div className="p-4">
      {failed ? (
        <div className="rounded-xl border border-line bg-card p-6 text-center">
          <p className="font-semibold">The list could not load.</p>
          <Button variant="outline" className="mt-3 h-11" onClick={() => setRetry((n) => n + 1)}>Try again</Button>
        </div>
      ) : showSkeleton ? (
        <ul className={`grid gap-3 ${cols}`} aria-hidden>{Array.from({ length: 6 }, (_, i) => <li key={i}><CardSkeleton compact={compact} /></li>)}</ul>
      ) : entries.length === 0 && rewards ? (
        <div className="rounded-xl border border-line bg-card p-6 text-center">
          <p className="font-semibold">{REWARDS_EMPTY}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="outline" className="h-11" onClick={showAllRewards}>Show all rewards</Button>
            <Button asChild className="h-11"><Link to="/signup" onClick={() => track("cta_clicked", { cta: "marketplace_list_free" })}>List your business free</Link></Button>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-card p-6 text-center">
            <p className="font-semibold">{MARKETPLACE_EMPTY} Try zooming out or another trade.</p>
          </div>
          <OwnerCard />
        </div>
      ) : (
        <>
          <ul className={`grid gap-3 ${cols}`}>{items}</ul>
          <div ref={sentinel} />
          {hasMore && (
            <div className="mt-4 text-center">
              <Button variant="outline" className="h-11" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading" : "Show more"}</Button>
            </div>
          )}
        </>
      )}
      <p className="mt-6 text-xs text-muted-foreground">
        Businesses that joined Revvin entered their own details. Unclaimed listings come from the Overture Maps Foundation Places data (<a className="underline" href="https://overturemaps.org" target="_blank" rel="noopener noreferrer">overturemaps.org</a>), licensed CDLA-Permissive-2.0, with some records under Apache-2.0. Map data from OpenStreetMap contributors.
      </p>
    </div>
  );

  const map = init && !mapFailed && (
    <Suspense fallback={<div className="h-full w-full bg-secondary" />}>
      <DirectoryMap ref={mapRef} clusters={clusters} pins={pins} selected={selected} onMove={onMove} onSelect={onSelect}
        onFail={onFail} onOpen={onOpen} hrefFor={entryHref} initialView={init.view} className="h-full w-full" />
    </Suspense>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <SEOHead title={PAGE_META["/browse"].title} description={PAGE_META["/browse"].description} path="/browse" noindex follow />
      <h1 className="sr-only">{MARKETPLACE_H1}</h1>
      {/* Filter bar */}
      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-paper px-3 lg:px-4">
        {searchBox}
        {desktop ? (
          <>
            {tradeSelect("h-10 w-48")}
            {rewardsChip}
            {sortSelect("h-10 w-40")}
            <span className="ml-auto" />
            {listFree}
          </>
        ) : (
          <Button type="button" variant="outline" className="h-10 shrink-0 gap-2" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden />Filters{(cat || rewards) ? " (on)" : ""}
          </Button>
        )}
      </form>

      {desktop ? (
        <div className="flex min-h-0 flex-1">
          {!mapFailed && <section aria-label="Map" className="relative h-full w-[58%] shrink-0">{map}</section>}
          <section aria-label="Businesses" className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-line">
            <p className="shrink-0 border-b border-line px-4 py-2.5 text-sm font-semibold text-foreground" aria-live="polite">{header}</p>
            <div ref={panel} className="min-h-0 flex-1 overflow-y-auto">{list}</div>
          </section>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="absolute inset-0">{map}</div>
          {/* Bottom sheet: only its own area takes touches when collapsed. */}
          <section aria-label="Businesses"
            className={`absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-2xl border-t border-line bg-paper shadow-[0_-6px_20px_hsl(var(--forest)/0.15)] transition-[height] duration-300 motion-reduce:transition-none ${sheetOpen || mapFailed ? "h-[88%]" : "h-[84px]"}`}>
            <button type="button" onClick={() => setSheetOpen((o) => !o)} aria-expanded={sheetOpen}
              onPointerDown={(e) => { (e.currentTarget as HTMLElement).dataset.y = String(e.clientY); }}
              onPointerUp={(e) => { const y0 = Number((e.currentTarget as HTMLElement).dataset.y); if (Number.isFinite(y0) && Math.abs(e.clientY - y0) > 30) { e.preventDefault(); setSheetOpen(e.clientY < y0); } }}
              className="shrink-0 touch-none px-4 pb-2 pt-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="mx-auto mb-2 block h-1.5 w-10 rounded-full bg-line" aria-hidden />
              <span className="block text-sm font-semibold" aria-live="polite">{header || "Businesses"}</span>
              <span className="sr-only">{sheetOpen ? "Show map" : "Show list"}</span>
            </button>
            <div ref={panel} className={`min-h-0 flex-1 overflow-y-auto ${sheetOpen || mapFailed ? "" : "hidden"}`}>{list}</div>
          </section>
          {!mapFailed && (
            <button type="button" onClick={() => setSheetOpen((o) => !o)}
              className="absolute bottom-[100px] left-1/2 z-20 inline-flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-forest px-5 text-sm font-semibold text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={sheetOpen ? { bottom: "16px" } : undefined}>
              {sheetOpen ? <><MapIcon className="h-4 w-4" aria-hidden />Map</> : <><List className="h-4 w-4" aria-hidden />List</>}
            </button>
          )}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
              <div className="mt-4 grid gap-4">
                <label className="grid gap-1 text-sm font-medium">Trade{tradeSelect("h-11 w-full")}</label>
                <div>{rewardsChip}</div>
                <label className="grid gap-1 text-sm font-medium">Sort{sortSelect("h-11 w-full")}</label>
                <Button className="h-11" onClick={() => setFiltersOpen(false)}>Show results</Button>
                <Link to="/signup" className="text-center text-sm font-medium text-primary underline underline-offset-4" onClick={() => track("cta_clicked", { cta: "marketplace_list_free" })}>List your business free</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}
