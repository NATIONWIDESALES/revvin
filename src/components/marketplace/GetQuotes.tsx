import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Globe, Phone, Star } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cityLocation, placeLine } from "@/lib/directory";
import { QUOTE_TRADES, TIMINGS, isQuoteTrade, nearestCity, quoteMatches, submitQuotes, unclaimedNearby, type QuoteMatch, type Timing, type UnclaimedNearby } from "@/lib/quotes";
import { distanceLabel } from "@/components/marketplace/EarnParts";
import { track } from "@/lib/track";

export interface QuoteStart { trade?: string; lat: number; lng: number; city?: string | null }

function Body({ start, onDone }: { start: QuoteStart; onDone: () => void }) {
  const [trade, setTrade] = useState(isQuoteTrade(start.trade) ? start.trade! : "");
  const [loc, setLoc] = useState({ lat: start.lat, lng: start.lng });
  const [city, setCity] = useState(start.city ?? "");
  const [cityOk, setCityOk] = useState(true);
  const [f, setF] = useState({ details: "", name: "", email: "", phone: "", website: "" });
  const [timing, setTiming] = useState<Timing>("asap");
  const [matches, setMatches] = useState<QuoteMatch[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [nearby, setNearby] = useState<UnclaimedNearby[]>([]);
  const [later, setLater] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "error" | "limited">("idle");
  const [result, setResult] = useState<{ sent: { slug: string; name: string }[]; saved: boolean } | null>(null);

  useEffect(() => {
    if (start.city) return;
    nearestCity(start.lat, start.lng).then((c) => { if (c) setCity((x) => x || c); }).catch(() => {});
  }, [start]);
  useEffect(() => {
    if (!trade) { setMatches(null); return; }
    let live = true;
    setMatches(null);
    quoteMatches(trade, loc.lat, loc.lng).then((m) => {
      if (!live) return;
      setMatches(m ?? []); setPicked(new Set((m ?? []).map((x) => x.slug)));
      if (!m?.length) unclaimedNearby(trade, loc.lat, loc.lng).then((u) => { if (live) setNearby(u ?? []); }).catch(() => setNearby([]));
      else setNearby([]);
    }).catch(() => { if (live) setMatches([]); });
    return () => { live = false; };
  }, [trade, loc]);

  const relocate = async () => {
    const q = city.trim();
    if (q.length < 2) { setCityOk(false); return; }
    const r = await cityLocation(q).catch(() => null);
    if (r) { setLoc(r); setCityOk(true); } else setCityOk(q === (start.city ?? "") || false);
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const place = city.trim() || "you";
  const sendCount = matches ? matches.filter((m) => picked.has(m.slug)).length : 0;
  const canSend = Boolean(trade) && cityOk && matches !== null && (sendCount > 0 || later);

  if (result) return (
    <div role="status" className="grid gap-3" data-testid="quote-done">
      {result.sent.length > 0 ? (
        <>
          <p className="font-semibold text-forest">Your request was sent to:</p>
          <ul className="grid gap-1">{result.sent.map((s) => <li key={s.slug}><Link to={`/b/${s.slug}`} className="underline underline-offset-4">{s.name}</Link></li>)}</ul>
          <p className="text-sm text-muted-foreground">They will reply to you directly. We emailed you a copy of this list.</p>
        </>
      ) : <p>Saved. We will share your request with the first {trade} businesses near {place} that join Revvin in the next 14 days, and email you when one receives it.</p>}
      <Button className="h-11" onClick={onDone}>Done</Button>
    </div>
  );

  return (
    <form className="grid gap-4" data-testid="quote-form" onSubmit={async (e) => {
      e.preventDefault();
      if (!canSend) return;
      setState("sending");
      const r = await submitQuotes({ ...f, trade, city: city.trim(), lat: loc.lat, lng: loc.lng, timing, slugs: [...picked].filter((s) => matches?.some((m) => m.slug === s)), share_later: sendCount === 0 && later });
      if ("error" in r) { setState(r.error === "rate_limited" ? "limited" : "error"); return; }
      track(r.sent.length ? "quote_broadcast_sent" : "quote_broadcast_saved");
      setResult(r);
    }}>
      <div className="grid gap-1.5">
        <Label htmlFor="gq-trade">Trade</Label>
        <Select value={trade} onValueChange={setTrade}>
          <SelectTrigger id="gq-trade" className="h-11"><SelectValue placeholder="Choose a trade" /></SelectTrigger>
          <SelectContent>{QUOTE_TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="gq-details">What do you need?</Label>
        <Textarea id="gq-details" required minLength={20} maxLength={1000} value={f.details} onChange={set("details")} placeholder="Describe the job in a sentence or two" />
        <p className="text-xs text-muted-foreground">{f.details.trim().length < 20 ? `At least 20 characters (${f.details.trim().length} so far)` : `${f.details.trim().length} of 1000`}</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="gq-city">City or postal/ZIP code</Label>
        <Input id="gq-city" required maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} onBlur={relocate} className="h-11" />
        {!cityOk && <p role="alert" className="text-sm text-destructive">We could not find that place. Try a nearby city name.</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5"><Label htmlFor="gq-name">Name</Label><Input id="gq-name" required maxLength={120} value={f.name} onChange={set("name")} className="h-11" /></div>
        <div className="grid gap-1.5"><Label htmlFor="gq-email">Email</Label><Input id="gq-email" type="email" required maxLength={254} value={f.email} onChange={set("email")} className="h-11" /></div>
        <div className="grid gap-1.5"><Label htmlFor="gq-phone">Phone (optional)</Label><Input id="gq-phone" type="tel" maxLength={40} value={f.phone} onChange={set("phone")} className="h-11" /></div>
        <div className="grid gap-1.5">
          <Label htmlFor="gq-timing">Timing</Label>
          <Select value={timing} onValueChange={(v) => setTiming(v as Timing)}>
            <SelectTrigger id="gq-timing" className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{TIMINGS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></label></div>

      {trade && matches === null && <p className="text-sm text-muted-foreground">Finding businesses near {place}</p>}
      {trade && matches && matches.length > 0 && (
        <div className="rounded-xl border border-line bg-secondary/50 p-3" data-testid="quote-recipients">
          <p className="font-semibold text-forest">Your request will be sent to:</p>
          <ul className="mt-2 grid gap-2">
            {matches.map((m) => (
              <li key={m.slug}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-card p-3">
                  <Checkbox checked={picked.has(m.slug)} className="mt-0.5" onCheckedChange={(v) => setPicked((s) => { const n = new Set(s); if (v) n.add(m.slug); else n.delete(m.slug); return n; })} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{m.name}</span>
                    {placeLine(m) && <span className="block text-sm text-muted-foreground">{placeLine(m)}</span>}
                    <span className="mt-1 flex flex-wrap gap-1.5 text-xs text-forest">
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5"><BadgeCheck className="h-3.5 w-3.5" aria-hidden />Claimed by owner</span>
                      {m.review_count > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5"><Star className="h-3.5 w-3.5 fill-sign text-sign" aria-hidden />{m.review_count} review{m.review_count === 1 ? "" : "s"}{m.rating_avg !== null ? `, ${Number(m.rating_avg).toFixed(1)} stars` : ""}</span>}
                      {m.is_pro && <span className="rounded-full bg-secondary px-2 py-0.5">Pro</span>}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Your name, contact details and request are shared only with the businesses listed above. See our <Link to="/privacy" className="underline">Privacy policy</Link>.</p>
        </div>
      )}
      {trade && matches && matches.length === 0 && (
        <div className="grid gap-3 rounded-xl border border-line p-3" data-testid="quote-no-match">
          <p className="font-semibold text-forest">No claimed {trade} businesses near {place} yet.</p>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox checked={later} onCheckedChange={(v) => setLater(v === true)} className="mt-0.5" />
            <span>Save my request and share it with the first {trade} businesses near {place} that join Revvin in the next 14 days.</span>
          </label>
          {later && <p className="text-xs text-muted-foreground">Your name, contact details and request will be shared only with those businesses, and we will email you when one receives it. See our <Link to="/privacy" className="underline">Privacy policy</Link>.</p>}
          {nearby.length > 0 && (
            <div>
              <p className="text-sm font-semibold">Local {trade} businesses you can contact directly</p>
              <ul className="mt-2 grid gap-2">
                {nearby.map((u) => (
                  <li key={u.slug} className="rounded-lg bg-card p-3 text-sm">
                    <Link to={`/b/${u.slug}`} className="font-semibold underline underline-offset-4">{u.name}</Link>
                    <span className="block text-muted-foreground">{[placeLine(u), distanceLabel(u.km, /^US-/i.test(u.region ?? "") ? "US" : /^CA-/i.test(u.region ?? "") ? "CA" : null)].filter(Boolean).join(" · ")}</span>
                    <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {u.phone && <a href={`tel:${u.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-9 items-center gap-1 text-primary underline"><Phone className="h-3.5 w-3.5" aria-hidden />{u.phone}</a>}
                      {u.website && /^https?:\/\//i.test(u.website) && <a href={u.website} target="_blank" rel="noopener nofollow ugc" className="inline-flex min-h-9 items-center gap-1 break-all text-primary underline"><Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />{u.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {state === "error" && <p role="alert" className="text-sm text-destructive">That did not go through. Check your details and try again.</p>}
      {state === "limited" && <p role="alert" className="text-sm text-destructive">You have sent the most requests allowed for today. Try again tomorrow.</p>}
      <Button type="submit" className="h-12" disabled={!canSend || state === "sending" || f.details.trim().length < 20}>
        {state === "sending" ? "Sending" : sendCount > 0 ? `Send to ${sendCount} ${sendCount === 1 ? "business" : "businesses"}` : later ? "Save my request" : "Nothing to send yet"}
      </Button>
    </form>
  );
}

/** Modal on desktop, full-screen sheet on phones. */
export default function GetQuotes({ open, onOpenChange, start, desktop }: { open: boolean; onOpenChange: (o: boolean) => void; start: QuoteStart | null; desktop: boolean }) {
  const title = "Get quotes from local businesses";
  const desc = "One request, up to 3 claimed businesses near you.";
  const body = start && <Body key={`${start.trade}:${start.lat}:${start.lng}`} start={start} onDone={() => onOpenChange(false)} />;
  if (desktop) return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{desc}</DialogDescription></DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[100dvh] overflow-y-auto rounded-none">
        <SheetHeader className="text-left"><SheetTitle>{title}</SheetTitle><SheetDescription>{desc}</SheetDescription></SheetHeader>
        <div className="mt-4 pb-8">{body}</div>
      </SheetContent>
    </Sheet>
  );
}
