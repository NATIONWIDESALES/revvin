import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, CheckCircle2, DollarSign, BarChart3, Shield, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import MarqueeTicker from "@/components/MarqueeTicker";

const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const ForBusinesses = () => (
  <div>
    <SEOHead
      title="Revvin for Businesses — Acquire Customers Through Referral Payouts"
      description="Stop paying for clicks. List your referral offer on Revvin. Set your own payout. Only pay when a deal closes. Free to list. Available in Canada and the USA."
      path="/for-businesses"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Revvin Referral Marketing for Businesses",
        "description": "Pay-per-close customer acquisition through structured referrals.",
        "provider": { "@type": "Organization", "name": "Revvin" },
        "areaServed": [
          { "@type": "Country", "name": "Canada" },
          { "@type": "Country", "name": "United States" }
        ],
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "CAD",
          "description": "Free to list. Pay only on closed deals."
        }
      }}
    />

    {/* Hero */}
    <section className="relative pt-28 pb-24 lg:pt-36 lg:pb-32">
      <div className="absolute inset-0 dot-grid opacity-50" />
      <div className="container relative z-10 text-center">
        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0}>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Building2 className="h-3.5 w-3.5" /> For Businesses
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight text-foreground">
            Stop paying for clicks.
            <br />
            <span className="text-primary">Start paying for customers.</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            List your referral offer on Revvin. Set what a new customer is worth to you. Only pay when a deal actually closes.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
            <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
              <Link to="/auth?mode=signup&role=business">Create Business Account <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-sm" asChild>
              <Link to="/how-it-works">How It Works</Link>
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} custom={4} className="mt-4 text-xs text-muted-foreground">
            Free to list · Pay only when deals close
          </motion.p>
        </motion.div>
      </div>
    </section>

    {/* Social proof ticker */}
    <section className="py-3 bg-muted/30 border-y border-border overflow-hidden">
      <MarqueeTicker items={["Zero upfront cost", "$500 average referral payout", "Only pay on closed deals", "Verified referrer network", "Available in Canada & USA", "Free to list"]} />
    </section>
    <section className="py-24 lg:py-32 bg-surface">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-4xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">How it works</motion.p>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
            From listing to payout in 4 steps
          </motion.h2>
          <div className="grid gap-12 md:gap-8 md:grid-cols-4 text-center">
            {[
              { num: "01", title: "Create your profile", desc: "Sign up free, add your business details, logo, and service area." },
              { num: "02", title: "Set your payout", desc: "Define what you'll pay for a closed referral — flat fee or percentage." },
              { num: "03", title: "Get approved", desc: "Our team reviews your business. Once approved, your offer goes live." },
              { num: "04", title: "Close & pay", desc: "Receive referrals, close deals, and the referrer gets paid automatically." },
            ].map((item, i) => (
              <motion.div key={item.num} variants={fadeUp} custom={i + 1}>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5 text-sm font-bold text-primary">
                  {item.num}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>

    {/* Benefits */}
    <section className="py-24 lg:py-32">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-4xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">Why businesses choose Revvin</motion.p>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
            Better than ads. Simpler than hiring.
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: DollarSign, title: "Pay on results only", desc: "No upfront cost, no monthly spend on ads. You only pay when a referred customer actually closes." },
              { icon: Users, title: "Warm introductions", desc: "Referrals come from people who know your next customer — not algorithms guessing from cookie data." },
              { icon: Shield, title: "Platform structure", desc: "Clean records, tracked referrals, mediated payouts. No more informal deals and missing payments." },
              { icon: Zap, title: "Free to start", desc: "List your business and create your first offer for free. Upgrade to reduce platform fees as you grow." },
              { icon: BarChart3, title: "Full visibility", desc: "Track referrals, see pipeline activity, and manage payouts all from your dashboard." },
              { icon: CheckCircle2, title: "You set the terms", desc: "Choose your payout amount, define qualification criteria, and control your referral program." },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i + 1} className="rounded-xl border bg-card p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>

    {/* Pricing Hook */}
    <section className="py-24 lg:py-32 bg-surface">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-2xl mx-auto text-center">
          <motion.p variants={fadeUp} custom={0} className="section-label mb-3">Simple economics</motion.p>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            Free to list. Pay only when deals close.
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-sm mb-8 max-w-lg mx-auto">
            No subscriptions required. No upfront costs. Create your profile, publish your offer, and start receiving referrals. A small platform fee applies only on successful closes.
          </motion.p>
          <motion.div variants={fadeUp} custom={2} className="inline-flex flex-wrap items-center justify-center gap-4">
            {["Free business listing", "You set the payout", "No monthly commitment", "Pay on results only"].map(item => (
              <span key={item} className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                {item}
              </span>
            ))}
          </motion.div>
          <motion.div variants={fadeUp} custom={3} className="mt-10">
            <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
              <Link to="/auth?mode=signup&role=business">Create Business Account <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Choose your plan after signing up. Free plan available.</p>
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Cross-border */}
    <section className="py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">Available in two countries</h2>
          <div className="flex items-center justify-center gap-10">
            <div className="text-center">
              <span className="text-3xl mb-2 block">🇨🇦</span>
              <p className="text-sm font-medium text-foreground">Canada</p>
              <p className="text-xs text-muted-foreground">Paid in CAD</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <span className="text-3xl mb-2 block">🇺🇸</span>
              <p className="text-sm font-medium text-foreground">United States</p>
              <p className="text-xs text-muted-foreground">Paid in USD</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-24 lg:py-32 bg-surface">
      <div className="container text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="max-w-xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Start acquiring customers today</h2>
          <p className="text-muted-foreground mb-8">Create your business account, set your referral payout, and let your network do the selling.</p>
          <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
            <Link to="/auth?mode=signup&role=business">Create Business Account <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">Free to list. Pay only when referrals convert.</p>
        </motion.div>
      </div>
    </section>
  </div>
);

export default ForBusinesses;
