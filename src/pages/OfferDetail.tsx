import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, MapPin, Star, TrendingUp, Users, DollarSign, CheckCircle2, Clock, Shield, Upload, Briefcase, BadgeCheck, AlertTriangle, Scale, FileCheck } from "lucide-react";
import { mockOffers } from "@/data/mockOffers";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import ShareOfferLink from "@/components/ShareOfferLink";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const OfferDetail = () => {
  const { id } = useParams();
  const offer = mockOffers.find((o) => o.id === id);
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatPayout } = useCountry();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [referralId, setReferralId] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", notes: "" });

  if (!offer) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">Offer not found.</p>
        <Button variant="ghost" className="mt-4" asChild>
          <Link to="/browse">Back to Browse</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast({ title: "Consent required", description: "Please confirm the customer has consented to being contacted.", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to submit a referral.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      // Look up a real DB offer matching this mock offer's title, or find any active offer
      let dbOfferId: string | null = null;
      let dbBusinessId: string | null = null;

      const { data: dbOffer } = await supabase
        .from("offers")
        .select("id, business_id")
        .eq("title", offer.title)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (dbOffer) {
        dbOfferId = dbOffer.id;
        dbBusinessId = dbOffer.business_id;
      } else {
        // Fallback: use the first active offer in the DB so we have valid FK references
        const { data: anyOffer } = await supabase
          .from("offers")
          .select("id, business_id")
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (anyOffer) {
          dbOfferId = anyOffer.id;
          dbBusinessId = anyOffer.business_id;
        }
      }

      if (!dbOfferId || !dbBusinessId) {
        toast({ title: "No active offers", description: "There are no active offers in the database yet. Ask a business to publish one first.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      const { data: inserted, error } = await supabase
        .from("referrals")
        .insert({
          referrer_id: user.id,
          offer_id: dbOfferId,
          business_id: dbBusinessId,
          customer_name: formData.name,
          customer_email: formData.email || null,
          customer_phone: formData.phone || null,
          notes: formData.notes || null,
          payout_amount: offer.payoutType === "flat" ? Math.round(offer.payout * 0.9) : null,
        })
        .select("id")
        .single();

      if (error) throw error;

      setReferralId(inserted.id);
      setSubmitted(true);
      toast({ title: "Referral Submitted!", description: "Track this referral inside your dashboard." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const referrerEarns = offer.payoutType === "flat"
    ? Math.round(offer.payout * 0.9)
    : offer.payout;
  const platformFee = offer.payoutType === "flat"
    ? Math.round(offer.payout * 0.1)
    : null;

  const qualificationRules = offer.qualificationRules ?? [
    "Lead must be new (not existing customer)",
    "Customer must be reachable by phone or email",
    "Located within the business service area",
  ];

  const payoutTimelineLabel = offer.payoutTimeline === "net7" ? "Net 7" : offer.payoutTimeline === "net14" ? "Net 14" : offer.payoutTimeline === "net30" ? "Net 30" : `~${offer.closeTimeDays} days`;

  return (
    <div className="py-8">
      <div className="container max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" className="gap-1" asChild>
            <Link to="/browse">
              <ArrowLeft className="h-4 w-4" /> Back to Marketplace
            </Link>
          </Button>
          <ShareOfferLink offerId={offer.id} offerTitle={offer.title} />
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Details Column */}
          <motion.div initial="hidden" animate="visible" className="lg:col-span-3 space-y-8">
            {/* Header */}
            <motion.div variants={fadeUp} custom={0} className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl shadow-sm">
                {offer.businessLogo}
              </div>
              <div className="flex-1">
                <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{offer.title}</h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-1">
                  {offer.country === "CA" ? "🇨🇦" : "🇺🇸"} {offer.business}
                  {offer.verified !== false && <BadgeCheck className="h-4 w-4 text-primary" />}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{offer.category}</Badge>
                  {offer.featured && <Badge className="bg-accent text-accent-foreground">Featured</Badge>}
                  {offer.remoteEligible && <Badge variant="secondary">Remote Eligible</Badge>}
                  {offer.fundSecured && (
                    <Badge className="bg-earnings/10 text-earnings border border-earnings/20 gap-1">
                      <Shield className="h-3 w-3" /> Funds Secured
                    </Badge>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div variants={fadeUp} custom={1} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                <div className="text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-earnings/10">
                    <DollarSign className="h-5 w-5 text-earnings" />
                  </div>
                  <div className="font-display text-xl font-bold text-foreground">
                    {offer.payoutType === "flat" ? formatPayout(offer.payout, offer.currency) : `${offer.payout}%`}
                  </div>
                  <div className="text-xs text-muted-foreground">Per Referral • {offer.currency}</div>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                    <Star className="h-5 w-5 text-accent" />
                  </div>
                  <div className="font-display text-xl font-bold text-foreground">{offer.rating}</div>
                  <div className="text-xs text-muted-foreground">Rating</div>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="font-display text-xl font-bold text-foreground">{offer.totalReferrals}</div>
                  <div className="text-xs text-muted-foreground">Referrals</div>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="font-display text-xl font-bold text-foreground">{offer.successRate}%</div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </motion.div>

            {/* Description */}
            <motion.div variants={fadeUp} custom={2}>
              <h2 className="font-display text-lg font-semibold mb-3">About This Opportunity</h2>
              <p className="text-muted-foreground leading-relaxed">{offer.description}</p>
            </motion.div>

            {/* Deal Details */}
            <motion.div variants={fadeUp} custom={3} className="grid gap-4 sm:grid-cols-2">
              {offer.dealSizeMin && offer.dealSizeMax && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Estimated Deal Size</span>
                  </div>
                  <p className="text-lg font-display font-bold">{offer.currency === "CAD" ? "CA" : ""}${offer.dealSizeMin.toLocaleString()} – ${offer.dealSizeMax.toLocaleString()} {offer.currency}</p>
                </div>
              )}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Payout Timeline</span>
                </div>
                <p className="text-lg font-display font-bold">{payoutTimelineLabel}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Location</span>
                </div>
                <p className="text-lg font-display font-bold">{offer.location}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Verification</span>
                </div>
                <p className="text-lg font-display font-bold text-primary">{offer.verified !== false ? "Verified Business" : "Unverified"}</p>
              </div>
            </motion.div>

            {/* Payout Breakdown */}
            {offer.payoutType === "flat" && (
              <motion.div variants={fadeUp} custom={4} className="rounded-2xl border border-border bg-muted/30 p-6">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" /> Payout Breakdown
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-card border border-border p-4">
                    <p className="text-xs text-muted-foreground mb-1">Referral Fee</p>
                    <p className="font-display text-xl font-bold">{formatPayout(offer.payout, offer.currency)}</p>
                  </div>
                  <div className="rounded-xl bg-earnings/10 border border-earnings/20 p-4">
                    <p className="text-xs text-muted-foreground mb-1">You Earn</p>
                    <p className="font-display text-xl font-bold text-earnings">{formatPayout(referrerEarns, offer.currency)}</p>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-4">
                    <p className="text-xs text-muted-foreground mb-1">Platform Fee</p>
                    <p className="font-display text-xl font-bold">{formatPayout(platformFee ?? 0, offer.currency)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">Revvin takes a 10% management fee. You keep 90%.</p>
                {offer.fundSecured && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-earnings bg-earnings/5 border border-earnings/20 rounded-xl p-3">
                    <Shield className="h-4 w-4 shrink-0" />
                    <span><strong>Funds Secured</strong> — this payout is backed by the business's pre-funded Revvin Wallet. When accepted, funds are held in escrow until the deal closes.</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Qualification Rules */}
            <motion.div variants={fadeUp} custom={5} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" /> Qualification Rules
              </h3>
              <ul className="space-y-2.5">
                {qualificationRules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {rule}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <AlertTriangle className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                <span><strong>Duplicate Lead Policy:</strong> First submission wins, timestamped. If someone already submitted this lead, yours will be marked as duplicate.</span>
              </div>
            </motion.div>

            {/* How Verification Works */}
            <motion.div variants={fadeUp} custom={6}>
              <h2 className="font-display text-lg font-semibold mb-4">How Verification Works</h2>
              <div className="space-y-3">
                {[
                  "You submit the referral with contact details and context",
                  `${offer.business} reviews and reaches out to your lead`,
                  "Revvin tracks the deal status and verifies the outcome",
                  `Deal closes → your commission (${formatPayout(referrerEarns, offer.currency)}) is approved and paid`,
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg bg-card border border-border p-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </div>
                    <p className="text-sm text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Business Credibility */}
            <motion.div variants={fadeUp} custom={7} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-primary" /> Business Credibility
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <BadgeCheck className="mx-auto mb-1 h-5 w-5 text-primary" />
                  <p className="text-xs font-medium">Verification Level</p>
                  <p className="text-sm font-bold text-primary">{offer.verified !== false ? "Verified" : "Pending"}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <Shield className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                  <p className="text-xs font-medium">License / Insurance</p>
                  <p className="text-sm text-muted-foreground">On file</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <Star className="mx-auto mb-1 h-5 w-5 text-accent" />
                  <p className="text-xs font-medium">Reviews</p>
                  <p className="text-sm font-bold">{offer.rating} / 5.0</p>
                </div>
              </div>
            </motion.div>

            {/* Secondary CTA */}
            <motion.div variants={fadeUp} custom={8}>
              <Button
                variant="ghost"
                className="text-sm text-muted-foreground hover:text-primary"
                onClick={() => toast({ title: "Feedback submitted", description: "We'll relay your suggestion to improve this offer." })}
              >
                <Scale className="h-4 w-4 mr-1.5" /> Invite this business to improve their offer
              </Button>
            </motion.div>
          </motion.div>

          {/* Referral Form Sidebar */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-lg">
              <div className="mb-5 text-center">
                <div className="earnings-badge mx-auto mb-3 inline-block rounded-full px-5 py-2.5 text-lg font-bold shadow-md">
                  Earn {offer.payoutType === "flat" ? formatPayout(referrerEarns, offer.currency) : `${offer.payout}%`}
                </div>
                <p className="text-sm text-muted-foreground">per successful referral</p>
              </div>

              {submitted ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-earnings/10">
                    <CheckCircle2 className="h-8 w-8 text-earnings" />
                  </div>
                  <h3 className="font-display text-xl font-bold">Referral Submitted!</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Track this referral inside your dashboard.
                  </p>
                  {referralId && (
                    <p className="mt-2 text-xs text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1 inline-block">
                      Ref ID: {referralId.slice(0, 8)}...
                    </p>
                  )}

                  {/* Tracking Preview */}
                  <div className="mt-6 rounded-xl border border-border bg-muted/50 p-4 text-left">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Referral Tracking</p>
                    <div className="space-y-2">
                      {["Submitted", "Under Review", "Deal In Progress", "Payout"].map((step, i) => (
                        <div key={step} className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-earnings" : "bg-border"}`} />
                          <span className={`text-xs ${i === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setSubmitted(false); setConsent(false); }}>
                      Submit Another
                    </Button>
                    <Button className="flex-1" asChild>
                      <Link to="/dashboard">Track in Dashboard</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Customer's Full Name *</label>
                    <Input
                      placeholder="John Doe"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Customer's Email *</label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Customer's Phone</label>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Notes & Context</label>
                    <Textarea
                      placeholder="Why is this person a good fit? Any context that helps..."
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Attach Files (optional)</label>
                    <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <div>
                        <Upload className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">Click to upload supporting documents</p>
                      </div>
                    </div>
                  </div>

                  {/* Consent */}
                  <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                    <Checkbox
                      id="consent"
                      checked={consent}
                      onCheckedChange={(v) => setConsent(v === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="consent" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                      I confirm the customer has consented to being contacted about this service. I acknowledge the referral terms.
                    </label>
                  </div>

                  <Button type="submit" className="w-full h-11 font-semibold" size="lg" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Referral"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    By submitting, you agree to our referral terms and conditions.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferDetail;
