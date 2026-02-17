import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Star, TrendingUp, Users, DollarSign, CheckCircle2 } from "lucide-react";
import { mockOffers } from "@/data/mockOffers";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const OfferDetail = () => {
  const { id } = useParams();
  const offer = mockOffers.find((o) => o.id === id);
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

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

  return (
    <div className="py-8">
      <div className="container max-w-4xl">
        <Button variant="ghost" size="sm" className="mb-6 gap-1" asChild>
          <Link to="/browse">
            <ArrowLeft className="h-4 w-4" /> Back to Browse
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Details */}
          <div className="lg:col-span-3">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl">
                {offer.businessLogo}
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">{offer.title}</h1>
                <p className="text-muted-foreground">{offer.business}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{offer.category}</Badge>
                  {offer.featured && <Badge>Featured</Badge>}
                </div>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-border bg-muted/50 p-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="text-center">
                  <DollarSign className="mx-auto mb-1 h-5 w-5 text-earnings" />
                  <div className="font-display text-xl font-bold text-foreground">
                    {offer.payoutType === "flat" ? `$${offer.payout}` : `${offer.payout}%`}
                  </div>
                  <div className="text-xs text-muted-foreground">Per Referral</div>
                </div>
                <div className="text-center">
                  <Star className="mx-auto mb-1 h-5 w-5 text-accent" />
                  <div className="font-display text-xl font-bold text-foreground">{offer.rating}</div>
                  <div className="text-xs text-muted-foreground">Rating</div>
                </div>
                <div className="text-center">
                  <Users className="mx-auto mb-1 h-5 w-5 text-primary" />
                  <div className="font-display text-xl font-bold text-foreground">{offer.totalReferrals}</div>
                  <div className="text-xs text-muted-foreground">Referrals</div>
                </div>
                <div className="text-center">
                  <TrendingUp className="mx-auto mb-1 h-5 w-5 text-primary" />
                  <div className="font-display text-xl font-bold text-foreground">{offer.successRate}%</div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="font-display text-lg font-semibold mb-2">About This Opportunity</h2>
              <p className="text-muted-foreground leading-relaxed">{offer.description}</p>
            </div>

            <div className="mb-6">
              <h2 className="font-display text-lg font-semibold mb-2">Location</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /> {offer.location}
              </div>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold mb-3">How It Works</h2>
              <div className="space-y-3">
                {[
                  "Submit a referral with contact details below",
                  "The business reviews and reaches out to your lead",
                  "If the deal closes, your commission is approved",
                  "Get paid directly to your account",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p className="text-sm text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Referral Form */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 text-center">
                <div className="earnings-badge mx-auto mb-2 inline-block rounded-full px-4 py-2 text-lg font-bold">
                  Earn {offer.payoutType === "flat" ? `$${offer.payout}` : `${offer.payout}%`}
                </div>
                <p className="text-sm text-muted-foreground">per successful referral</p>
              </div>

              {submitted ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-earnings" />
                  <h3 className="font-display text-lg font-semibold">Referral Submitted!</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We'll notify you when the business reviews it.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => setSubmitted(false)}>
                    Submit Another
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Lead's Full Name</label>
                    <Input placeholder="John Doe" required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Lead's Email</label>
                    <Input type="email" placeholder="john@example.com" required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Lead's Phone</label>
                    <Input type="tel" placeholder="(555) 123-4567" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Notes</label>
                    <Textarea placeholder="Any context about this referral..." rows={3} />
                  </div>
                  <Button type="submit" className="w-full" size="lg">
                    Submit Referral
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    By submitting, you agree to our referral terms
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
