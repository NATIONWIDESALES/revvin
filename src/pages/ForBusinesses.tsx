import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, ArrowRight, DollarSign, Shield, Users, BarChart3, Globe, Briefcase } from "lucide-react";
import CitySlots from "@/components/CitySlots";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const ForBusinesses = () => (
  <div>
    <SEOHead title="For Businesses — Pay-Per-Close Customer Acquisition" description="Acquire customers through paid referrals. Set your own payout, get qualified leads, and pay only when deals close. Zero upfront risk." path="/for-businesses" />
    <section className="hero-gradient py-20 lg:py-24">
      <div className="container text-center">
        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0}>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-sm font-medium text-primary-foreground">
              <Building2 className="h-4 w-4" /> For Businesses
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl font-bold text-primary-foreground md:text-5xl">
            Acquire Customers.<br />Pay Only When Deals Close.
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-primary-foreground/70 max-w-2xl mx-auto">
            Revvin is pay-per-close acquisition infrastructure for service businesses across Canada and the United States.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-8 flex justify-center gap-4">
            <Button size="lg" variant="secondary" className="gap-2 h-12 px-8" asChild>
              <Link to="/auth?mode=signup&role=business">Create Business Account <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>

    <section className="py-20 lg:py-24">
      <div className="container max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-10 text-center md:text-4xl">How It Works for Businesses</motion.h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: "01", icon: Briefcase, title: "Set Your Payout", desc: "Define a flat fee or percentage payout for each referral. You control the cost per acquisition." },
              { step: "02", icon: Building2, title: "Publish Offers", desc: "Set qualification rules, payout timelines, and service radius. Your offers appear in the marketplace." },
              { step: "03", icon: DollarSign, title: "Pay on Close", desc: "Accept referrals, work the deal, close, and Revvin handles payout. Zero upfront risk." },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i + 1} className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>

    <section className="border-y border-border bg-muted/30 py-20 lg:py-24">
      <div className="container max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-10 text-center md:text-4xl">Cross-Border Ready</motion.h2>
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div variants={fadeUp} custom={1} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-bold mb-3 flex items-center gap-2">Canada</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Payouts in CAD</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Referrer payouts via Interac e-Transfer or direct deposit</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Metro Vancouver, Toronto, Calgary coverage</li>
              </ul>
            </motion.div>
            <motion.div variants={fadeUp} custom={2} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-bold mb-3 flex items-center gap-2">United States</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Payouts in USD</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Referrer payouts via ACH / direct deposit</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Seattle, LA, Dallas, Phoenix, NYC coverage</li>
              </ul>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>

    <section className="py-20 lg:py-24">
      <div className="container max-w-4xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-10 text-center md:text-4xl">What You Get</motion.h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: BarChart3, title: "Acquisition Metrics", desc: "Track cost per close, conversion rates, and referrer performance." },
              { icon: Shield, title: "Verified Business Badge", desc: "Get verified to earn trust and priority placement in the marketplace." },
              { icon: Users, title: "Referrer Network", desc: "Access motivated referrers across both countries." },
              { icon: Globe, title: "Cross-Border Discovery", desc: "Your offers appear on the North America map and filtered search." },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i + 1} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>

    <section className="py-20 lg:py-24">
      <div className="container max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-4 text-center md:text-4xl">Limited Verified Slots Per City</motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-center mb-8 max-w-xl mx-auto">Only 5 verified businesses per category per city. Claim your slot before competitors do.</motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <CitySlots maxDisplay={8} showApplyButton />
          </motion.div>
        </motion.div>
      </div>
    </section>

    <section className="border-t border-border bg-muted/30 py-20 lg:py-24">
      <div className="container text-center">
        <h2 className="text-3xl font-bold mb-4 md:text-4xl">Start Acquiring Customers Today</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">$0 to list. Pay only when deals close. Available in Canada and the United States.</p>
        <Button size="lg" className="gap-2 h-12 px-8" asChild>
          <Link to="/auth?mode=signup&role=business">Create Business Account <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </div>
    </section>
  </div>
);

export default ForBusinesses;
