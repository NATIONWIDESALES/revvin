import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Star, TrendingUp, Users, DollarSign, CheckCircle2, Clock, Shield, Upload, Briefcase } from "lucide-react";
import { mockOffers } from "@/data/mockOffers";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
  const [submitted, setSubmitted] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({ title: "Referral Submitted!", description: "You'll be notified when the business reviews it." });
  };

  const referrerEarns = offer.payoutType === "flat"
    ? Math.round(offer.payout * 0.9)
    : offer.payout;
  const platformFee = offer.payoutType === "flat"
    ? Math.round(offer.payout * 0.1)
    : null;

  return (
    <div className="py-8">
      <div className="container max-w-5xl">
        <Button variant="ghost" size="sm" className="mb-6 gap-1" asChild>
          <Link to="/browse">
            <ArrowLeft className="h-4 w-4" /> Back to Marketplace
          </Link>
        </Button>

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
                <p className="text-muted-foreground mt-1">{offer.business}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{offer.category}</Badge>
                  {offer.featured && <Badge className="bg-accent text-accent-foreground">Featured</Badge>}
                  {offer.remoteEligible && <Badge variant="secondary">Remote Eligible</Badge>}
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
                    {offer.payoutType === "flat" ? `$${offer.payout}` : `${offer.payout}%`}
                  </div>
                  <div className="text-xs text-muted-foreground">Per Referral</div>
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
                  <p className="text-lg font-display font-bold">${offer.dealSizeMin.toLocaleString()} – ${offer.dealSizeMax.toLocaleString()}</p>
                </div>
              )}
              {offer.closeTimeDays && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Typical Close Time</span>
                  </div>
                  <p className="text-lg font-display font-bold">{offer.closeTimeDays} days</p>
                </div>
              )}
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
                <p className="text-lg font-display font-bold text-primary">Verified Business</p>
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
                    <p className="font-display text-xl font-bold">${offer.payout}</p>
                  </div>
                  <div className="rounded-xl bg-earnings/10 border border-earnings/20 p-4">
                    <p className="text-xs text-muted-foreground mb-1">You Earn</p>
                    <p className="font-display text-xl font-bold text-earnings">${referrerEarns}</p>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-4">
                    <p className="text-xs text-muted-foreground mb-1">Platform Fee</p>
                    <p className="font-display text-xl font-bold">${platformFee}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* How it works */}
            <motion.div variants={fadeUp} custom={5}>
              <h2 className="font-display text-lg font-semibold mb-4">How This Referral Works</h2>
              <div className="space-y-3">
                {[
                  "Submit the referral using the form with contact details",
                  `${offer.business} reviews and reaches out to your lead`,
                  "If the deal closes, your commission is approved automatically",
                  `You earn ${offer.payoutType === "flat" ? `$${referrerEarns}` : `${offer.payout}%`} paid directly to your account`,
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
          </motion.div>

          {/* Referral Form Sidebar */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-lg">
              <div className="mb-5 text-center">
                <div className="earnings-badge mx-auto mb-3 inline-block rounded-full px-5 py-2.5 text-lg font-bold shadow-md">
                  Earn {offer.payoutType === "flat" ? `$${referrerEarns}` : `${offer.payout}%`}
                </div>
                <p className="text-sm text-muted-foreground">per successful referral</p>
              </div>

              {submitted ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-earnings/10">
                    <CheckCircle2 className="h-8 w-8 text-earnings" />
                  </div>
                  <h3 className="font-display text-xl font-bold">Referral Submitted!</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    We'll notify you when {offer.business} reviews it. Track the status in your dashboard.
                  </p>

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
                    <Button variant="outline" className="flex-1" onClick={() => setSubmitted(false)}>
                      Submit Another
                    </Button>
                    <Button className="flex-1" asChild>
                      <Link to="/dashboard">View Dashboard</Link>
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
                  <Button type="submit" className="w-full h-11 font-semibold" size="lg">
                    Submit Referral
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
