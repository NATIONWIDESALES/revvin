import { Search, Users, DollarSign, Building2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HowItWorks = () => {
  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient py-20">
        <div className="container text-center">
          <h1 className="font-display text-4xl font-bold text-primary-foreground md:text-5xl">
            How RefBoard Works
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/70 max-w-2xl mx-auto">
            Whether you're a business looking for leads or someone who wants to earn by sharing, here's how it all comes together.
          </p>
        </div>
      </section>

      {/* For Referrers */}
      <section className="py-20">
        <div className="container max-w-4xl">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">For Referrers</h2>
          <p className="text-muted-foreground mb-10">Earn commissions by connecting businesses with potential customers.</p>
          <div className="space-y-6">
            {[
              { icon: Search, title: "Browse Opportunities", desc: "Explore hundreds of referral programs from verified businesses. Filter by industry, payout, and location." },
              { icon: Users, title: "Submit Referrals", desc: "Know someone who needs the service? Fill out a simple form with their contact details and any relevant notes." },
              { icon: DollarSign, title: "Earn Commissions", desc: "When your referral converts into a sale, you earn a commission. Track everything in your dashboard." },
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
          <p className="text-muted-foreground mb-10">Get qualified leads from a network of motivated referrers. Pay only for results.</p>
          <div className="space-y-6">
            {[
              { icon: Building2, title: "Create Your Profile", desc: "Set up your business profile, list your services, and define your referral payout structure." },
              { icon: CheckCircle2, title: "Receive & Review Referrals", desc: "Get referral submissions directly in your dashboard. Review leads and mark deals as won or lost." },
              { icon: DollarSign, title: "Pay on Success", desc: "Only pay commissions when deals close. No upfront fees — just results-based payouts." },
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

      {/* CTA */}
      <section className="py-20">
        <div className="container text-center">
          <h2 className="font-display text-3xl font-bold text-foreground">Ready to Get Started?</h2>
          <p className="mt-3 text-muted-foreground">Join thousands already earning on RefBoard</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button size="lg" className="gap-2" asChild>
              <Link to="/browse">Start Earning <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/">List Your Business</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;
