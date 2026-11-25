import { Suspense, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Globe, Phone } from "lucide-react";
import { lazyWithChunkRecovery as lazy } from "@/lib/chunkRecovery";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/track";
import { previewSignupUrl, storePreview } from "@/lib/instantPreview";
import { listingClaimPreview, loadListing, placeLine, requestRemoval, type DirectoryListing } from "@/lib/directory";

const DirectoryMap = lazy(() => import("@/components/marketplace/DirectoryMap"));
const noop = () => {};

export const UNCLAIMED_NOTE = "This business has not claimed its profile yet.";

function RemovalForm({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "limited">("idle");
  if (state === "sent") return <p role="status" className="text-sm">Thanks. We received your request and will review it.</p>;
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        try {
          await requestRemoval(slug, name, email, reason);
          track("listing_removal_requested");
          setState("sent");
        } catch (err) {
          setState(String((err as Error).message).includes("rate_limited") ? "limited" : "error");
        }
      }}
    >
      <div className="grid gap-1.5"><Label htmlFor="rm-name">Your name</Label><Input id="rm-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="h-11" /></div>
      <div className="grid gap-1.5"><Label htmlFor="rm-email">Your email</Label><Input id="rm-email" type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" /></div>
      <div className="grid gap-1.5"><Label htmlFor="rm-reason">Reason (optional)</Label><Textarea id="rm-reason" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      {state === "error" && <p role="alert" className="text-sm text-destructive">That did not go through. Check your details and try again.</p>}
      {state === "limited" && <p role="alert" className="text-sm text-destructive">Too many requests from here. Try again in an hour.</p>}
      <Button type="submit" variant="outline" className="h-11" disabled={state === "sending"}>{state === "sending" ? "Sending" : "Send removal request"}</Button>
    </form>
  );
}

export default function DirectoryListingPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<DirectoryListing | null | undefined>(undefined);
  const [showRemoval, setShowRemoval] = useState(false);

  useEffect(() => {
    let live = true;
    loadListing(slug).then((l) => { if (live) setListing(l); }).catch(() => { if (live) setListing(null); });
    return () => { live = false; };
  }, [slug]);
  useEffect(() => { if (listing?.status === "unclaimed") track("listing_viewed"); }, [listing]);

  if (listing === undefined) return <main className="mk-wrap min-h-[50vh] py-16"><SEOHead title="Business profile | Revvin" description="A local business in the Revvin marketplace." noindex /><p className="text-muted-foreground">Loading</p></main>;
  if (listing?.status === "claimed" && listing.claimed_slug) return <Navigate to={`/r/${listing.claimed_slug}`} replace />;
  if (!listing || listing.status !== "unclaimed") {
    return (
      <main className="mk-wrap py-16">
        <SEOHead title="Profile not found | Revvin" description="This marketplace profile is not available." noindex />
        <h1 className="font-display text-3xl text-forest">This profile is not available</h1>
        <p className="mt-3"><Link to="/marketplace" className="text-primary underline underline-offset-4">Browse the marketplace</Link></p>
      </main>
    );
  }

  const place = placeLine(listing);
  const claim = () => {
    track("listing_claim_clicked");
    const data = listingClaimPreview(listing);
    storePreview(data);
    navigate(previewSignupUrl(data));
  };
  const site = listing.website?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <main className="bg-paper">
      <SEOHead title={`${listing.name}${place ? `, ${place}` : ""} | Revvin`} description={`${listing.name} is a ${listing.category.toLowerCase()} business${place ? ` in ${place}` : ""}.`} path={`/b/${listing.slug}`} noindex />
      <div className="mk-wrap grid gap-8 py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="min-w-0">
          <p className="text-sm"><Link to="/marketplace" className="text-primary underline underline-offset-4">Marketplace</Link></p>
          <h1 className="mt-3 break-words font-display text-[clamp(30px,4.4vw,48px)] leading-[1.05] text-forest">{listing.name}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{[listing.category, place].filter(Boolean).join(" · ")}</p>
          <p className="mt-5 rounded-lg border border-line bg-card p-4 text-sm">{UNCLAIMED_NOTE}</p>
          <ul className="mt-5 grid gap-2 text-base">
            {listing.phone && <li><a href={`tel:${listing.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-11 items-center gap-2 text-primary underline underline-offset-4"><Phone className="h-4 w-4" aria-hidden />{listing.phone}</a></li>}
            {listing.website && <li><a href={listing.website} target="_blank" rel="noopener nofollow ugc" className="inline-flex min-h-11 items-center gap-2 break-all text-primary underline underline-offset-4"><Globe className="h-4 w-4 shrink-0" aria-hidden />{site}</a></li>}
          </ul>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="h-12" onClick={claim}>Is this your business? Claim it free</Button>
            <Button variant="outline" className="h-12" onClick={() => setShowRemoval((v) => !v)} aria-expanded={showRemoval}>Request removal</Button>
          </div>
          {showRemoval && <div className="mt-5 max-w-md rounded-xl border border-line bg-card p-5"><RemovalForm slug={listing.slug} /></div>}
          <p className="mt-8 text-xs text-muted-foreground">
            Business details from {listing.source}{listing.source_license ? `, ${listing.source_license}` : ""}.
          </p>
        </section>
        {listing.lat != null && listing.lng != null && (
          <div className="min-w-0">
            <Suspense fallback={<div className="h-72 rounded-xl border border-line bg-card" />}>
              <DirectoryMap clusters={[]} pins={[]} selected={null} onMove={noop} onSelect={noop} onFail={noop} point={{ lat: listing.lat, lng: listing.lng }} className="h-72 overflow-hidden rounded-xl border border-line" />
            </Suspense>
          </div>
        )}
      </div>
    </main>
  );
}
