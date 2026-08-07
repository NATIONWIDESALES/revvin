import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BusinessLogoUpload from "@/components/BusinessLogoUpload";
import SlugField from "@/components/SlugField";
import SEOHead from "@/components/SEOHead";
import ServiceAreaAutocomplete, { type PlaceSelection } from "@/components/ServiceAreaAutocomplete";
import { Slider } from "@/components/ui/slider";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { track } from "@/lib/track";
import { BUSINESS_CATEGORIES, isRestrictedCategory } from "@/lib/offerUtils";
import { suggestSlug, slugRejectionMessage, type SlugRejection } from "@/lib/slugRules";
import { friendlyError } from "@/lib/errors";

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    track("onboarding_started");
  }, []);

  const [bizId, setBizId] = useState<string | null>(null);
  const [launchPackageStatus, setLaunchPackageStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [serviceRadiusKm, setServiceRadiusKm] = useState<number>(50);
  const [placeGeo, setPlaceGeo] = useState<PlaceSelection | null>(null);
  const [phone, setPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerTrigger, setOfferTrigger] = useState("");
  const [offerFinePrint, setOfferFinePrint] = useState("");
  const [slug, setSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  // Continue buttons stay enabled so a tap always produces feedback. These flags
  // drive the inline "what is missing" message instead of a dead disabled button.
  const [showBasicsReason, setShowBasicsReason] = useState(false);
  const [showOfferReason, setShowOfferReason] = useState(false);
  const [showSlugReason, setShowSlugReason] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLButtonElement>(null);
  const offerAmountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id,name,description,category,service_area,service_radius_km,phone,business_email,website,logo_url,offer_amount,offer_trigger,offer_fine_print,slug,launch_package_status,subscription_status")
        .eq("user_id", user.id)
        .limit(1);
      const b = data?.[0];
      if (b) {
        setBizId(b.id);
        setLaunchPackageStatus(b.launch_package_status || null);
        setSubscriptionStatus(b.subscription_status || null);
        // No billing gate here. Onboarding is free: businesses build their
        // page first and only pay when they choose to go live.
        setName(b.name || "");
        setDescription(b.description || "");
        setCategory(b.category || "");
        setServiceArea(b.service_area || "");
        setServiceRadiusKm(b.service_radius_km ?? 50);
        setPhone(b.phone || "");
        setBusinessEmail(b.business_email || user.email || "");
        setWebsite(b.website || "");
        setLogoUrl(b.logo_url || null);
        setOfferAmount(b.offer_amount || "");
        setOfferTrigger(b.offer_trigger || "");
        setOfferFinePrint(b.offer_fine_print || "");
        if (b.slug) {
          setSlug(b.slug);
          setSlugAvailable(true);
        } else if (b.name) {
          setSlug(suggestSlug(b.name));
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const saveStep = async (patch: Record<string, any>, nextStep?: number) => {
    if (!bizId) return;
    setSaving(true);
    const { error } = await supabase.from("businesses").update(patch).eq("id", bizId);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: friendlyError(error), variant: "destructive" });
      return;
    }
    if (nextStep) setStep(nextStep);
  };

  /**
   * Service area is never a blocker. If a suggestion was picked we already have
   * coordinates from the Places result. If the person typed free text, we ask
   * the geocode-business function to resolve it after the save, and if that
   * fails we simply leave the coordinates NULL.
   */
  const saveBasics = async () => {
    if (!name.trim() || !category) {
      setShowBasicsReason(true);
      const target = !name.trim() ? nameRef.current : categoryRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
      return;
    }
    setShowBasicsReason(false);
    const trimmedArea = serviceArea.trim();
    const matchedPlace =
      placeGeo && placeGeo.label.trim().toLowerCase() === trimmedArea.toLowerCase()
        ? placeGeo
        : null;

    const patch: Record<string, any> = {
      name,
      description,
      category,
      service_area: trimmedArea,
      service_radius_km: serviceRadiusKm,
      phone,
      business_email: businessEmail,
      website,
    };

    if (matchedPlace) {
      patch.latitude = matchedPlace.latitude;
      patch.longitude = matchedPlace.longitude;
      patch.city = matchedPlace.city;
      patch.state = matchedPlace.state;
      patch.country = matchedPlace.country;
      patch.geocoded_at = new Date().toISOString();
      patch.geocode_status = "ok";
    }

    await saveStep(patch, 2);

    if (!matchedPlace && trimmedArea) {
      supabase.functions
        .invoke("geocode-business", { body: { business_id: bizId } })
        .catch((err) => {
          console.error("[onboarding] geocode fallback failed", err);
          toast({
            title: "Saved, but we could not place you on the map",
            description: "You can fix your service area later from your dashboard.",
          });
        });
    }
  };

  const finalize = async () => {
    if (!slug || slugAvailable !== true) {
      setShowSlugReason(true);
      return;
    }
    setShowSlugReason(false);
    if (!bizId) {
      toast({
        title: "We lost track of your business",
        description: "Refresh the page and try again. Nothing you entered is lost.",
        variant: "destructive",
      });
      return;
    }
    // Free to build: saving the slug finishes setup. The page stays in draft
    // (is_published = false) until the business subscribes and goes live.
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({ slug })
      .eq("id", bizId);
    setSaving(false);
    if (error) {
      const match = /invalid_slug:(\w+)/.exec(error.message);
      toast({
        title: "Could not save",
        description: match
          ? slugRejectionMessage(match[1] as SlugRejection)
          : friendlyError(error),
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Your referral page is ready",
      description: "It is in draft. Go live from your dashboard whenever you're ready.",
    });
    track("onboarding_completed");
    navigate("/dashboard");
  };

  if (loading || !user) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <SEOHead title="Set up your referral page · Revvin" description="Onboarding wizard" path="/welcome" noindex />
      <div className="min-h-screen bg-muted/30 py-12 px-4">
        <div className="mx-auto max-w-2xl">
          {params.get("checkout") === "success" && step === 1 && (
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

          {/* Stepper */}
          <div className="mb-8 flex items-center gap-2">
            {[1,2,3,4].map((n) => (
              <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mb-2">Step {step} of 4</p>

          <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
            {step === 1 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Business basics</h1>
                <p className="mt-1 text-sm text-muted-foreground">Tell us about your business.</p>
                <div className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="biz-name">Business name</Label>
                    <Input
                      id="biz-name"
                      ref={nameRef}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (e.target.value.trim()) setShowBasicsReason(false);
                      }}
                      aria-invalid={showBasicsReason && !name.trim()}
                      autoComplete="organization"
                      className="mt-1.5"
                    />
                    {showBasicsReason && !name.trim() && (
                      <p role="alert" className="mt-1.5 text-sm font-medium text-destructive">Add your business name to continue.</p>
                    )}
                  </div>
                  <div><Label>One-sentence description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" rows={2} placeholder="Residential roofing across Denver, CO." /></div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={category}
                      onValueChange={(v) => {
                        setCategory(v);
                        setShowBasicsReason(false);
                      }}
                    >
                      <SelectTrigger ref={categoryRef} className="mt-1.5" aria-invalid={showBasicsReason && !category}><SelectValue placeholder="Pick one" /></SelectTrigger>
                      <SelectContent>{BUSINESS_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    {showBasicsReason && !category && (
                      <p role="alert" className="mt-1.5 text-sm font-medium text-destructive">Pick a category to continue.</p>
                    )}
                    {isRestrictedCategory(category) && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Offers in this category are reviewed before they appear on the public marketplace. Your branded referral page works either way.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="service-area">Service area</Label>
                    <ServiceAreaAutocomplete
                      id="service-area"
                      value={serviceArea}
                      onChange={setServiceArea}
                      onPlaceSelected={setPlaceGeo}
                      placeholder="Vancouver, BC"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Pick your city or region from the list so you show up on the map and in nearby searches. Typing it yourself works too.
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label>How far do you travel?</Label>
                      <span className="text-sm font-medium text-foreground">{serviceRadiusKm} km</span>
                    </div>
                    <Slider
                      value={[serviceRadiusKm]}
                      onValueChange={(v) => setServiceRadiusKm(v[0])}
                      min={5}
                      max={200}
                      step={5}
                      className="mt-3"
                    />
                    <div className="mt-2 flex gap-2">
                      {[25, 50, 100].map((km) => (
                        <Button
                          key={km}
                          type="button"
                          size="sm"
                          variant={serviceRadiusKm === km ? "default" : "outline"}
                          onClick={() => setServiceRadiusKm(km)}
                        >
                          {km} km
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div><Label>Business phone</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" /></div>
                  <div><Label>Business email</Label><Input type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} className="mt-1.5" /></div>
                  <div><Label>Website <span className="text-muted-foreground text-xs">(optional)</span></Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} className="mt-1.5" placeholder="https://" /></div>
                </div>
                <div className="mt-8 flex justify-end">
                  <Button onClick={saveBasics} disabled={saving} className="h-11 w-full sm:h-10 sm:w-auto">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Add your logo</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Any image works, including photos straight from your phone. Skip if you don't have one yet, you can add it later from your dashboard.
                </p>
                <div className="mt-6">
                  {bizId && <BusinessLogoUpload currentLogoUrl={logoUrl} businessId={bizId} onUploaded={setLogoUrl} />}
                </div>
                <div className="mt-8 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(3)}>Skip</Button>
                    <Button onClick={() => setStep(3)}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your referral offer</h1>
                <p className="mt-1 text-sm text-muted-foreground">What do you pay for a closed referral?</p>
                <div className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="payout-amount">Payout amount</Label>
                    <Input
                      id="payout-amount"
                      ref={offerAmountRef}
                      value={offerAmount}
                      onChange={(e) => {
                        setOfferAmount(e.target.value);
                        if (e.target.value.trim()) setShowOfferReason(false);
                      }}
                      aria-invalid={showOfferReason && !offerAmount.trim()}
                      className="mt-1.5"
                      placeholder="$500 or 10%"
                    />
                    {showOfferReason && (
                      <p role="alert" className="mt-1.5 text-sm font-medium text-destructive">
                        Enter what you pay for a closed referral, for example 100 dollars.
                      </p>
                    )}
                  </div>
                  {!offerAmount && (
                    <p className="-mt-2 text-xs text-muted-foreground">
                      A common starting point is a flat amount per closed job, for example 100 dollars. You can change this anytime.
                    </p>
                  )}
                  <div><Label>Payout trigger</Label><Input value={offerTrigger} onChange={(e) => setOfferTrigger(e.target.value)} className="mt-1.5" placeholder="per closed roofing job" /></div>
                  <div><Label>Fine print <span className="text-muted-foreground text-xs">(optional)</span></Label><Textarea value={offerFinePrint} onChange={(e) => setOfferFinePrint(e.target.value)} className="mt-1.5" rows={2} /></div>
                  {offerAmount && (
                    <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Preview</p>
                      <p className="text-lg font-semibold text-foreground">Refer a customer, earn {offerAmount}</p>
                      {offerTrigger && <p className="text-xs text-muted-foreground">{offerTrigger}</p>}
                    </div>
                  )}
                </div>
                <div className="mt-8 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                  <Button
                    onClick={() => {
                      if (!offerAmount.trim()) {
                        setShowOfferReason(true);
                        offerAmountRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        offerAmountRef.current?.focus({ preventScroll: true });
                        return;
                      }
                      setShowOfferReason(false);
                      void saveStep({ offer_amount: offerAmount, offer_trigger: offerTrigger, offer_fine_print: offerFinePrint }, 4);
                    }}
                    disabled={saving}
                    className="h-11 sm:h-10"
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pick your URL</h1>
                <p className="mt-1 text-sm text-muted-foreground">This is the link you'll share with customers and partners.</p>
                <div className="mt-6">
                  <SlugField
                    value={slug}
                    onChange={(v) => {
                      setSlug(v);
                      setShowSlugReason(false);
                    }}
                    businessName={name}
                    onValidityChange={setSlugAvailable}
                  />
                  {showSlugReason && (
                    <p role="alert" className="mt-2 text-sm font-medium text-destructive">
                      {!slug
                        ? "Pick a link name first."
                        : slugAvailable === null
                          ? "Give us a second to check that link, then tap Finish setup again."
                          : "That link will not work. Try one of the suggestions above."}
                    </p>
                  )}
                </div>
                <div className="mt-8 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
                  <Button onClick={finalize} disabled={saving} className="h-11 sm:h-10">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish setup"}
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Your page stays in draft until you go live. You can preview it any time from your dashboard.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Onboarding;