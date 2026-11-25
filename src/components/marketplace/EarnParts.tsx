import { forwardRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { cardRewardAmount, earnSearch, entryHref, rewardAlert, tradePlace, type EarnRow, type DirectoryEntry } from "@/lib/directory";
import { distanceMilesLabel } from "@/lib/distanceUnits";
import { track } from "@/lib/track";

export const EARN_SUBLINE = "Rewards are set and paid by each business when your referral becomes a customer.";
export const EARN_STEPS = ["Pick a business.", "Send them someone who needs the work.", "Get paid by the business when the job closes."];
export const INVITE_LINK = "https://revvin.co/?ref=marketplace-invite";
const DISMISS_KEY = "revvin:earn_explainer_dismissed";

/** Miles for the US, km elsewhere. Uses the business country, else the visitor's browser region. */
const browserRegion = () => { try { return (navigator.language.split("-")[1] ?? "").toUpperCase(); } catch { return ""; } };
export const distanceLabel = (km: number, country: string | null, region = browserRegion()) =>
  (country ?? region) === "US" ? distanceMilesLabel(km) : `${km < 10 ? Math.max(0.1, km).toFixed(1) : Math.round(km).toLocaleString("en-US")} km away`;

/** Find a business | Earn rewards. */
export function ModeSwitch({ earn, onChange, className = "" }: { earn: boolean; onChange: (earn: boolean) => void; className?: string }) {
  const opt = (on: boolean, label: string, value: boolean) => (
    <button type="button" role="radio" aria-checked={on} onClick={() => onChange(value)}
      className={`h-8 flex-1 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${on ? "bg-forest text-primary-foreground" : "text-forest hover:bg-secondary"}`}>
      {label}
    </button>
  );
  return (
    <div role="radiogroup" aria-label="Marketplace mode" className={`flex shrink-0 items-center gap-1 rounded-full border border-line bg-card p-1 ${className}`}>
      {opt(!earn, "Find a business", false)}
      {opt(earn, "Earn rewards", true)}
    </div>
  );
}

export function EarnExplainer() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => { try { setHidden(localStorage.getItem(DISMISS_KEY) === "1"); } catch { setHidden(false); } }, []);
  if (hidden) return null;
  return (
    <div className="relative mb-3 rounded-xl bg-secondary p-3 pr-10" data-testid="earn-explainer">
      <ol className="grid gap-1 text-sm text-forest sm:grid-cols-3 sm:gap-3">
        {EARN_STEPS.map((s, i) => <li key={s}><span className="font-bold">{i + 1}.</span> {s}</li>)}
      </ol>
      <button type="button" aria-label="Dismiss" onClick={() => { setHidden(true); try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* storage blocked */ } }}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-forest hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/** Earn mode card: the reward first, then who pays it. */
export const EarnCard = forwardRef<HTMLDivElement, { entry: DirectoryEntry; selected?: boolean; onHover?: (slug: string | null) => void }>(
  ({ entry, selected, onHover }, ref) => {
    const reward = cardRewardAmount(entry);
    return (
      <div ref={ref} data-slug={entry.slug} onMouseEnter={() => onHover?.(entry.slug)} onMouseLeave={() => onHover?.(null)}
        className={`flex h-full flex-col rounded-xl border-2 border-sign bg-card p-4 ${selected ? "ring-2 ring-forest" : ""}`}>
        <p className="font-display text-3xl leading-none text-forest">{reward}</p>
        <p className="mt-1 text-xs text-muted-foreground">per referral that becomes a customer, paid by the business</p>
        <p className="mt-3 line-clamp-2 break-words font-semibold">{entry.name}</p>
        <p className="truncate text-sm text-muted-foreground">{tradePlace(entry)}</p>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-3">
          <Button asChild className="h-11"><a href={`/r/${entry.slug}`} onClick={() => track("cta_clicked", { cta: "earn_refer" })}>Refer someone</a></Button>
          <Link to={entryHref(entry)} className="text-sm font-medium text-primary underline underline-offset-4" onFocus={() => onHover?.(entry.slug)}>View profile</Link>
        </div>
      </div>
    );
  });
