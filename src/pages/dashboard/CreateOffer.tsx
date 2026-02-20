import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, DollarSign, Clock, MapPin, Shield, BadgeCheck, Building2, Wallet, CheckCircle2 } from "lucide-react";
import { categories } from "@/data/mockOffers";
import { motion } from "framer-motion";
import { useWallet } from "@/contexts/WalletContext";

const CreateOffer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { wallet, addFunds, canCoverPayout } = useWallet();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [fundedThisSession, setFundedThisSession] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Services",
    payout: "",
    payoutType: "flat" as "flat" | "percentage",
    location: "",
    dealSizeMin: "",
    dealSizeMax: "",
    closeTimeDays: "",
    remoteEligible: false,
    qualificationCriteria: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("businesses").select("id, name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setBusinessId(data.id);
        setBusinessName(data.name);
      }
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    if (!businessId) return;
    setLoading(true);

    const { error } = await supabase.from("offers").insert({
      business_id: businessId,
      title: form.title,
      description: form.description,
      category: form.category,
      payout: parseFloat(form.payout),
      payout_type: form.payoutType,
      location: form.location,
      deal_size_min: form.dealSizeMin ? parseFloat(form.dealSizeMin) : null,
      deal_size_max: form.dealSizeMax ? parseFloat(form.dealSizeMax) : null,
      close_time_days: form.closeTimeDays ? parseInt(form.closeTimeDays) : null,
      remote_eligible: form.remoteEligible,
      qualification_criteria: form.qualificationCriteria || null,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Offer created!", description: "Your referral offer is now live." });
      navigate("/dashboard");
    }
  };

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const payoutNum = parseFloat(form.payout) || 0;
  const referrerEarns = form.payoutType === "flat" ? Math.round(payoutNum * 0.9) : payoutNum;
  const platformFee = form.payoutType === "flat" ? Math.round(payoutNum * 0.1) : null;
  const fundSecured = payoutNum > 0 && canCoverPayout(payoutNum);

  const handleAddFunds = (amount: number) => {
    addFunds(amount);
    setFundedThisSession(true);
    toast({ title: `$${amount} added`, description: "Funds added to your Revvin Wallet." });
  };

  return (
    <div className="py-8">
      <div className="container max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-6 gap-1" asChild>
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
        </Button>

        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Create Referral Offer</h1>
        <p className="text-muted-foreground mb-6">Define what you're willing to pay for successful referrals</p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {["Offer Details", "Payout & Timing", "Fund Wallet", "Preview & Publish"].map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                i + 1 <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${i + 1 <= step ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
              {i < 3 && <div className={`h-0.5 flex-1 rounded ${i + 1 < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <Label>Offer Title</Label>
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Home Solar Installation" required className="mt-1" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the service and what kind of leads you're looking for..." rows={4} className="mt-1" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Category</Label>
                  <select value={form.category} onChange={(e) => update("category", e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    {categories.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Service Location</Label>
                  <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Los Angeles, CA" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Qualification Criteria (optional)</Label>
                <Textarea value={form.qualificationCriteria} onChange={(e) => update("qualificationCriteria", e.target.value)} placeholder="What makes a qualified lead?" rows={3} className="mt-1" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remote" checked={form.remoteEligible} onChange={(e) => update("remoteEligible", e.target.checked)} className="rounded" />
                <Label htmlFor="remote" className="cursor-pointer">Remote eligible (referrers from anywhere can participate)</Label>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Payout Amount</Label>
                  <Input type="number" value={form.payout} onChange={(e) => update("payout", e.target.value)} placeholder="500" required className="mt-1" />
                </div>
                <div>
                  <Label>Payout Type</Label>
                  <div className="mt-1 flex gap-2">
                    <Button type="button" variant={form.payoutType === "flat" ? "default" : "outline"} size="sm" onClick={() => update("payoutType", "flat")} className="flex-1">
                      $ Fixed
                    </Button>
                    <Button type="button" variant={form.payoutType === "percentage" ? "default" : "outline"} size="sm" onClick={() => update("payoutType", "percentage")} className="flex-1">
                      % Percentage
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Deal Size Min ($)</Label>
                  <Input type="number" value={form.dealSizeMin} onChange={(e) => update("dealSizeMin", e.target.value)} placeholder="5000" className="mt-1" />
                </div>
                <div>
                  <Label>Deal Size Max ($)</Label>
                  <Input type="number" value={form.dealSizeMax} onChange={(e) => update("dealSizeMax", e.target.value)} placeholder="50000" className="mt-1" />
                </div>
                <div>
                  <Label>Est. Close Time (days)</Label>
                  <Input type="number" value={form.closeTimeDays} onChange={(e) => update("closeTimeDays", e.target.value)} placeholder="30" className="mt-1" />
                </div>
              </div>

              {/* Live payout breakdown */}
              {payoutNum > 0 && form.payoutType === "flat" && (
                <div className="rounded-2xl border border-border bg-muted/30 p-5">
                  <p className="text-sm font-medium mb-3">Payout Breakdown Preview</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-card border border-border p-3">
                      <p className="text-xs text-muted-foreground">Referral Fee</p>
                      <p className="font-display text-lg font-bold">${payoutNum}</p>
                    </div>
                    <div className="rounded-xl bg-earnings/10 border border-earnings/20 p-3">
                      <p className="text-xs text-muted-foreground">Referrer Earns</p>
                      <p className="font-display text-lg font-bold text-earnings">${referrerEarns}</p>
                    </div>
                    <div className="rounded-xl bg-card border border-border p-3">
                      <p className="text-xs text-muted-foreground">Platform Fee</p>
                      <p className="font-display text-lg font-bold">${platformFee}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold">Fund Your Revvin Wallet</h3>
                    <p className="text-sm text-muted-foreground">Pre-fund your wallet so referrers see the "Funds Secured" badge on your offer.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl bg-muted/50 border border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
                    <p className="font-display text-2xl font-bold text-foreground">${wallet.available.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-earnings/5 border border-earnings/20 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Covers Payouts</p>
                    <p className="font-display text-2xl font-bold text-earnings">
                      {payoutNum > 0 ? Math.floor(wallet.available / payoutNum) : "—"}
                    </p>
                  </div>
                </div>

                <p className="text-sm font-medium text-foreground mb-3">Quick Add Funds</p>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[250, 500, 1000, 2500].map((amt) => (
                    <Button key={amt} type="button" variant="outline" className="font-bold" onClick={() => handleAddFunds(amt)}>
                      +${amt.toLocaleString()}
                    </Button>
                  ))}
                </div>

                {fundSecured ? (
                  <div className="flex items-center gap-2 text-sm text-earnings bg-earnings/5 border border-earnings/20 rounded-xl p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span><strong>Funds Secured</strong> — your offer will display the trust badge to referrers.</span>
                  </div>
                ) : payoutNum > 0 ? (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                    <Shield className="h-4 w-4 shrink-0" />
                    <span>Add at least <strong>${payoutNum.toLocaleString()}</strong> to enable the "Funds Secured" badge.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
                    <Shield className="h-4 w-4 shrink-0" />
                    <span>Set a payout amount in the previous step to calculate required funding.</span>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3">Processing fees may apply. Funds are held securely and only reserved when you accept a referral.</p>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <p className="text-sm text-muted-foreground">Here's how your offer will appear to referrers in the marketplace:</p>
              
              {/* Listing Preview Card */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-xl">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold">{form.title || "Offer Title"}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      {businessName || "Your Business"} <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{form.description || "Offer description will appear here..."}</p>
                <div className="rounded-xl bg-earnings/5 border border-earnings/20 p-4 mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-earnings uppercase tracking-wide">Earn per referral</span>
                    <span className="earnings-badge rounded-full px-4 py-1.5 text-sm font-bold shadow-sm">
                      {form.payoutType === "flat" ? `$${payoutNum || "—"}` : `${payoutNum || "—"}%`}
                    </span>
                  </div>
                  {form.dealSizeMin && form.dealSizeMax && (
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Avg deal size</span>
                      <span className="font-medium">${Number(form.dealSizeMin).toLocaleString()} – ${Number(form.dealSizeMax).toLocaleString()}</span>
                    </div>
                  )}
                  {form.closeTimeDays && (
                    <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Payout timeline</span>
                      <span className="font-medium">~{form.closeTimeDays} days</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {form.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {form.location}</span>}
                  <span className="flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5 text-primary" /> Verified</span>
                  {fundSecured && <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-earnings" /> Funds Secured</span>}
                  <Badge variant="outline" className="text-xs">{form.category}</Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <span>Your offer will be visible to all referrers on the marketplace once published.</span>
              </div>
            </motion.div>
          )}

          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                Back
              </Button>
            )}
            <Button type="submit" size="lg" className={`${step > 1 ? "flex-1" : "w-full"} gap-2`} disabled={loading}>
              {loading ? "Publishing..." : step < 4 ? <>Next <ArrowRight className="h-4 w-4" /></> : "Publish Offer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOffer;
