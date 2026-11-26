import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, BadgeCheck, Camera, Check, Star, Users, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tradeIcon } from "@/components/marketplace/DirectoryCard";
import { directoryRegulated, initials, placeLine, realTrade, referralInterest, type DirectoryListing } from "@/lib/directory";
import { track } from "@/lib/track";

export const COMPARISON: [string, string][] = [
  ["Name and city only", "Logo, photos, hours and service area"],
  ["No way to contact", "Quote requests sent to your inbox"],
  ["No reviews", "Invited customer reviews"],
  ["Not in \"Pays referral rewards\" results", "Shown to people looking to earn rewards"],
  ["Ranked below claimed businesses", "Ranked above unclaimed businesses"],
];
const TILES: [LucideIcon | null, string, string][] = [
  [null, "Recent job", "from-green/40 to-secondary"],
  [Users, "Your crew", "from-sign/50 to-secondary"],
  [ArrowLeftRight, "Before and after", "from-forest/30 to-green/20"],
];

/** A clearly labelled example of this listing as a finished, claimed profile. Built only from its real name, trade and city. */
export function ClaimPreview({ listing, onClaim }: { listing: DirectoryListing; onClaim: () => void }) {
  const Icon = tradeIcon(listing.category);
  const trade = realTrade(listing.category);
  const place = placeLine(listing);
  return (
    <section className="rounded-2xl border border-line bg-card p-4 sm:p-6" aria-labelledby="preview-h" data-testid="claim-preview">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="preview-h" className="text-xl font-bold text-forest">What {listing.name} could look like on Revvin</h2>
        <span className="rounded-full bg-sign px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-forest">Example</span>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-paper" aria-hidden>
        <div className="relative flex h-24 items-center justify-end bg-green px-5 sm:h-28">
          <Icon className="h-14 w-14 text-primary-foreground/40" strokeWidth={1.25} />
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-end gap-3">
            <span className="relative z-10 -mt-8 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-paper bg-forest text-xl font-bold text-primary-foreground">{initials(listing.name)}</span>
            <div className="min-w-0 pb-1">
              <p className="break-words font-bold leading-tight text-forest">{listing.name}</p>
              <p className="text-sm text-muted-foreground">{[trade, place].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-green/40 bg-secondary px-2 py-0.5 text-xs font-medium text-forest"><BadgeCheck className="h-3.5 w-3.5" />Claimed by owner</span>
          <ul className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            {TILES.map(([I, cap, grad]) => {
              const T = I ?? Icon;
              return (
                <li key={cap} className="w-40 shrink-0 snap-start sm:w-auto">
                  <div className={`flex aspect-[4/3] items-center justify-center rounded-lg bg-gradient-to-br ${grad}`}>
                    <span className="relative"><T className="h-9 w-9 text-forest/70" strokeWidth={1.5} />{cap === "Recent job" && <Camera className="absolute -bottom-1 -right-3 h-4 w-4 text-forest/60" />}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{cap}</p>
                </li>
              );
            })}
          </ul>
          {!directoryRegulated(listing.category) && (
            <p className="mt-3 inline-block rounded-full bg-sign/30 px-3 py-1 text-sm font-semibold text-forest">Example: $100 for every referral that becomes a customer</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-4 w-4 text-sign" />)}</span>
            Your invited customer reviews show here
          </div>
          <Button className="mt-3 h-10" disabled tabIndex={-1}>Request a quote</Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2" data-testid="claim-comparison">
        <div className="rounded-xl border border-line p-4">
          <h3 className="font-bold text-muted-foreground">Unclaimed today</h3>
          <ul className="mt-2 grid gap-2 text-sm text-muted-foreground">
            {COMPARISON.map(([a]) => <li key={a} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{a}</li>)}
          </ul>
        </div>
        <div className="rounded-xl border-2 border-green p-4">
          <h3 className="font-bold text-forest">Claimed, free</h3>
          <ul className="mt-2 grid gap-2 text-sm">
            {COMPARISON.map(([, b]) => <li key={b} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />{b}</li>)}
          </ul>
        </div>
      </div>
      <Button className="mt-5 h-12 w-full sm:w-auto" onClick={onClaim}>Claim this profile free</Button>
      <p className="mt-2 text-sm text-muted-foreground">Takes about 2 minutes. No card.</p>
      <p className="mt-1 text-sm text-muted-foreground">We confirm ownership before a profile shows as owner-claimed or receives quote requests.</p>
    </section>
  );
}

/** "I'd refer customers here" demand signal. Never contacts the business. */
export function ReferInterest({ slug, onCount }: { slug: string; onCount: (n: number) => void }) {
  const [state, setState] = useState<"idle" | "sending" | "clicked" | "done" | "limited" | "error">("idle");
  const [email, setEmail] = useState("");
  const send = async (withEmail?: string) => {
    setState("sending");
    try {
      const n = await referralInterest(slug, withEmail);
      onCount(n);
      track(withEmail ? "listing_interest_email" : "listing_interest_clicked");
      setState(withEmail ? "done" : "clicked");
    } catch (e) {
      setState(String((e as Error).message).includes("rate_limited") ? "limited" : "error");
    }
  };
  return (
    <div className="rounded-xl border border-line bg-card p-4" data-testid="refer-interest">
      <p className="font-semibold text-forest">Know this business? Tell them you'd send customers their way.</p>
      {state === "idle" || (state === "sending" && !email) ? (
        <Button variant="outline" className="mt-3 h-11" disabled={state === "sending"} onClick={() => send()}>I'd refer customers here</Button>
      ) : state === "done" ? (
        <p role="status" className="mt-2 text-sm">Thanks. We will email you if they start paying referral rewards.</p>
      ) : state === "limited" ? (
        <p role="alert" className="mt-2 text-sm text-destructive">You have sent a lot of these today. Try again tomorrow.</p>
      ) : (
        <form className="mt-3 grid gap-2" onSubmit={(e) => { e.preventDefault(); if (email.trim()) send(email); }}>
          <p role="status" className="text-sm">Thanks, noted.</p>
          <label htmlFor="ri-email" className="text-sm font-medium">Email me if they start paying referral rewards (optional)</label>
          <div className="flex gap-2">
            <Input id="ri-email" type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            <Button type="submit" variant="outline" className="h-11" disabled={state === "sending" || !email.trim()}>Save</Button>
          </div>
          <p className="text-xs text-muted-foreground">We only use your email to tell you about this business. See our <Link to="/privacy" className="underline">Privacy policy</Link>.</p>
          {state === "error" && <p role="alert" className="text-sm text-destructive">That did not go through. Check the email and try again.</p>}
        </form>
      )}
    </div>
  );
}
