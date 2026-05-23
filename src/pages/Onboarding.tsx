import { useEffect, useState } from "react";
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
import SEOHead from "@/components/SEOHead";
import { Loader2, ArrowRight, Check } from "lucide-react";

const CATEGORIES = ["Roofing","HVAC","Plumbing","Electrical","Landscaping","Real Estate","Mortgage","Insurance","Auto","Solar","Home Services","Other"];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();

  const [bizId, setBizId] = useState<string | null>(null);
  const [launchPackageStatus, setLaunchPackageStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [phone, setPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerTrigger, setOfferTrigger] = useState("");
  const [offerFinePrint, setOfferFinePrint] = useState("");
  const [slug, setSlug] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id,name,description,category,service_area,phone,business_email,website,logo_url,offer_amount,offer_trigger,offer_fine_print,slug,launch_package_status")
        .eq("user_id", user.id)
        .limit(1);
      const b = data?.[0];
      if (b) {
        setBizId(b.id);
        setLaunchPackageStatus(b.launch_package_status || null);
        setName(b.name || "");
        setDescription(b.description || "");
        setCategory(b.category || "");
        setServiceArea(b.service_area || "");
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
          setSlug(slugify(b.name));
        }
      }
      setLoading(false);
    })();
  }, [user]);

  // Slug availability check
  useEffect(() => {
    if (!slug || step !== 4) return;
    if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) {
      setSlugAvailable(false);
      return;
    }
    setSlugChecking(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("fn_slug_available", { p_slug: slug });
      // Available if rpc returns true OR slug already belongs to this business
      const { data: own } = await supabase.from("businesses").select("id").eq("slug", slug).limit(1);
      const ownsSlug = own?.[0]?.id === bizId;
      setSlugAvailable(!!data || ownsSlug);
      setSlugChecking(false);
    }, 350);
    return () => clearTimeout(t);
  }, [slug, step, bizId]);

  const saveStep = async (patch: Record<string, any>, nextStep?: number) => {
    if (!bizId) return;
    setSaving(true);
    const { error } = await supabase.from("businesses").update(patch).eq("id", bizId);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    if (nextStep) setStep(nextStep);
  };

  const finalize = async () => {
    if (!bizId || !slug || !slugAvailable) return;
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({ slug, is_published: true })
      .eq("id", bizId);
    setSaving(false);
    if (error) {
      toast({ title: "Could not publish", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Your referral page is live" });
    navigate("/dashboard");
  };

  if (loading || !user) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <SEOHead title="Set up your referral page — Revvin" description="Onboarding wizard" path="/welcome" noindex />
      <div className="min-h-screen bg-muted/30 py-12 px-4">
        <div className="mx-auto max-w-2xl">
          {params.get("checkout") === "success" && step === 1 && (
            launchPackageStatus && launchPackageStatus !== "none" ? (
              <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-foreground">
                <div className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Payment received — Pro + Launch Package ✨</p>
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
                  <p className="font-semibold text-foreground">Payment received — subscription active</p>
                  <p className="mt-1 text-muted-foreground">
                    Let's set up your referral page — takes about 3 minutes. Want hands-on help?{" "}
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
                  <div><Label>Business name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
                  <div><Label>One-sentence description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" rows={2} placeholder="Residential roofing across Denver, CO." /></div>
                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pick one" /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Service area</Label><Input value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} className="mt-1.5" placeholder="Denver metro" /></div>
                  <div><Label>Business phone</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" /></div>
                  <div><Label>Business email</Label><Input type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} className="mt-1.5" /></div>
                  <div><Label>Website <span className="text-muted-foreground text-xs">(optional)</span></Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} className="mt-1.5" placeholder="https://" /></div>
                </div>
                <div className="mt-8 flex justify-end">
                  <Button onClick={() => saveStep({ name, description, category, service_area: serviceArea, phone, business_email: businessEmail, website }, 2)} disabled={!name || !category || saving}>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Add your logo</h1>
                <p className="mt-1 text-sm text-muted-foreground">PNG, JPG, or SVG. Skip if you don't have one yet.</p>
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
                  <div><Label>Payout amount</Label><Input value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} className="mt-1.5" placeholder="$500 or 10%" /></div>
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
                  <Button onClick={() => saveStep({ offer_amount: offerAmount, offer_trigger: offerTrigger, offer_fine_print: offerFinePrint }, 4)} disabled={!offerAmount || saving}>
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
                  <Label>Your referral page URL</Label>
                  <div className="mt-1.5 flex items-center rounded-lg border border-input bg-background overflow-hidden">
                    <span className="px-3 py-2 text-sm text-muted-foreground bg-muted/50 border-r border-border">revvin.co/r/</span>
                    <input
                      className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
                      value={slug}
                      onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                      placeholder="apex-roofing"
                    />
                  </div>
                  <p className="mt-2 text-xs">
                    {slugChecking ? <span className="text-muted-foreground">Checking…</span> :
                      slug && slugAvailable === true ? <span className="text-primary">Available ✓</span> :
                      slug && slugAvailable === false ? <span className="text-destructive">Not available or invalid (3–40 chars, lowercase, letters/numbers/hyphens)</span> : null}
                  </p>
                </div>
                <div className="mt-8 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
                  <Button onClick={finalize} disabled={!slug || slugAvailable !== true || saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish my referral page"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Onboarding;