import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DirectoryCard from "@/components/marketplace/DirectoryCard";
import Stars from "@/components/profile/Stars";
import type { DirectoryEntry } from "@/lib/directory";
import { loadNearby, REVIEW_LABEL, REVIEW_LABEL_TIP, type ProfileReviewStats, type PublicReview } from "@/lib/profile";
import { loadSupabase } from "@/lib/supabaseLazy";

/** Back to the marketplace, at the map view the visitor last had there. */
export function Breadcrumb() {
  const [qs, setQs] = useState("");
  useEffect(() => { try { setQs(sessionStorage.getItem("revvin:marketplace_view") ?? ""); } catch { /* storage blocked */ } }, []);
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <Link to={`/marketplace${qs}`} className="inline-flex min-h-11 items-center gap-1 text-primary underline underline-offset-4"><ChevronLeft className="h-4 w-4" aria-hidden />Marketplace</Link>
    </nav>
  );
}

export function NearbyStrip({ lat, lng, category, exclude }: { lat: number; lng: number; category: string; exclude: string }) {
  const [rows, setRows] = useState<DirectoryEntry[]>([]);
  useEffect(() => {
    let live = true;
    loadNearby(lat, lng, category, exclude).then((r) => { if (live) setRows(r ?? []); }).catch(() => {});
    return () => { live = false; };
  }, [lat, lng, category, exclude]);
  if (rows.length === 0) return null;
  return (
    <section className="mk-wrap pb-12" aria-labelledby="nearby-h">
      <h2 id="nearby-h" className="text-xl font-bold text-forest">Similar businesses nearby</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((e) => <li key={`${e.kind}:${e.slug}`}><DirectoryCard entry={e} compact /></li>)}
      </ul>
    </section>
  );
}

export function InvitedLabel() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{REVIEW_LABEL}</button>
        </TooltipTrigger>
        <TooltipContent>{REVIEW_LABEL_TIP}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ReviewItem({ r, businessName }: { r: PublicReview; businessName: string }) {
  return (
    <li className="rounded-xl border border-line bg-card p-4" data-testid="review">
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={r.rating} />
        <span className="font-semibold">{r.reviewer_display_name}</span>
        <InvitedLabel />
        <span className="text-xs text-muted-foreground">{new Date(r.submitted_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>
      {r.owner_reply && (
        <div className="mt-3 rounded-lg bg-secondary p-3 text-sm">
          <p className="text-xs font-semibold text-forest">Reply from {businessName}</p>
          <p className="mt-1 whitespace-pre-wrap">{r.owner_reply}</p>
        </div>
      )}
    </li>
  );
}

export function RatingBreakdown({ stats }: { stats: ProfileReviewStats }) {
  const max = Math.max(1, stats.count);
  return (
    <div className="grid gap-1.5" aria-label="Rating breakdown">
      {([5, 4, 3, 2, 1] as const).map((n) => {
        const c = Number(stats[`r${n}`] ?? 0);
        return (
          <div key={n} className="flex items-center gap-2 text-sm">
            <span className="w-10 shrink-0">{n} star</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-sign" style={{ width: `${(c / max) * 100}%` }} /></span>
            <span className="w-8 shrink-0 text-right text-muted-foreground">{c}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Lightbox({ photos, index, onClose, onIndex }: { photos: { url: string; caption: string | null }[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % photos.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + photos.length) % photos.length);
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [index, photos.length, onClose, onIndex]);
  const p = photos[index];
  if (!p) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Photo" className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-foreground/90 p-4" onClick={onClose}>
      <button type="button" aria-label="Close" className="absolute right-4 top-4 rounded-full bg-card p-2" onClick={onClose}><X className="h-5 w-5" /></button>
      <img src={p.url} alt={p.caption ?? ""} className="max-h-[80vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
      {p.caption && <p className="mt-3 text-center text-sm text-background">{p.caption}</p>}
      <p className="mt-1 text-xs text-background/80">{index + 1} of {photos.length}</p>
    </div>
  );
}

export function QuoteForm({ slug, businessName }: { slug: string; businessName: string }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", message: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "limited">("idle");
  if (state === "sent") return <p role="status" className="text-sm">Thanks. {businessName} has your request and will reply by email.</p>;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form id="quote" className="grid gap-3" onSubmit={async (e) => {
      e.preventDefault();
      setState("sending");
      try {
        const db = await loadSupabase();
        const { data, error } = await db.functions.invoke("submit-quote-request", { body: { slug, ...f } });
        if (error) {
          const status = (error as { context?: Response }).context?.status;
          setState(status === 429 ? "limited" : "error");
          return;
        }
        setState(data?.ok ? "sent" : "error");
      } catch { setState("error"); }
    }}>
      <div className="grid gap-1.5"><Label htmlFor="q-name">Name</Label><Input id="q-name" required maxLength={120} value={f.name} onChange={set("name")} className="h-11" /></div>
      <div className="grid gap-1.5"><Label htmlFor="q-email">Email</Label><Input id="q-email" type="email" required maxLength={254} value={f.email} onChange={set("email")} className="h-11" /></div>
      <div className="grid gap-1.5"><Label htmlFor="q-phone">Phone (optional)</Label><Input id="q-phone" type="tel" maxLength={40} value={f.phone} onChange={set("phone")} className="h-11" /></div>
      <div className="grid gap-1.5"><Label htmlFor="q-msg">What do you need?</Label><Textarea id="q-msg" maxLength={1500} value={f.message} onChange={set("message")} /></div>
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></label>
      </div>
      {state === "error" && <p role="alert" className="text-sm text-destructive">That did not go through. Check your details and try again.</p>}
      {state === "limited" && <p role="alert" className="text-sm text-destructive">Too many requests right now. Try again later.</p>}
      <Button type="submit" className="h-11" disabled={state === "sending"}>{state === "sending" ? "Sending" : "Request a quote"}</Button>
      <p className="text-xs text-muted-foreground">Your details go to {businessName} only.</p>
    </form>
  );
}
