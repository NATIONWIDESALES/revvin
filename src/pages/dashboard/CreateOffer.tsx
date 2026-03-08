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
import { ArrowLeft, ArrowRight, DollarSign, Clock, MapPin, Shield, BadgeCheck, Building2, CheckCircle2, Info, CreditCard, Loader2 } from "lucide-react";
import { categories, RESTRICTED_CATEGORIES } from "@/lib/offerUtils";
import { motion } from "framer-motion";

const TOTAL_STEPS = 5;

const STEP_LABELS = ["Offer Details", "Payout & Timing", "Qualification Rules", "Preview", "Deposit & Publish"];

const SUPER_ADMIN_EMAIL = "sales@nationwidesales.ca";

const CreateOffer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [savedOfferId, setSavedOfferId] = useState<string | null>(null);
  const [depositStatus, setDepositStatus] = useState<string | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  const [form, setForm] = useState({
    title: "", description: "", category: "Services",
    payout: "", payoutType: "flat" as "flat" | "percentage",
    location: "", dealSizeMin: "", dealSizeMax: "", closeTimeDays: "",
    remoteEligible: false, qualificationCriteria: "",
    payoutTimeline: "net14" as "net7" | "net14" | "net30",
    monthlyCapacity: "", leadFreshness: "", minProjectSize: "", eligibleLocations: "",
    maxPayoutCap: "",
  });

  useEffect(() => {
    if (!user) return;

    const ensureBusinessProfile = async () => {
      const { data: rows, error: fetchError } = await supabase
        .from("businesses")
        .select("id, name, account_status")
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
            account_status: isSuperAdmin ? "approved" : "pending_approval",
          })
          .select("id, name, account_status")
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

      if (business.account_status !== "approved") {
        toast({
          title: "Account not approved",
          description: "Your business account must be approved before creating offers.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setBusinessId(business.id);
      setBusinessName(business.name);
    };

    ensureBusinessProfile();
  }, [user, isSuperAdmin, navigate, toast]);

  // Poll deposit status when on step 5
  useEffect(() => {
    if (step !== 5 || !savedOfferId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("offers")
        .select("deposit_status")
        .eq("id", savedOfferId)
        .single();
      if (data?.deposit_status) {
        setDepositStatus(data.deposit_status);
        if (data.deposit_status === "paid") clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [step, savedOfferId]);

  const isRestricted = RESTRICTED_CATEGORIES.includes(form.category);

  const handleSaveOffer = async () => {
    if (!businessId) {
      toast({ title: "Error", description: "Business profile not found. Please refresh and try again.", variant: "destructive" });
      return;
    }

    const payoutValue = parseFloat(form.payout);
    if (!Number.isFinite(payoutValue) || payoutValue <= 0) {
      toast({ title: "Invalid payout", description: "Please enter a valid payout amount.", variant: "destructive" });
      setStep(2);
      return;
    }

    if (form.payoutType === "percentage") {
      const cap = parseFloat(form.maxPayoutCap);
      if (!Number.isFinite(cap) || cap <= 0) {
        toast({ title: "Missing max payout cap", description: "Please enter a valid maximum payout cap for percentage offers.", variant: "destructive" });
        setStep(2);
        return;
      }
    }

    setLoading(true);
    try {
      const qualRules = [
        form.leadFreshness && `Lead freshness: ${form.leadFreshness}`,
        form.minProjectSize && `Minimum project size: $${form.minProjectSize}`,
        form.eligibleLocations && `Eligible locations: ${form.eligibleLocations}`,
        form.qualificationCriteria,
      ].filter(Boolean).join("\n");

      const insertData: any = {
        business_id: businessId,
        title: form.title,
        description: form.description,
        category: form.category,
        payout: payoutValue,
        payout_type: form.payoutType,
        location: form.location,
        country: form.country,
        currency: form.country === "CA" ? "CAD" : "USD",
        deal_size_min: form.dealSizeMin ? parseFloat(form.dealSizeMin) : null,
        deal_size_max: form.dealSizeMax ? parseFloat(form.dealSizeMax) : null,
        close_time_days: form.closeTimeDays ? parseInt(form.closeTimeDays) : null,
        remote_eligible: form.remoteEligible,
        qualification_criteria: qualRules || null,
        approval_status: isRestricted ? "pending_approval" : "approved",
        status: isSuperAdmin ? "active" : "draft",
        deposit_status: isSuperAdmin ? "waived" : "required",
      };

      if (form.payoutType === "percentage" && form.maxPayoutCap) {
        insertData.max_payout_cap = parseFloat(form.maxPayoutCap);
      }

      const { data, error } = await supabase.from("offers").insert(insertData).select("id, deposit_status").single();
      if (error) throw error;

      if (data) {
        setSavedOfferId(data.id);
        setDepositStatus(data.deposit_status);
        if (isSuperAdmin) {
          toast({ title: "Offer published!", description: "Your offer is now live (deposit waived)." });
          navigate("/dashboard");
        } else {
          setStep(5);
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save offer", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    if (step === 4) {
      await handleSaveOffer();
    }
  };

  const handlePayDeposit = async () => {
    if (!savedOfferId) return;
    setDepositLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-deposit-session", {
        body: { offer_id: savedOfferId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create payment session", variant: "destructive" });
    } finally {
      setDepositLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!savedOfferId) return;
    setLoading(true);
    const { error } = await supabase.from("offers").update({ status: "active" }).eq("id", savedOfferId);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      if (isRestricted) {
        toast({ title: "Offer submitted for review", description: "This category requires approval before going live." });
      } else {
        toast({ title: "Offer published!", description: "Your referral offer is now live." });
      }
      navigate("/dashboard");
    }
  };

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const payoutNum = parseFloat(form.payout) || 0;
  const referrerEarns = form.payoutType === "flat" ? Math.round(payoutNum * 0.9) : payoutNum;
  const platformFee = form.payoutType === "flat" ? Math.round(payoutNum * 0.1) : null;
  const depositAmount = form.payoutType === "percentage" ? (parseFloat(form.maxPayoutCap) || 0) : payoutNum;

  return (
    <div className="py-8">
      <div className="container max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-6 gap-1" asChild>
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
        </Button>

        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Create Referral Offer</h1>
        <p className="text-muted-foreground mb-6">Define what you're willing to pay for successful referrals</p>

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
                <div><Label>Payout Amount</Label><Input type="number" value={form.payout} onChange={(e) => update("payout", e.target.value)} placeholder="500" required className="mt-1" /></div>
                <div>
                  <Label>Payout Type</Label>
                  <div className="mt-1 flex gap-2">
                    <Button type="button" variant={form.payoutType === "flat" ? "default" : "outline"} size="sm" onClick={() => update("payoutType", "flat")} className="flex-1">$ Fixed</Button>
                    <Button type="button" variant={form.payoutType === "percentage" ? "default" : "outline"} size="sm" onClick={() => update("payoutType", "percentage")} className="flex-1">% Percentage</Button>
                  </div>
                </div>
              </div>
              {form.payoutType === "percentage" && (
                <div>
                  <Label>Maximum Payout Cap ($)</Label>
                  <Input type="number" value={form.maxPayoutCap} onChange={(e) => update("maxPayoutCap", e.target.value)} placeholder="e.g. 2000" required className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">This cap determines your deposit amount and the maximum a referrer can earn per deal.</p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                <div><Label>Deal Size Min ($)</Label><Input type="number" value={form.dealSizeMin} onChange={(e) => update("dealSizeMin", e.target.value)} placeholder="5000" className="mt-1" /></div>
                <div><Label>Deal Size Max ($)</Label><Input type="number" value={form.dealSizeMax} onChange={(e) => update("dealSizeMax", e.target.value)} placeholder="50000" className="mt-1" /></div>
                <div><Label>Est. Close Time (days)</Label><Input type="number" value={form.closeTimeDays} onChange={(e) => update("closeTimeDays", e.target.value)} placeholder="30" className="mt-1" /></div>
              </div>
              {payoutNum > 0 && form.payoutType === "flat" && (
                <div className="rounded-2xl border border-border bg-muted/30 p-5">
                  <p className="text-sm font-medium mb-3">Payout Breakdown Preview</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-card border border-border p-3"><p className="text-xs text-muted-foreground">Referral Fee</p><p className="font-display text-lg font-bold">${payoutNum}</p></div>
                    <div className="rounded-xl bg-earnings/10 border border-earnings/20 p-3"><p className="text-xs text-muted-foreground">Referrer Earns</p><p className="font-display text-lg font-bold text-earnings">${referrerEarns}</p></div>
                    <div className="rounded-xl bg-card border border-border p-3"><p className="text-xs text-muted-foreground">Platform Fee</p><p className="font-display text-lg font-bold">${platformFee}</p></div>
                  </div>
                </div>
              )}
              {depositAmount > 0 && !isSuperAdmin && (
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Deposit Required: ${depositAmount}</p>
                    <p className="text-xs text-muted-foreground mt-1">A one-time deposit of 1× {form.payoutType === "percentage" ? "your max payout cap" : "the referral fee"} is required before publishing. This acts as a credit toward future payouts.</p>
                  </div>
                </div>
              )}
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
                    <span className="earnings-badge rounded-full px-4 py-1.5 text-sm font-bold shadow-sm">{form.payoutType === "flat" ? `$${payoutNum || "—"}` : `${payoutNum || "—"}%`}</span>
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
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Deposit: ${depositAmount}</p>
                  <p className="text-xs text-muted-foreground mt-1">After saving, you'll be asked to pay a one-time deposit before your offer goes live.</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h2 className="font-display text-lg font-semibold">Deposit & Publish</h2>
              <p className="text-sm text-muted-foreground">Your offer has been saved as a draft. Pay the deposit to publish it.</p>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${depositStatus === "paid" ? "bg-earnings/10" : "bg-primary/10"}`}>
                    {depositStatus === "paid" ? <CheckCircle2 className="h-6 w-6 text-earnings" /> : <CreditCard className="h-6 w-6 text-primary" />}
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold">${depositAmount}</p>
                    <p className="text-sm text-muted-foreground">One-time publishing deposit</p>
                  </div>
                </div>

                {depositStatus === "paid" ? (
                  <div className="rounded-xl bg-earnings/5 border border-earnings/20 p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-earnings mx-auto mb-2" />
                    <p className="font-display font-bold text-earnings">Deposit Paid!</p>
                    <p className="text-sm text-muted-foreground mt-1">Your deposit has been received. You can now publish your offer.</p>
                  </div>
                ) : depositStatus === "pending" ? (
                  <div className="rounded-xl bg-accent/5 border border-accent/20 p-4 text-center">
                    <Loader2 className="h-8 w-8 text-accent-foreground mx-auto mb-2 animate-spin" />
                    <p className="font-display font-bold text-accent-foreground">Payment Processing...</p>
                    <p className="text-sm text-muted-foreground mt-1">Waiting for payment confirmation. This page will update automatically.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={handlePayDeposit} disabled={depositLoading}>
                      Retry Payment
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">This deposit acts as a credit toward future referral payouts and ensures payout readiness.</p>
                    <Button onClick={handlePayDeposit} disabled={depositLoading} className="w-full gap-2" size="lg">
                      {depositLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating checkout...</> : <><CreditCard className="h-4 w-4" /> Pay ${depositAmount} Deposit</>}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <span>Payments are processed securely via Stripe. Your deposit is credited toward future payouts.</span>
              </div>
            </motion.div>
          )}

          <div className="flex gap-3 pt-2">
            {step > 1 && step < 5 && <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="flex-1">Back</Button>}
            {step < 4 && (
              <Button type="button" onClick={handleNextStep} size="lg" className={`${step > 1 ? "flex-1" : "w-full"} gap-2`} disabled={loading}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {step === 4 && (
              <Button type="button" onClick={handleNextStep} size="lg" className={`${step > 1 ? "flex-1" : "w-full"} gap-2`} disabled={loading || !businessId}>
                {loading ? "Saving..." : "Save & Continue to Deposit"}
              </Button>
            )}
            {step === 5 && depositStatus === "paid" && (
              <Button onClick={handlePublish} size="lg" className="w-full gap-2" disabled={loading}>
                {loading ? "Publishing..." : isRestricted ? "Submit for Review" : "Publish Offer"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOffer;
