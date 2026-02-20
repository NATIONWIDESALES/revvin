import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, ArrowRight, DollarSign, Shield, Users, Wallet, BarChart3, Globe } from "lucide-react";
import CitySlots from "@/components/CitySlots";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const ForBusinesses = () => (
  <div>
    <section className="hero-gradient py-20">
      <div className="container text-center">
        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0}>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-sm font-medium text-primary-foreground">
              <Building2 className="h-4 w-4" /> For Businesses
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="font-display text-4xl font-bold text-primary-foreground md:text-5xl">
            Acquire Customers.<br />Pay Only When Deals Close.
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-primary-foreground/70 max-w-2xl mx-auto">
            Revvin is pay-per-close acquisition infrastructure for service businesses across Canada 🇨🇦 and the United States 🇺🇸.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-8 flex justify-center gap-4">
            <Button size="lg" variant="secondary" className="gap-2 h-12 px-8" asChild>
              <Link to="/auth?mode=signup&role=business">Create Business Account <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>

    <section className="py-20">
      <div className="container max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold mb-10 text-center">How It Works for Businesses</motion.h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: "01", icon: Wallet, title: "Fund Your Wallet", desc: "Add funds in CAD or USD. Your wallet backs every referral payout with real money." },
              { step: "02", icon: Building2, title: "Publish Offers", desc: "Set fixed or percentage payouts, qualification rules, payout timelines, and service radius." },
              { step: "03", icon: DollarSign, title: "Pay on Close", desc: "Accept referrals → funds reserved in escrow → deal closes → payout released. Zero upfront risk." },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i + 1} className="rounded-2xl border border-border bg-card p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>

    <section className="border-y border-border bg-muted/30 py-20">
      <div className="container max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold mb-10 text-center">Cross-Border Ready</motion.h2>
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div variants={fadeUp} custom={1} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display font-bold mb-3 flex items-center gap-2">🇨🇦 Canada</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Fund wallet in CAD</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Accept payments via credit card, Interac e-Transfer, or EFT</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Referrer payouts via Interac e-Transfer or direct deposit</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Metro Vancouver, Toronto, Calgary coverage</li>
              </ul>
            </motion.div>
            <motion.div variants={fadeUp} custom={2} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display font-bold mb-3 flex items-center gap-2">🇺🇸 United States</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Fund wallet in USD</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Accept payments via credit card or ACH bank transfer</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Referrer payouts via ACH / direct deposit</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Seattle, LA, Dallas, Phoenix, NYC coverage</li>
              </ul>
            </motion.div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
            <Shield className="h-3.5 w-3.5 text-primary" /> Powered by Stripe — card, bank, and payout rails (prototype)
          </p>
        </motion.div>
      </div>
    </section>

    <section className="py-20">
      <div className="container max-w-4xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold mb-10 text-center">What You Get</motion.h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: BarChart3, title: "Acquisition Metrics", desc: "Track cost per close, conversion rates, and referrer performance." },
              { icon: Shield, title: "Funds Secured Badge", desc: "Pre-fund your wallet to earn trust badges on your offers." },
              { icon: Users, title: "Referrer Network", desc: "Access motivated referrers across both countries." },
              { icon: Globe, title: "Cross-Border Discovery", desc: "Your offers appear on the North America map and filtered search." },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i + 1} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>

    <section className="py-20">
      <div className="container max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold mb-4 text-center">Limited Verified Slots Per City</motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-center mb-8 max-w-xl mx-auto">Only 5 verified businesses per category per city. Claim your slot before competitors do.</motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <CitySlots maxDisplay={8} showApplyButton />
          </motion.div>
        </motion.div>
      </div>
    </section>

    <section className="border-t border-border bg-muted/30 py-20">
      <div className="container text-center">
        <h2 className="font-display text-3xl font-bold mb-4">Start Acquiring Customers Today</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">$0 to list. Pay only when deals close. Available in Canada and the United States.</p>
        <Button size="lg" className="gap-2 h-12 px-8" asChild>
          <Link to="/auth?mode=signup&role=business">Create Business Account <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </div>
    </section>
  </div>
);

export default ForBusinesses;