EarnCard.displayName = "EarnCard";

/** Shown when no business in view pays a reward. Every number here is real. */
export function EarnEmpty({ center, trade }: { center: { lat: number; lng: number } | null; trade: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error" | "limited">("idle");
  const [done, setDone] = useState<string | null>(null);
  const [nearest, setNearest] = useState<EarnRow[]>([]);
  const [copied, setCopied] = useState(false);
  const lat = center ? Math.round(center.lat * 100) / 100 : null, lng = center ? Math.round(center.lng * 100) / 100 : null;
  useEffect(() => {
    if (lat === null || lng === null) return;
    let live = true;
    earnSearch({ bounds: null, center: { lat, lng }, order: "distance", limit: 5 })
      .then(({ rows }) => { if (live) setNearest(rows.filter((r) => r.distance_km !== null)); }).catch(() => { if (live) setNearest([]); });
    return () => { live = false; };
  }, [lat, lng]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lat === null || lng === null) return;
    setState("sending");
    try {
      const r = await rewardAlert(email, lat, lng, trade || null);
      track("earn_alert_signup");
      setDone(r?.city || "this area");
    } catch (err) {
      setState(String((err as Error).message).includes("rate_limited") ? "limited" : "error");
    }
  };
  return (
    <div className="space-y-4" data-testid="earn-empty">
      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-lg font-bold text-forest">No businesses here are paying referral rewards yet.</h2>
        <p className="mt-1 text-sm text-muted-foreground">Revvin is new in this area. Be first to know when local businesses start offering rewards.</p>
        {done ? (
          <p role="status" className="mt-4 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-forest">You're on the list for {done}.</p>
        ) : (
          <form className="mt-4 grid gap-2" onSubmit={submit}>
            <label htmlFor="earn-email" className="sr-only">Email</label>
            <div className="flex gap-2">
              <Input id="earn-email" type="email" required maxLength={254} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
              <Button type="submit" className="h-11 shrink-0" disabled={state === "sending" || lat === null}>{state === "sending" ? "Saving" : "Notify me"}</Button>
            </div>
            <p className="text-xs text-muted-foreground">We will only email you about referral rewards near this spot. See our <Link to="/privacy" className="underline">Privacy policy</Link>.</p>
            {state === "error" && <p role="alert" className="text-sm text-destructive">That did not go through. Check the email and try again.</p>}
            {state === "limited" && <p role="alert" className="text-sm text-destructive">Too many signups from here today. Try again tomorrow.</p>}
          </form>
        )}
      </div>
      {nearest.length > 0 && (
        <div className="rounded-xl border border-line bg-card p-5" data-testid="earn-nearest">
          <h2 className="font-bold text-forest">Nearest businesses paying rewards</h2>
          <ul className="mt-3 divide-y divide-line">
            {nearest.map((r) => (
              <li key={r.slug} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-forest">{cardRewardAmount(r)} <span className="font-normal text-foreground">at</span> <Link to={entryHref(r)} className="underline underline-offset-4">{r.name}</Link></p>
                  <p className="truncate text-sm text-muted-foreground">{[tradePlace(r), distanceLabel(r.distance_km!, r.country)].filter(Boolean).join(" · ")}</p>
                </div>
                <Button asChild variant="outline" className="h-10 shrink-0"><a href={`/r/${r.slug}`}>Refer someone</a></Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-xl bg-forest p-5 text-primary-foreground">
        <h2 className="font-bold">Know a business owner? They can list a reward free.</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="sign" className="h-11"><Link to="/signup" onClick={() => track("cta_clicked", { cta: "earn_empty_list_free" })}>List your business free</Link></Button>
          <Button type="button" variant="outline" className="h-11 border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={async () => { try { await navigator.clipboard.writeText(INVITE_LINK); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt("Copy this link", INVITE_LINK); } }}>
            {copied ? "Link copied" : "Copy invite link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
