import { Suspense, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Check, Globe, Phone } from "lucide-react";
import { tradeIcon } from "@/components/marketplace/DirectoryCard";
import { Breadcrumb, NearbyStrip } from "@/components/profile/ProfileParts";
import { ClaimPreview, ReferInterest } from "@/components/profile/ClaimPreview";
import GetQuotes from "@/components/marketplace/GetQuotes";
import { isQuoteTrade, quoteDemand } from "@/lib/quotes";
import { lazyWithChunkRecovery as lazy } from "@/lib/chunkRecovery";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/track";
import { previewSignupUrl, storePreview } from "@/lib/instantPreview";
import { realTrade, listingClaimPreview, loadListing, placeLine, requestRemoval, interestCount, type DirectoryListing } from "@/lib/directory";

const DirectoryMap = lazy(() => import("@/components/marketplace/DirectoryMap"));
const noop = () => {};

export const CLAIM_BENEFITS = [
  "Add your logo and photos",
  "Collect reviews from your own customers",
  "Get your own referral program and QR print kit",
  "Show up above unclaimed businesses in your city",
];
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
  const [interest, setInterest] = useState(0);
  const [demand, setDemand] = useState(0);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [desktop, setDesktop] = useState(true);
  useEffect(() => { const mq = window.matchMedia("(min-width: 1024px)"); setDesktop(mq.matches); }, []);
  useEffect(() => {
    if (!listing || listing.lat == null || listing.lng == null || !isQuoteTrade(listing.category)) return;
    let live = true;
    quoteDemand(listing.category, listing.lat, listing.lng).then((n) => { if (live) setDemand(Number(n) || 0); }).catch(() => {});
    return () => { live = false; };
  }, [listing]);
  useEffect(() => { let live = true; interestCount(slug).then((n) => { if (live) setInterest(Number(n) || 0); }).catch(() => {}); return () => { live = false; }; }, [slug]);

  useEffect(() => {
    let live = true;
    loadListing(slug).then((l) => { if (live) setListing(l); }).catch(() => { if (live) setListing(null); });
    return () => { live = false; };
  }, [slug]);
  useEffect(() => { if (listing?.status === "unclaimed") track("listing_viewed"); }, [listing]);

  if (listing === undefined) return <main className="mk-wrap min-h-[50vh] py-16"><SEOHead title="Business profile | Revvin" description="A local business in the Revvin marketplace." noindex /><p className="text-muted-foreground">Loading</p></main>;
  if (listing?.status === "claimed" && listing.claimed_slug) return <Navigate to={`/b/${listing.claimed_slug}`} replace />;
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

  const Icon = tradeIcon(listing.category);
  return (
    <main className="bg-paper">
      <SEOHead title={`${listing.name}${place ? `, ${place}` : ""} | Revvin`} description={`${[listing.name, realTrade(listing.category)].filter(Boolean).join(", ")}${place ? ` in ${place}` : ""} on Revvin.`} path={`/b/${listing.slug}`} noindex />
      <header className="bg-muted">
        <div className="mk-wrap py-8">
          <Breadcrumb />
          <div className="mt-4 flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-card" aria-hidden><Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} /></span>
            <div className="min-w-0">
              <h1 className="break-words font-display text-[clamp(28px,4vw,44px)] leading-[1.05] text-forest">{listing.name}</h1>
              <p className="mt-1 text-lg text-muted-foreground">{[realTrade(listing.category), place].filter(Boolean).join(" · ")}</p>
              <span className="mt-2 inline-block rounded border border-line bg-card px-2 py-0.5 text-xs text-muted-foreground">Unclaimed</span>
            </div>
          </div>
        </div>
      </header>
      <div className="mk-wrap grid gap-8 py-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="min-w-0 space-y-6">
          <p className="rounded-lg border border-line bg-card p-4 text-sm">{UNCLAIMED_NOTE}</p>
          <div className="rounded-2xl border-2 border-green bg-card p-6" data-testid="claim-panel">
            <h2 className="text-2xl font-bold text-forest">Is this your business? Claim it free.</h2>
            <ul className="mt-4 grid gap-2">
              {CLAIM_BENEFITS.map((b) => <li key={b} className="flex gap-2"><Check className="mt-0.5 h-5 w-5 shrink-0 text-green" aria-hidden />{b}</li>)}
            </ul>
            {interest > 0 && <p className="mt-4 rounded-lg bg-sign/30 px-3 py-2 text-sm font-medium text-forest" data-testid="interest-count">{interest === 1 ? "1 person has" : `${interest.toLocaleString("en-US")} people have`} said they would refer customers to this business.</p>}
            {demand > 0 && <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-forest" data-testid="quote-demand">{demand === 1 ? "1 person" : `${demand.toLocaleString("en-US")} people`} near {(listing.city ?? "").split(",")[0] || "here"} asked for {listing.category} quotes on Revvin in the last 30 days. Claimed businesses receive these requests.</p>}
            <Button className="mt-5 h-12" onClick={claim}>Claim this business free</Button>
          </div>
          <ClaimPreview listing={listing} onClaim={claim} />
          <ReferInterest slug={listing.slug} onCount={setInterest} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" className="h-11" onClick={() => setShowRemoval((v) => !v)} aria-expanded={showRemoval}>Request removal</Button>
          </div>
          {showRemoval && <div className="max-w-md rounded-xl border border-line bg-card p-5"><RemovalForm slug={listing.slug} /></div>}
          <p className="text-xs text-muted-foreground">
            {listing.source === "overture"
              ? <>Business information from Overture Maps Foundation, <a className="underline" href="https://overturemaps.org" target="_blank" rel="noopener noreferrer">overturemaps.org</a>{listing.source_license ? ` (${listing.source_license})` : ""}.</>
              : <>Business details from {listing.source}{listing.source_license ? `, ${listing.source_license}` : ""}.</>}
          </p>
        </section>
        <aside className="min-w-0 space-y-4">
          {isQuoteTrade(listing.category) && listing.lat != null && listing.lng != null && (
            <div className="rounded-xl border border-line bg-card p-4" data-testid="unclaimed-quote-box">
              <p className="text-sm">This business has not claimed its profile, so it cannot receive requests here. Get quotes from claimed {listing.category} businesses nearby.</p>
              <Button className="mt-3 h-11 w-full" onClick={() => { setQuoteOpen(true); track("cta_clicked", { cta: "listing_get_quotes" }); }}>Get quotes</Button>
              <GetQuotes open={quoteOpen} onOpenChange={setQuoteOpen} desktop={desktop}
                start={{ trade: listing.category, lat: listing.lat, lng: listing.lng, city: (listing.city ?? "").split(",")[0] || null }} />
            </div>
          )}
          {(listing.phone || listing.website) && (
            <ul className="grid gap-2 rounded-xl border border-line bg-card p-4 text-base">
              {listing.phone && <li><a href={`tel:${listing.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-11 items-center gap-2 text-primary underline underline-offset-4"><Phone className="h-4 w-4" aria-hidden />{listing.phone}</a></li>}
              {listing.website && <li><a href={listing.website} target="_blank" rel="noopener nofollow ugc" className="inline-flex min-h-11 items-center gap-2 break-all text-primary underline underline-offset-4"><Globe className="h-4 w-4 shrink-0" aria-hidden />{site}</a></li>}
            </ul>
          )}
          {listing.lat != null && listing.lng != null && (
            <Suspense fallback={<div className="h-64 rounded-xl border border-line bg-card" />}>
              <DirectoryMap clusters={[]} pins={[]} selected={null} onMove={noop} onSelect={noop} onFail={noop} point={{ lat: listing.lat, lng: listing.lng }} className="h-64 overflow-hidden rounded-xl border border-line" />
            </Suspense>
          )}
        </aside>
      </div>
      {listing.lat != null && listing.lng != null && <NearbyStrip lat={listing.lat} lng={listing.lng} category={listing.category} exclude={listing.slug} />}
    </main>
  );
}
