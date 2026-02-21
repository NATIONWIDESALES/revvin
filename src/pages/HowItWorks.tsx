import { Search, Users, DollarSign, Building2, ArrowRight, CheckCircle2, TrendingUp, Shield, Briefcase, Zap, MapPin, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const HowItWorks = () => {
  return (
    <div>
      <SEOHead title="How Revvin Works" description="Learn how businesses and referrers use Revvin for pay-per-close customer acquisition. Three simple steps to real outcomes." path="/how-it-works" />
      {/* Hero */}
      <section className="hero-gradient py-24">
        <div className="container text-center">
          <motion.div initial="hidden" animate="visible">
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary-foreground/60 uppercase tracking-wider mb-4">Understanding Revvin</motion.p>
            <motion.h1 variants={fadeUp} custom={1} className="font-display text-4xl font-bold text-primary-foreground md:text-5xl lg:text-6xl">
              How Revvin Works
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-primary-foreground/70 max-w-2xl mx-auto leading-relaxed">
              A transparent, performance-based marketplace that connects businesses seeking customers with individuals who can make trusted introductions.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* For Referrers */}
      <section className="py-24">
        <div className="container max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="mb-4">
              <Badge className="bg-earnings/10 text-earnings border-earnings/20 px-3 py-1">For Referrers</Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl font-bold text-foreground mb-3 md:text-4xl">Earn Money From Your Network</motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground mb-10 max-w-2xl">Students, consultants, realtors, sales pros — anyone with connections can earn commissions for successful introductions.</motion.p>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { icon: Search, title: "Browse the Marketplace", desc: "Explore referral offers by industry, location, payout, or use the interactive map. Filter by commission type and remote eligibility.", features: ["Map & list views", "Advanced filters", "Save favorites"] },
                { icon: Users, title: "Submit Referrals", desc: "Know someone who needs the service? Submit their details with notes and context. Track every step from your dashboard.", features: ["Secure submission", "File attachments", "Real-time tracking"] },
                { icon: DollarSign, title: "Get Paid", desc: "When your referral converts into a closed deal, your commission is approved and paid. Track pending and lifetime earnings.", features: ["Transparent payouts", "Earnings dashboard", "Achievement badges"] },
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} custom={i + 3} className="rounded-2xl border border-border bg-card p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-earnings/10">
                    <item.icon className="h-5 w-5 text-earnings" />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{item.desc}</p>
                  <ul className="space-y-2">
                    {item.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-earnings shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* For Businesses */}
      <section className="border-y border-border bg-muted/30 py-24">
        <div className="container max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="mb-4">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">For Businesses</Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl font-bold text-foreground mb-3 md:text-4xl">Acquire Customers on Performance</motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground mb-10 max-w-2xl">Set your own referral fees. Get qualified leads from real people. Only pay when deals close — zero upfront costs.</motion.p>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { icon: Building2, title: "Create Offers", desc: "Set up your business profile, define services, and publish referral offers with custom payout structures.", features: ["Custom payouts", "Category targeting", "Logo & branding"] },
                { icon: CheckCircle2, title: "Manage Referrals", desc: "Receive lead submissions in your dashboard. Review details, update statuses, and approve payouts when deals close.", features: ["Lead management", "Status tracking", "Team notifications"] },
                { icon: BarChart3, title: "Track ROI", desc: "See conversion rates, cost per acquisition, and total ROI. Make data-driven decisions about your referral programs.", features: ["Analytics dashboard", "Conversion metrics", "Spend tracking"] },
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} custom={i + 3} className="rounded-2xl border border-border bg-card p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{item.desc}</p>
                  <ul className="space-y-2">
                    {item.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Platform Economics */}
      <section className="py-24">
        <div className="container max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center">
            <motion.div variants={fadeUp} custom={0}>
              <Briefcase className="mx-auto mb-4 h-10 w-10 text-primary" />
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl font-bold text-foreground md:text-4xl">Platform Economics</motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-3 text-muted-foreground leading-relaxed mb-10 max-w-xl mx-auto">
              Revvin charges a small management fee only on successful referral payouts. Transparent, fair, and aligned with everyone's success.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="rounded-2xl border border-border bg-card p-8 shadow-sm mb-8">
              <p className="text-sm text-muted-foreground mb-2">Example: $2,000 Referral Fee</p>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="rounded-xl bg-muted/50 border border-border p-5">
                  <Building2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <div className="font-display text-3xl font-bold text-foreground">$2,000</div>
                  <p className="text-xs text-muted-foreground mt-1">Business pays</p>
                </div>
                <div className="rounded-xl bg-earnings/10 border border-earnings/20 p-5">
                  <Users className="mx-auto mb-2 h-6 w-6 text-earnings" />
                  <div className="font-display text-3xl font-bold text-earnings">$1,800</div>
                  <p className="text-xs text-muted-foreground mt-1">Referrer earns (90%)</p>
                </div>
                <div className="rounded-xl bg-muted/50 border border-border p-5">
                  <Briefcase className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <div className="font-display text-3xl font-bold text-foreground">$200</div>
                  <p className="text-xs text-muted-foreground mt-1">Platform fee (10%)</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span>Business pays nothing until the deal closes</span>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} custom={4} className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="font-display text-3xl font-bold text-primary">$0</div>
                <p className="text-sm text-muted-foreground mt-1">Upfront cost to list</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="font-display text-3xl font-bold text-earnings">90%</div>
                <p className="text-sm text-muted-foreground mt-1">Goes to the referrer</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="font-display text-3xl font-bold text-foreground">10%</div>
                <p className="text-sm text-muted-foreground mt-1">Platform fee</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30 py-24">
        <div className="container text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold text-foreground md:text-4xl">Ready to Get Started?</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-3 text-muted-foreground text-lg">Join thousands already earning and growing on Revvin</motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8 flex justify-center gap-4">
              <Button size="lg" className="gap-2 h-12 px-8" asChild>
                <Link to="/auth?mode=signup&role=referrer">Start Earning <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8" asChild>
                <Link to="/auth?mode=signup&role=business">List Your Business</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;
