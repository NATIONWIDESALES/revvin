import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, DollarSign, Clock, MapPin, Shield, BadgeCheck, Building2, CheckCircle2, Info, CreditCard, Loader2, Wallet, AlertTriangle } from "lucide-react";
import { categories, RESTRICTED_CATEGORIES } from "@/lib/offerUtils";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const TOTAL_STEPS = 4;

const STEP_LABELS = ["Offer Details", "Payout & Timing", "Qualification Rules", "Preview & Publish"];

const SUPER_ADMIN_EMAIL = "sales@nationwidesales.ca";

const CreateOffer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessAccountStatus, setBusinessAccountStatus] = useState<string>("pending_approval");
  const [businessName, setBusinessName] = useState("");
  const [pricingTier, setPricingTier] = useState<string>("free");
  const [loading, setLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [shortfallDialog, setShortfallDialog] = useState<{ open: boolean; shortfall: number; totalRequired: number }>({ open: false, shortfall: 0, totalRequired: 0 });
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  const [form, setForm] = useState({
    title: "", description: "", category: "Services",
    payout: "",
    location: "", dealSizeMin: "", dealSizeMax: "", closeTimeDays: "",
    remoteEligible: false, qualificationCriteria: "",
    payoutTimeline: "net14" as "net7" | "net14" | "net30",
    monthlyCapacity: "", leadFreshness: "", minProjectSize: "", eligibleLocations: "",
    country: "US" as "US" | "CA",
  });

  useEffect(() => {
    if (!user) return;

    const ensureBusinessProfile = async () => {
      const { data: rows, error: fetchError } = await supabase
        .from("businesses")
        .select("id, name, account_status, pricing_tier")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (fetchError) {
        toast({ title: "Error", description: fetchError.message, variant: "destructive" });
        navigate("/dashboard");
        return;
      }

      let business = rows && rows.length > 0 ? rows[0] : null;

      if (!business) {
        const fallbackName =
          (user.user_metadata?.business_name as string | undefined) ||
          (user.user_metadata?.full_name as string | undefined)
            ? `${user.user_metadata?.full_name ?? user.user_metadata?.business_name}'s Business`
            : "My Business";

        const { data: created, error: createError } = await supabase
          .from("businesses")
          .insert({
            user_id: user.id,
            name: fallbackName,
            account_status: "approved",
          })
          .select("id, name, account_status, pricing_tier")
          .maybeSingle();

        if (createError) {
          toast({ title: "Error", description: createError.message, variant: "destructive" });
          navigate("/dashboard");
          return;
        }

        business = created;
      }

      if (!business) {
        toast({ title: "Error", description: "Unable to load your business profile.", variant: "destructive" });
        navigate("/dashboard");
        return;
      }

      // Allow pending businesses to create draft offers
      // They just can't publish until approved

      setBusinessId(business.id);
      setBusinessName(business.name);
      setBusinessAccountStatus(business.account_status || "pending_approval");
      setPricingTier(business.pricing_tier || "free");
    };

    ensureBusinessProfile();
  }, [user, isSuperAdmin, navigate, toast]);

  const isRestricted = RESTRICTED_CATEGORIES.includes(form.category);

  const feeRate = pricingTier === "paid" ? 0.10 : 0.25;
  const payoutNum = parseFloat(form.payout) || 0;
  const platformFee = Math.round(payoutNum * feeRate * 100) / 100;
  const totalReserved = Math.round((payoutNum + platformFee) * 100) / 100;
  const feePercent = pricingTier === "paid" ? "10%" : "25%";

  const isPendingApproval = businessAccountStatus !== "approved" && !isSuperAdmin;

  const buildInsertData = () => {
    const payoutValue = parseFloat(form.payout) || 0;
    const qualRules = [
      form.leadFreshness && `Lead freshness: ${form.leadFreshness}`,
      form.minProjectSize && `Minimum project size: $${form.minProjectSize}`,
      form.eligibleLocations && `Eligible locations: ${form.eligibleLocations}`,
      form.qualificationCriteria,
    ].filter(Boolean).join("\n");

    return {
      business_id: businessId!,
      title: form.title,
      description: form.description,
      category: form.category,
      payout: payoutValue,
      payout_type: "flat" as const,
      location: form.location,
      country: form.country,
      currency: form.country === "CA" ? "CAD" : "USD",
      deal_size_min: form.dealSizeMin ? parseFloat(form.dealSizeMin) : null,
      deal_size_max: form.dealSizeMax ? parseFloat(form.dealSizeMax) : null,
      close_time_days: form.closeTimeDays ? parseInt(form.closeTimeDays) : null,
      remote_eligible: form.remoteEligible,
      qualification_criteria: qualRules || null,
      platform_fee_rate: feeRate,
    };
  };

  const handleSaveDraft = async () => {
    if (!businessId) return;
    setPublishLoading(true);
    try {
      const insertData = {
        ...buildInsertData(),
        status: "draft",
        deposit_status: "not_required",
        approval_status: "approved",
      };
      const { error } = await supabase.from("offers").insert(insertData).select("id").single();
      if (error) throw error;
      toast({ title: "Offer saved as draft", description: "Your offer has been saved. It will go live after your account is approved and you publish it." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save draft", variant: "destructive" });
    } finally {
      setPublishLoading(false);
    }
  };

  const handlePublishOffer = async () => {
    if (!businessId) {
      toast({ title: "Error", description: "Business profile not found.", variant: "destructive" });
      return;
    }

    if (isPendingApproval) {
      return handleSaveDraft();
    }

    const payoutValue = parseFloat(form.payout);
    if (!Number.isFinite(payoutValue) || payoutValue <= 0) {
      toast({ title: "Invalid payout", description: "Please enter a valid payout amount.", variant: "destructive" });
      setStep(2);
      return;
    }

    setPublishLoading(true);
    try {
      const insertData = {
        ...buildInsertData(),
        approval_status: isRestricted ? "pending_approval" : "approved",
        status: isSuperAdmin ? "active" : "draft",
        deposit_status: isSuperAdmin ? "waived" : "not_required",
      };

      const { data, error } = await supabase.from("offers").insert(insertData).select("id").single();
      if (error) throw error;

      if (isSuperAdmin) {
        toast({ title: "Offer published!", description: "Your offer is now live (deposit waived)." });
        navigate("/dashboard");
        return;
      }

      // Call reserve-offer-funds
      const { data: reserveData, error: reserveError } = await supabase.functions.invoke("reserve-offer-funds", {
        body: { offer_id: data.id },
      });

      if (reserveError) {
        const errBody = typeof reserveError === "object" && "message" in reserveError ? reserveError.message : String(reserveError);
        throw new Error(errBody);
      }

      if (reserveData?.error) {
        if (reserveData.shortfall !== undefined) {
          setShortfallDialog({ open: true, shortfall: reserveData.shortfall, totalRequired: reserveData.total_required });
          return;
        }
        throw new Error(reserveData.error);
      }

      if (reserveData?.success) {
        if (isRestricted) {
          toast({ title: "Offer submitted for review", description: "This category requires approval before going live." });
        } else {
          toast({ title: "Offer published!", description: "Your offer is now live. Funds will be deducted when referrals close." });
        }
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to publish offer", variant: "destructive" });
    } finally {
      setPublishLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    if (step === 4) {
      await handlePublishOffer();
    }
  };

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="py-8">
      <div className="container max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-6 gap-1" asChild>
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
        </Button>

        <h1 className="font-display text-2xl font-bold text-foreground mb-2">{isPendingApproval ? "Draft Referral Offer" : "Create Referral Offer"}</h1>
        <p className="text-muted-foreground mb-6">Define what you're willing to pay for successful referrals</p>

        {isPendingApproval && (
          <div className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-4 flex items-start gap-3">
            <Clock className="h-5 w-5 text-accent-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Account pending approval</p>
              <p className="text-xs text-muted-foreground mt-1">You can prepare your offer now. It will be saved as a draft and can go live once your account is approved.</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-8">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0 ${i + 1 <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
              <span className={`text-sm font-medium hidden sm:block ${i + 1 <= step ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
              {i < TOTAL_STEPS - 1 && <div className={`h-0.5 flex-1 rounded ${i + 1 < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div><Label>Offer Title</Label><Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Home Solar Installation" required className="mt-1" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the service and what kind of leads you're looking for..." rows={4} className="mt-1" /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Category</Label>
                  <select value={form.category} onChange={(e) => update("category", e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    {categories.filter((c) => c !== "All").map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                  {isRestricted && (
                    <p className="text-xs text-accent-foreground mt-1 flex items-center gap-1"><Info className="h-3 w-3" /> This category requires admin approval before going live.</p>
                  )}
                </div>
                <div><Label>Service Location</Label><Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Los Angeles, CA" className="mt-1" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Country</Label>
                  <div className="mt-1 flex gap-2">
                    <Button type="button" variant={form.country === "US" ? "default" : "outline"} size="sm" onClick={() => update("country", "US")} className="flex-1">🇺🇸 USA</Button>
                    <Button type="button" variant={form.country === "CA" ? "default" : "outline"} size="sm" onClick={() => update("country", "CA")} className="flex-1">🇨🇦 Canada</Button>
                  </div>
                </div>
              </div>
              <div><Label>Qualification Criteria (optional)</Label><Textarea value={form.qualificationCriteria} onChange={(e) => update("qualificationCriteria", e.target.value)} placeholder="What makes a qualified lead?" rows={3} className="mt-1" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remote" checked={form.remoteEligible} onChange={(e) => update("remoteEligible", e.target.checked)} className="rounded" />
                <Label htmlFor="remote" className="cursor-pointer">Remote eligible</Label>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Payout Amount ($)</Label><Input type="number" value={form.payout} onChange={(e) => update("payout", e.target.value)} placeholder="500" required className="mt-1" /></div>
                <div className="flex items-end">
                  <div className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm text-muted-foreground w-full">
                    <span className="font-medium text-foreground">Fixed payout</span> per successful referral
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><Label>Deal Size Min ($)</Label><Input type="number" value={form.dealSizeMin} onChange={(e) => update("dealSizeMin", e.target.value)} placeholder="5000" className="mt-1" /></div>
                <div><Label>Deal Size Max ($)</Label><Input type="number" value={form.dealSizeMax} onChange={(e) => update("dealSizeMax", e.target.value)} placeholder="50000" className="mt-1" /></div>
                <div><Label>Est. Close Time (days)</Label><Input type="number" value={form.closeTimeDays} onChange={(e) => update("closeTimeDays", e.target.value)} placeholder="30" className="mt-1" /></div>
              </div>

              {/* Fee breakdown */}
              {payoutNum > 0 && (
                <div className="rounded-2xl border border-border bg-muted/30 p-5">
                  <p className="text-sm font-medium mb-3">Cost Breakdown</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-card border border-border p-3">
                      <p className="text-xs text-muted-foreground">Referral Fee</p>
                      <p className="font-display text-lg font-bold">${payoutNum}</p>
                    </div>
                    <div className="rounded-xl bg-card border border-border p-3">
                      <p className="text-xs text-muted-foreground">Platform Fee ({feePercent})</p>
                      <p className="font-display text-lg font-bold">${platformFee}</p>
                    </div>
                    <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
                      <p className="text-xs text-muted-foreground">Total Cost per Referral</p>
                      <p className="font-display text-lg font-bold text-primary">${totalReserved}</p>
                    </div>
                  </div>
                  {pricingTier === "free" && (
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <Info className="h-3 w-3" /> Upgrade to Paid ($50/mo) to reduce your platform fee to 10%.
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 flex items-start gap-3">
                <Wallet className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Balance verified at publish</p>
                  <p className="text-xs text-muted-foreground mt-1">When you publish, we'll verify your wallet balance can cover this offer. The actual deduction happens when a referral closes.</p>
                </div>
              </div>
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">How payouts work</p>
                  <p className="text-xs text-muted-foreground mt-1">You set the payout amount. When a deal closes, Revvin verifies and handles payout to the referrer.</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h2 className="font-display text-lg font-semibold">Qualification Rules</h2>
              <p className="text-sm text-muted-foreground">Define what makes a qualified lead so referrers send you the right customers.</p>
              <div><Label>Lead Freshness Requirement</Label><Input value={form.leadFreshness} onChange={(e) => update("leadFreshness", e.target.value)} placeholder="e.g. Lead must not be an existing customer" className="mt-1" /></div>
              <div><Label>Minimum Project Size ($)</Label><Input type="number" value={form.minProjectSize} onChange={(e) => update("minProjectSize", e.target.value)} placeholder="e.g. 5000" className="mt-1" /></div>
              <div><Label>Eligible Locations</Label><Input value={form.eligibleLocations} onChange={(e) => update("eligibleLocations", e.target.value)} placeholder="e.g. Metro Vancouver, Fraser Valley" className="mt-1" /></div>
              <div>
                <Label>Payout Timeline</Label>
                <div className="mt-1 flex gap-2">
                  {(["net7", "net14", "net30"] as const).map((t) => (
                    <Button key={t} type="button" variant={form.payoutTimeline === t ? "default" : "outline"} size="sm" onClick={() => update("payoutTimeline", t)} className="flex-1">
                      {t === "net7" ? "Net 7" : t === "net14" ? "Net 14" : "Net 30"}
                    </Button>
                  ))}
                </div>
              </div>
              <div><Label>Monthly Referral Capacity</Label><Input type="number" value={form.monthlyCapacity} onChange={(e) => update("monthlyCapacity", e.target.value)} placeholder="e.g. 15" className="mt-1" /><p className="text-xs text-muted-foreground mt-1">How many referrals can you handle per month?</p></div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
                <Shield className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span><strong>Duplicate Protection:</strong> First accepted submission wins, timestamped.</span>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <p className="text-sm text-muted-foreground">Here's how your offer will appear to referrers:</p>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-xl"><Building2 className="h-6 w-6 text-muted-foreground" /></div>
                  <div>
                    <h3 className="font-display text-base font-bold">{form.title || "Offer Title"}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">{businessName || "Your Business"} <BadgeCheck className="h-3.5 w-3.5 text-primary" /></p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{form.description || "Offer description..."}</p>
                <div className="rounded-xl bg-earnings/5 border border-earnings/20 p-4 mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-earnings uppercase tracking-wide">Earn per referral</span>
                    <span className="earnings-badge rounded-full px-4 py-1.5 text-sm font-bold shadow-sm">${payoutNum || "—"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {form.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {form.location}</span>}
                  <span className="flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5 text-primary" /> Verified</span>
                  <Badge variant="outline" className="text-xs">{form.category}</Badge>
                </div>
              </div>
              {isRestricted && (
                <div className="rounded-xl bg-accent/10 border border-accent/20 p-4 flex items-start gap-3">
                  <Info className="h-5 w-5 text-accent-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-accent-foreground">Category requires approval</p>
                    <p className="text-xs text-muted-foreground mt-1">This category ({form.category}) requires admin review before going live.</p>
                  </div>
                </div>
              )}
              {payoutNum > 0 && !isSuperAdmin && (
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 flex items-start gap-3">
                  <Wallet className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Cost per referral: ${totalReserved}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ${payoutNum} referral fee + ${platformFee} platform fee ({feePercent}). Your wallet balance will be verified at publish — actual deduction happens when a deal closes.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <div className="flex gap-3 pt-2">
            {step > 1 && <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="flex-1">Back</Button>}
            {step < 4 && (
              <Button type="button" onClick={handleNextStep} size="lg" className={`${step > 1 ? "flex-1" : "w-full"} gap-2`} disabled={loading}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {step === 4 && (
              <Button type="button" onClick={handleNextStep} size="lg" className={`${step > 1 ? "flex-1" : "w-full"} gap-2`} disabled={publishLoading || !businessId}>
                {publishLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> {isPendingApproval ? "Saving..." : "Publishing..."}</> : isPendingApproval ? "Save as Draft" : isRestricted ? "Submit for Review" : "Publish Offer"}
              </Button>
            )}
          </div>
        </form>

        {/* Insufficient funds dialog */}
        <Dialog open={shortfallDialog.open} onOpenChange={(open) => setShortfallDialog((s) => ({ ...s, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" /> Insufficient Wallet Balance
              </DialogTitle>
              <DialogDescription>
                You need <strong>${shortfallDialog.totalRequired}</strong> available in your wallet to cover this offer, but you're short by <strong>${shortfallDialog.shortfall}</strong>. Top up your wallet to continue.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShortfallDialog((s) => ({ ...s, open: false }))}>Cancel</Button>
              <Button onClick={() => navigate("/dashboard")} className="gap-2">
                <Wallet className="h-4 w-4" /> Top Up Wallet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CreateOffer;
