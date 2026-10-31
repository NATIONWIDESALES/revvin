import { useEffect, useRef, useState } from "react";
import AuthSplit from "@/components/AuthSplit";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type BusinessUpdate = Database["public"]["Tables"]["businesses"]["Update"];
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SEOHead from "@/components/SEOHead";
import ServiceAreaAutocomplete, { type PlaceSelection } from "@/components/ServiceAreaAutocomplete";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { track } from "@/lib/track";
import { BUSINESS_CATEGORIES, isRestrictedCategory } from "@/lib/offerUtils";
import { resolveAvailableSlug, suggestSlug, slugRejectionMessage, type SlugRejection } from "@/lib/slugRules";
import { friendlyError } from "@/lib/errors";
import { publishPage } from "@/lib/publishPage";
import { copyText } from "@/lib/clipboard";
import { CHECKOUT_FALLBACK_TOAST, parsePlan, peekCheckoutIntent, startHeldCheckout } from "@/lib/proCheckoutIntent";
import { readPreview, previewCategory } from "@/lib/instantPreview";

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    track("onboarding_started");
  }, []);

  // Buyer who confirmed their email with Pro intent: pay first, build after.
  const heldPlanRef = useRef(
    params.get("checkout") === "success" ? null : parsePlan(params.get("plan")) ?? peekCheckoutIntent(),
  );
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(!!heldPlanRef.current);
  useEffect(() => {
    const plan = heldPlanRef.current;
    if (!user || !plan) return;
    heldPlanRef.current = null;
    (async () => {
      const redirected = await startHeldCheckout(user.id, plan);
      if (redirected) return;
      toast(CHECKOUT_FALLBACK_TOAST);
      setRedirectingToCheckout(false);
    })();
  }, [user, toast]);

  const [bizId, setBizId] = useState<string | null>(null);
  const [launchPackageStatus, setLaunchPackageStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // One screen: the four things a referral page needs to go live.
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [mobile, setMobile] = useState("");
  const [placeGeo, setPlaceGeo] = useState<PlaceSelection | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [existingSlug, setExistingSlug] = useState<string | null>(null);
  const [businessEmail, setBusinessEmail] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showReasons, setShowReasons] = useState(false);
  const [copied, setCopied] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLButtonElement>(null);
  const offerAmountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id,name,category,service_area,offer_amount,slug,business_email,launch_package_status,phone")
        .eq("user_id", user.id)
        .limit(1);
      const b = data?.[0];
      if (b) {
        const preview = readPreview(window.location.search);
        setBizId(b.id);
        setLaunchPackageStatus(b.launch_package_status || null);
        setName(b.name || preview?.name || "");
        setCategory(b.category || (preview ? previewCategory(preview.trade) : ""));
        setServiceArea(b.service_area || "");
        setOfferAmount(b.offer_amount || (preview ? `$${preview.reward}` : ""));
        setMobile(b.phone || "");
        setExistingSlug(b.slug || null);
        setBusinessEmail(b.business_email || null);
      }
      setLoading(false);
    })();
  }, [user]);

  const missingName = !name.trim();
  const missingCategory = !category;
  const missingReward = !offerAmount.trim();

  /** Saves, picks a free link, publishes. One tap. */
  const publishNow = async () => {
    setPublishError(null);
    if (missingName || missingCategory || missingReward) {
      setShowReasons(true);
      const target = missingName ? nameRef.current : missingCategory ? categoryRef.current : offerAmountRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
      return;
    }
    if (!bizId) {
      setPublishError("We lost track of your business. Refresh the page and try again.");
      return;
    }
    setSaving(true);
    try {
      let slug = existingSlug;
      if (!slug) {
        slug = await resolveAvailableSlug(suggestSlug(name), async (candidate) => {
          const { data, error } = await supabase.rpc("fn_slug_status", { p_slug: candidate });
          return error ? "error" : (data as string);
        });
        if (!slug) { setPublishError("We could not find a free link for that name. Try a slightly different business name."); return; }
      }
      const trimmedArea = serviceArea.trim();
      const matchedPlace =
        placeGeo && placeGeo.label.trim().toLowerCase() === trimmedArea.toLowerCase() ? placeGeo : null;
      const patch: BusinessUpdate = {
        name: name.trim(),
        category,
        service_area: trimmedArea,
        offer_amount: offerAmount.trim(),
        slug,
        phone: mobile.trim() || null,
      };
      if (!businessEmail && user?.email) patch.business_email = user.email;
      if (matchedPlace) {
        Object.assign(patch, {
          latitude: matchedPlace.latitude, longitude: matchedPlace.longitude,
          city: matchedPlace.city, state: matchedPlace.state, country: matchedPlace.country,
          geocoded_at: new Date().toISOString(), geocode_status: "ok",
        });
      }
      const { error } = await supabase.from("businesses").update(patch).eq("id", bizId);
      if (error) {
        const match = /invalid_slug:(\w+)/.exec(error.message);
        setPublishError(match ? slugRejectionMessage(match[1] as SlugRejection) : friendlyError(error));
        return;
      }
      setExistingSlug(slug);
      // Never blocks: coordinates stay empty if this fails.
      if (!matchedPlace && trimmedArea) {
        supabase.functions.invoke("geocode-business", { body: { business_id: bizId } })
          .catch((err) => console.error("[onboarding] geocode fallback failed", err));
      }
      const result = await publishPage("onboarding");
      if (!result.ok) { setPublishError(result.message ?? "Could not publish your page."); return; }
      track("onboarding_step_completed", { step: "publish" });
      track("onboarding_completed");
      setLiveUrl(`${window.location.origin}/r/${slug}`);
    } finally {
      setSaving(false);
    }
  };

  const copyLive = async () => {
    if (!liveUrl) return;
    const ok = await copyText(liveUrl);
    if (!ok) {
      toast({ title: "Could not copy the link", description: "Select the link and copy it manually.", variant: "destructive" });
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading || !user || redirectingToCheckout) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <SEOHead title="Set up your referral page · Revvin" description="Onboarding wizard" path="/welcome" noindex />
      <AuthSplit showWordmark={false}>
        <div className="w-full">
          {params.get("checkout") === "success" && !liveUrl && (
            launchPackageStatus && launchPackageStatus !== "none" ? (
              <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-foreground">
                <div className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Payment received, Pro + Launch Package ✨</p>
                    <p className="mt-1 text-muted-foreground">
                      Our team will reach out within 1 business day to schedule your 1:1 onboarding call.
                      In the meantime, get a head start by filling in the basics below.
                    </p>
                    <ul className="mt-3 space-y-1 text-xs text-muted-foreground list-disc pl-4">
                      <li>We'll build your offer with you on the call</li>
                      <li>We'll set up your referral page, QR code, and flyer</li>
                      <li>You'll get launch email + SMS templates and 30 days of priority support</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-foreground flex items-start gap-3">
                <Check className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Payment received, subscription active</p>
                  <p className="mt-1 text-muted-foreground">
                    Let's set up your referral page, takes about 3 minutes. Want hands-on help?{" "}
                    <Link to="/pricing" className="underline text-foreground">Add the Launch Package</Link>.
                  </p>
                </div>
              </div>
            )
          )}

          <div>
            {!liveUrl && (
              <form onSubmit={(e) => { e.preventDefault(); void publishNow(); }} noValidate>
                <h1 className="text-4xl sm:text-5xl">Your referral page, live in a minute</h1>
                <p className="mt-1 text-sm text-muted-foreground">Four answers and you are live. Publishing is free.</p>
                <p className="mt-2 text-sm text-muted-foreground">Every new account gets Pro free for 14 days. No card.</p>
                <div className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="biz-name">Business name</Label>
                    <Input id="biz-name" ref={nameRef} value={name} onChange={(e) => setName(e.target.value)}
                      aria-invalid={showReasons && missingName} autoComplete="organization" className="mt-1.5" />
                    {showReasons && missingName && <p role="alert" className="mt-1.5 text-sm font-medium text-destructive">Add your business name.</p>}
                  </div>
                  <div>
                    <Label htmlFor="biz-trade">Trade</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="biz-trade" ref={categoryRef} className="mt-1.5" aria-invalid={showReasons && missingCategory}><SelectValue placeholder="Pick one" /></SelectTrigger>
                      <SelectContent>{BUSINESS_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    {showReasons && missingCategory && <p role="alert" className="mt-1.5 text-sm font-medium text-destructive">Pick your trade.</p>}
                    {isRestrictedCategory(category) && (
                      <div className="mt-1.5 space-y-1.5 text-xs text-muted-foreground">
                        <p>Offers in this category are reviewed before they appear on the public marketplace. Your branded referral page works either way.</p>
                        <p>Rules on paying for referrals differ in your industry. In many US states, real estate, mortgage and insurance professionals cannot pay unlicensed people for referrals. Check your own rules before you publish a reward.</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="service-area">City</Label>
                    <ServiceAreaAutocomplete id="service-area" value={serviceArea} onChange={setServiceArea} onPlaceSelected={setPlaceGeo} placeholder="Dallas, TX" />
                  </div>
                  <div>
                    <Label htmlFor="payout-amount">Reward</Label>
                    <Input id="payout-amount" ref={offerAmountRef} value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)}
                      aria-invalid={showReasons && missingReward} className="mt-1.5" placeholder="$100" />
                    <p className="mt-1.5 text-xs text-muted-foreground">A fixed dollar amount you pay when a referred job closes.</p>
                    {showReasons && missingReward && <p role="alert" className="mt-1.5 text-sm font-medium text-destructive">Enter the reward you pay, for example $100.</p>}
                  </div>
                  <div>
                    <Label htmlFor="owner-mobile">Mobile number (we'll text you your page link)</Label>
                    <Input id="owner-mobile" type="tel" autoComplete="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="Optional" className="mt-1.5" />
                  </div>
                </div>
                {publishError && <p role="alert" className="mt-4 text-sm font-medium text-destructive">{publishError}</p>}
                <Button type="submit" disabled={saving} size="lg" className="mt-8 h-12 w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish my page"}
                </Button>
              </form>
            )}

            {liveUrl && (
              <>
                <h1 className="text-4xl sm:text-5xl">Your page is live</h1>
                {offerAmount.trim() && (
                  <p className="mt-4"><span data-testid="live-reward-chip" className="inline-block -rotate-2 rounded-[10px] bg-sign px-3 py-1.5 font-display text-3xl font-extrabold text-forest">Get {offerAmount.trim()}.</span></p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">Anyone with this link can now send you referrals.</p>
                <div className="mt-6 rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-foreground break-all">{liveUrl}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={copyLive}>
                    {copied ? <><Check className="mr-2 h-4 w-4" /> Copied</> : "Copy link"}
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={liveUrl} target="_blank" rel="noopener noreferrer">Open page</a>
                  </Button>
                </div>
                <Button className="mt-8 h-11 w-full" onClick={() => navigate("/dashboard?welcome=1")}>
                  Go to my dashboard
                </Button>
              </>
            )}
          </div>
        </div>
      </AuthSplit>
    </>
  );
};

export default Onboarding;