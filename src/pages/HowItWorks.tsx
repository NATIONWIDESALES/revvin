import { Search, Users, DollarSign, Building2, ArrowRight, CheckCircle2, MapPin, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HowItWorks = () => {
  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient py-20">
        <div className="container text-center">
          <h1 className="font-display text-4xl font-bold text-primary-foreground md:text-5xl">
            How Revvin Works
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/70 max-w-2xl mx-auto">
            Whether you're a business looking for customers or someone who wants to earn by referring — here's how it all comes together.
          </p>
        </div>
      </section>

      {/* For Referrers */}
      <section className="py-20">
        <div className="container max-w-4xl">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">For Referrers</h2>
          <p className="text-muted-foreground mb-10">Students, sales pros, realtors, consultants — anyone with a network can earn.</p>
          <div className="space-y-6">
            {[
              { icon: Search, title: "Browse the Marketplace", desc: "Explore referral opportunities across industries. Filter by location, payout, category, or use our interactive map view to find deals near you." },
              { icon: Users, title: "Submit Referrals", desc: "Know someone who needs the service? Submit their contact details, notes, and optional files. Track everything from your dashboard." },
              { icon: DollarSign, title: "Earn Commissions", desc: "When your referral converts into a closed deal, your commission is approved. Track pending and paid earnings, earn badges, and climb leaderboards." },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 rounded-xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <item.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Businesses */}
      <section className="border-t border-border bg-muted/50 py-20">
        <div className="container max-w-4xl">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">For Businesses</h2>
          <p className="text-muted-foreground mb-10">Get qualified leads from motivated referrers. Pay only for results.</p>
          <div className="space-y-6">
            {[
              { icon: Building2, title: "Create Your Profile & Offers", desc: "Set up your business profile, list your services, and define your referral payout structure — flat fee or percentage." },
              { icon: CheckCircle2, title: "Receive & Manage Referrals", desc: "Get referral submissions in your dashboard. Review leads, mark deals as won or lost, and approve payouts." },
              { icon: TrendingUp, title: "Track ROI & Analytics", desc: "See your conversion rates, total cost of acquisition, and ROI. Only pay commissions when deals close — no upfront costs." },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 rounded-xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <item.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Economics */}
      <section className="py-20">
        <div className="container max-w-3xl text-center">
          <Shield className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h2 className="font-display text-3xl font-bold text-foreground">Platform Economics</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed mb-8">
            Revvin charges a small management fee only on successful referral payouts. Businesses control their acquisition cost. Referrers keep the majority.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="font-display text-3xl font-bold text-primary">$0</div>
              <p className="text-sm text-muted-foreground mt-1">Upfront cost to list</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="font-display text-3xl font-bold text-earnings">85%</div>
              <p className="text-sm text-muted-foreground mt-1">Goes to the referrer</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="font-display text-3xl font-bold text-accent">15%</div>
              <p className="text-sm text-muted-foreground mt-1">Platform fee</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/50 py-20">
        <div className="container text-center">
          <h2 className="font-display text-3xl font-bold text-foreground">Ready to Get Started?</h2>
          <p className="mt-3 text-muted-foreground">Join thousands already earning on Revvin</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button size="lg" className="gap-2" asChild>
              <Link to="/auth?mode=signup&role=referrer">Start Earning <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth?mode=signup&role=business">List Your Business</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;
