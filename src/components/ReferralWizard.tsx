import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Upload, Shield, ArrowRight, ArrowLeft, FileText, User, MessageSquare, Scale, Sparkles, LogIn, UserPlus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toSlug } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import type { Offer } from "@/types/offer";

const STORAGE_KEY = "revvin_referral_draft";

interface ReferralWizardProps {
  offer: Offer;
}

const STEPS = [
  { label: "Offer", icon: Sparkles },
  { label: "Customer", icon: User },
  { label: "Notes", icon: MessageSquare },
  { label: "Consent", icon: Scale },
  { label: "Confirm", icon: CheckCircle2 },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

const ReferralWizard = ({ offer }: ReferralWizardProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatPayout } = useCountry();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [referralId, setReferralId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    notes: "",
  });
  const [consent, setConsent] = useState(false);
  const [termsAck, setTermsAck] = useState(false);

  // Restore form data from sessionStorage after auth redirect
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.offerId === offer.id) {
          setFormData(parsed.formData);
          setConsent(parsed.consent ?? false);
          setTermsAck(parsed.termsAck ?? false);
          setStep(parsed.step ?? 3);
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {}
  }, [offer.id]);

  const saveFormToSession = () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      offerId: offer.id,
      formData,
      consent,
      termsAck,
      step: 3,
    }));
  };

  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const isSampleOffer = offer.id.startsWith("sample-");
  const isLogoUrl = offer.businessLogo.startsWith("http");

  const redirectPath = `/offer/${toSlug(offer.business)}/${offer.id}`;

  const goNext = () => {
    if (isSampleOffer) return; // blocked for sample offers
    if (step === 0 && !user) {
      setShowAuthPrompt(true);
      return;
    }
    setShowAuthPrompt(false);
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const canProceed = () => {
    if (step === 0) return true;
    if (step === 1) return formData.name.trim().length > 0 && formData.email.trim().length > 0;
    if (step === 2) return true;
    if (step === 3) return consent && termsAck;
    return true;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to submit a referral.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Use the offer's real DB id directly — look up business_id from the offer
      const { data: dbOffer } = await supabase
        .from("offers")
        .select("id, business_id")
        .eq("id", offer.id)
        .maybeSingle();

      if (!dbOffer) {
        toast({ title: "Offer not found", description: "This offer is no longer available.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      // Check for duplicate referral before inserting
      const { data: isDuplicate } = await supabase.rpc("fn_check_duplicate_referral", {
        p_offer_id: dbOffer.id,
        p_business_id: dbOffer.business_id,
        p_email: formData.email || "",
        p_phone: formData.phone || undefined,
      });

      if (isDuplicate) {
        toast({ title: "Duplicate referral", description: "This customer has already been referred for this offer.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      // Upload attachment if present
      let fileUrl: string | null = null;
      if (attachedFile && user) {
        const filePath = `${user.id}/${Date.now()}-${attachedFile.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("referral-attachments")
          .upload(filePath, attachedFile);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("referral-attachments").getPublicUrl(filePath);
          fileUrl = urlData.publicUrl;
        }
      }

      const { data: inserted, error } = await supabase
        .from("referrals")
        .insert({
          referrer_id: user.id,
          offer_id: dbOffer.id,
          business_id: dbOffer.business_id,
          customer_name: formData.name,
          customer_email: formData.email || null,
          customer_phone: formData.phone || null,
          notes: formData.notes || null,
          file_url: fileUrl,
          payout_amount: offer.payoutType === "flat" ? Math.round(offer.payout * 0.9) : null,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Fire-and-forget — don't await, don't block UI
      supabase.functions.invoke("notify-new-referral", {
        body: { referral_id: inserted.id },
      }).catch((err) => console.error("Notification trigger failed:", err));

      setReferralId(inserted.id);
      setDirection(1);
      setStep(4);
      toast({ title: "Referral Submitted!", description: "Track this referral in your dashboard." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="sticky top-24 rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
      {/* Header with payout */}
      <div className="bg-gradient-to-br from-primary/10 to-earnings/10 p-5 text-center border-b border-border">
        <div className="earnings-badge mx-auto mb-2 inline-block rounded-full px-5 py-2.5 text-lg font-bold shadow-md">
          Earn {offer.payoutType === "flat" ? formatPayout(offer.payout, offer.currency) : `${offer.payout}%`}
        </div>
        <p className="text-xs text-muted-foreground">per successful referral</p>
      </div>

      {/* Step indicators */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step || (step === 4 && i === 4);
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isDone
                      ? "bg-earnings text-earnings-foreground"
                      : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone && i < step ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Step content */}
      <div className="p-5 min-h-[280px] relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {/* Step 0: Confirm Offer */}
            {step === 0 && (
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-sm">Step 1: Confirm Offer</h3>
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-xl overflow-hidden">
                      {isLogoUrl ? (
                        <img src={offer.businessLogo} alt={offer.business} className="h-full w-full object-cover" />
                      ) : (
                        offer.businessLogo
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{offer.title}</p>
                      <p className="text-xs text-muted-foreground">{offer.business} • {offer.country === "CA" ? "🇨🇦" : "🇺🇸"} {offer.city}</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-earnings/5 border border-earnings/20 p-2 text-center">
                      <p className="text-muted-foreground">Referral Payout</p>
                      <p className="font-bold text-earnings">
                        {offer.payoutType === "flat" ? formatPayout(offer.payout, offer.currency) : `${offer.payout}%`}
                      </p>
                    </div>
                  {offer.verified && (
                    <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/20 rounded-lg p-2">
                      <Shield className="h-3.5 w-3.5 shrink-0" />
                      <span>Verified Business. Payout processed by Revvin after close</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Review the offer details above, then proceed to enter the customer's information.</p>
              </div>
            )}

            {/* Step 1: Customer Info */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-sm">Step 2: Customer Information</h3>
                <div>
                  <label className="mb-1.5 block text-xs font-medium">Full Name *</label>
                  <Input placeholder="Jane Smith" required value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium">Email *</label>
                  <Input type="email" placeholder="jane@example.com" required value={formData.email} onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium">Phone</label>
                  <Input type="tel" placeholder="(555) 123-4567" value={formData.phone} onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium">Customer City</label>
                  <Input placeholder="e.g. Vancouver" value={formData.city} onChange={(e) => setFormData((f) => ({ ...f, city: e.target.value }))} />
                </div>
              </div>
            )}

            {/* Step 2: Notes & Attachments */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-sm">Step 3: Notes & Attachments</h3>
                <div>
                  <label className="mb-1.5 block text-xs font-medium">Context & Notes</label>
                  <Textarea placeholder="Why is this a good fit? Any context that helps the business..." rows={4} value={formData.notes} onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium">Attachments (optional)</label>
                  <label className="flex items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.size <= 10 * 1024 * 1024) setAttachedFile(file);
                      }}
                    />
                    <div>
                      <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                      {attachedFile ? (
                        <p className="text-xs text-foreground font-medium">{attachedFile.name}</p>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground">Click to upload supporting documents</p>
                          <p className="text-[10px] text-muted-foreground mt-1">PDF, images, or documents up to 10 MB</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Step 3: Consent */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-sm">Step 4: Consent & Terms</h3>
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                  <div className="flex items-start gap-2.5">
                    <Checkbox id="consent-wizard" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                    <label htmlFor="consent-wizard" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                      I confirm the customer has <strong>consented to being contacted</strong> about this service and that I have permission to share their contact information.
                    </label>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Checkbox id="terms-wizard" checked={termsAck} onCheckedChange={(v) => setTermsAck(v === true)} className="mt-0.5" />
                    <label htmlFor="terms-wizard" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                      I acknowledge the <strong>referral terms</strong>, including the duplicate lead policy (first accepted submission wins) and that payouts are subject to deal verification.
                    </label>
                  </div>
                </div>
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-xs text-muted-foreground space-y-1.5">
                  <p className="font-medium text-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Summary</p>
                  <p>• Customer: <strong>{formData.name}</strong> ({formData.email})</p>
                  <p>• Offer: <strong>{offer.title}</strong> by {offer.business}</p>
                  <p>• Payout: <strong>{offer.payoutType === "flat" ? formatPayout(offer.payout, offer.currency) : `${offer.payout}%`}</strong> upon close</p>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && referralId && (
              <div className="py-4 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-earnings/10">
                  <CheckCircle2 className="h-8 w-8 text-earnings" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">Referral Submitted!</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Your referral has been sent to {offer.business}.</p>
                </div>
                <div className="inline-block rounded-lg bg-muted/50 border border-border px-3 py-1.5">
                  <p className="text-[10px] text-muted-foreground">Referral ID</p>
                  <p className="font-mono text-xs font-bold">{referralId.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-left">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Referral Tracking</p>
                  <div className="space-y-2">
                    {["Submitted", "Under Review", "Deal In Progress", "Payout"].map((s, i) => (
                      <div key={s} className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-earnings" : "bg-border"}`} />
                        <span className={`text-xs ${i === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setStep(0); setDirection(-1); setReferralId(null); setConsent(false); setTermsAck(false); setFormData({ name: "", email: "", phone: "", city: "", notes: "" }); }}>
                    Submit Another
                  </Button>
                  <Button className="flex-1" asChild>
                    <Link to="/dashboard">Track in Dashboard</Link>
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Auth prompt (shown when unauthenticated user clicks Continue on step 0) */}
      {showAuthPrompt && step === 0 && !user && (
        <div className="px-5 pb-5 space-y-3">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <Shield className="mx-auto h-6 w-6 text-primary mb-2" />
            <p className="text-sm font-semibold text-foreground mb-1">Sign in to refer someone</p>
            <p className="text-xs text-muted-foreground">Create a free account or sign in to submit referrals and track your earnings.</p>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1 gap-1.5"
              onClick={() => navigate(`/auth?mode=signup&role=referrer&redirect=${encodeURIComponent(redirectPath)}`)}
            >
              <UserPlus className="h-3.5 w-3.5" /> Sign Up Free
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => navigate(`/auth?mode=login&redirect=${encodeURIComponent(redirectPath)}`)}
            >
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </Button>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      {step < 4 && !showAuthPrompt && !isSampleOffer && (
        <div className="px-5 pb-5 flex gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={goBack} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          )}
          {step < 3 ? (
            <Button className="flex-1 gap-1.5" onClick={goNext} disabled={!canProceed()}>
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button className="flex-1 gap-1.5 font-semibold" onClick={handleSubmit} disabled={!canProceed() || submitting}>
              {submitting ? "Submitting..." : "Submit Referral"} {!submitting && <CheckCircle2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      )}

      {/* Sample offer message */}
      {isSampleOffer && (
        <div className="px-5 pb-5 space-y-3">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-semibold text-foreground mb-2">This is an example offer</p>
            <p className="text-xs text-muted-foreground mb-3">
              This offer shows how REVVIN.CO works. Browse our live offers to start earning, or invite a business you know.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <Link to="/browse">Browse Live Offers</Link>
              </Button>
              <Button className="flex-1" asChild>
                <Link to="/dashboard">Invite a Business</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Legal link */}
      <div className="px-5 pb-4 text-center">
        <Link to="/referral-agreement" className="text-[10px] text-muted-foreground underline hover:text-foreground">
          View Referral Agreement & Terms
        </Link>
      </div>
    </div>
  );
};

export default ReferralWizard;
