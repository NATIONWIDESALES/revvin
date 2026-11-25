import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/track";
import { loadSupabase } from "@/lib/supabaseLazy";
import { capturePreview, previewSignupUrl, storePreview, suggestedReward } from "@/lib/instantPreview";
import { DEFAULT_VIEW, clusterLabel, directoryClusters, listingClaimPreview, loadListing, placeLine, type DirectoryCluster } from "@/lib/directory";
import { bandCountLine, cachedValue, clusterSpots, FIND_MIN_CHARS, type FindRow } from "@/lib/findBusiness";

const HOUR = 60 * 60 * 1000;
const [[minLng, minLat], [maxLng, maxLat]] = DEFAULT_VIEW.bounds;

async function findBusinesses(name: string, city: string): Promise<FindRow[]> {
  const db = await loadSupabase();
  const { data, error } = await db.rpc("fn_directory_find" as never, { p_name: name, p_city: city || null, p_limit: 6 } as never);
  if (error) throw new Error(error.message);
  return (data ?? []) as FindRow[];
}

export default function FindBusinessBand() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [rows, setRows] = useState<FindRow[] | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [clusters, setClusters] = useState<DirectoryCluster[]>([]);
  const searched = useRef(false);
  const seq = useRef(0);

  useEffect(() => {
    cachedValue("revvin_dir_count", HOUR, async () => {
      const db = await loadSupabase();
      const { data, error } = await db.rpc("fn_directory_public_count" as never);
      if (error) throw error;
      return Number(data);
    }).then((n) => setCount(Number.isFinite(n) && n > 0 ? n : null)).catch(() => setCount(null));
    cachedValue("revvin_dir_clusters", HOUR, () =>
      directoryClusters({ minLat, minLng, maxLat, maxLng }, 3)).then(setClusters).catch(() => setClusters([]));
  }, []);

  const typed = name.trim();
  useEffect(() => {
    if (typed.length < FIND_MIN_CHARS) { setRows(null); return; }
    const id = ++seq.current;
    const t = window.setTimeout(() => {
      if (!searched.current) { searched.current = true; track("home_find_business_search"); }
      findBusinesses(typed, city.trim()).then((r) => { if (id === seq.current) setRows(r); }).catch(() => { if (id === seq.current) setRows([]); });
    }, 300);
    return () => window.clearTimeout(t);
  }, [typed, city]);

  const claim = async (slug: string) => {
    track("home_find_business_claim_click");
    const listing = await loadListing(slug).catch(() => null);
    if (!listing) { navigate(`/b/${slug}`); return; }
    const data = listingClaimPreview(listing);
    storePreview(data);
    navigate(previewSignupUrl(data));
  };
  const add = () => {
    track("home_find_business_add_click");
    const data = capturePreview(typed, "other", suggestedReward("other"), window.location.href);
    storePreview(data);
    navigate(previewSignupUrl(data));
  };
  const spots = clusterSpots(clusters, DEFAULT_VIEW.bounds, 8);

  return (
    <section id="find-your-business" aria-labelledby="find-heading" className="scroll-mt-20 border-y border-line bg-card">
      <div className="mk-wrap grid items-center gap-10 py-14 lg:min-h-[420px] lg:grid-cols-[1.05fr_.95fr]">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-green">Revvin Marketplace</p>
          <h2 id="find-heading" className="mt-2 font-display text-[clamp(30px,4vw,48px)] leading-[1] text-forest">Is your business already on Revvin?</h2>
          <p className="mt-4 max-w-[36em] text-lg text-muted-foreground">{bandCountLine(count)}</p>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row" role="search" onSubmit={(e) => { e.preventDefault(); if (typed.length >= FIND_MIN_CHARS && rows?.length === 0) add(); }}>
            <label className="sr-only" htmlFor="find-name">Business name</label>
            <Input id="find-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name" maxLength={80} autoComplete="organization" className="h-12 bg-background sm:flex-[1.4]" />
            <label className="sr-only" htmlFor="find-city">City (optional)</label>
            <Input id="find-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" maxLength={60} autoComplete="address-level2" className="h-12 bg-background sm:flex-1" />
            <Button type="submit" className="h-12 shrink-0 px-5"><Search className="mr-1.5 h-4 w-4" aria-hidden />Find my business</Button>
          </form>
          {rows && (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-background" aria-live="polite" data-testid="find-results">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-foreground">{r.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">{[r.category, placeLine(r)].filter(Boolean).join(" · ")}</span>
                  </span>
                  {r.claimed ? (
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="rounded border border-line px-1.5 py-0.5 text-xs text-muted-foreground">Claimed</span>
                      <Link to={`/b/${r.slug}`} className="text-sm font-semibold text-primary underline underline-offset-4">View profile</Link>
                    </span>
                  ) : (
                    <Button size="sm" variant="line" className="shrink-0" onClick={() => claim(r.slug)}>Claim it free</Button>
                  )}
                </li>
              ))}
              <li className="px-4 py-3">
                <button type="button" onClick={add} className="text-left text-sm font-semibold text-primary underline underline-offset-4" data-testid="find-add">
                  {rows.length ? `Not listed? Add ${typed} free` : `We don't have it yet. Add ${typed} free.`}
                </button>
              </li>
            </ul>
          )}
          <p className="mt-4"><Link to="/marketplace" className="font-semibold text-forest underline underline-offset-4">Browse the map</Link></p>
        </div>
        <Link to="/marketplace" aria-label="Open the marketplace map" className="relative block h-[220px] overflow-hidden rounded-2xl border border-line bg-secondary lg:h-[340px]">
          <span aria-hidden className="absolute inset-0 opacity-60 [background-image:linear-gradient(hsl(var(--line))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--line))_1px,transparent_1px)] [background-size:40px_40px]" />
          <span aria-hidden className="absolute left-[8%] top-[18%] h-[62%] w-[80%] rounded-[45%_55%_40%_60%] bg-paper/80" />
          {spots.map((s) => (
            <span key={`${s.x}-${s.y}`} aria-hidden style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-card bg-green text-xs font-bold text-primary-foreground shadow">
              {clusterLabel(s.count)}
            </span>
          ))}
          <span className="absolute bottom-3 left-3 rounded-md bg-card px-2.5 py-1 text-sm font-semibold text-forest shadow-sm">Open the map</span>
        </Link>
      </div>
    </section>
  );
}
