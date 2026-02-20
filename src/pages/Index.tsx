import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, DollarSign, Users, Building2, TrendingUp, Search, Shield, Briefcase, MapPin, CheckCircle2, Zap, BarChart3, Lock, FileCheck, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";
import OfferCard from "@/components/OfferCard";
import { mockOffers } from "@/data/mockOffers";
import heroBg from "@/assets/hero-bg.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const Index = () => {
  const featured = mockOffers.filter((o) => o.featured).slice(0, 3);

  return (
    <div>
      {/* Positioning Strip */}
      <div className="bg-foreground text-background py-2.5 text-center">
        <p className="text-sm font-medium tracking-wide">
          Performance-Based Customer Acquisition — Powered by Referrals
        </p>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden hero-gradient py-28 lg:py-40">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20" />
        <div className="container relative z-10">
          <motion.div initial="hidden" animate="visible" className="mx-auto max-w-4xl text-center">
            <motion.div variants={fadeUp} custom={0}>
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-5 py-2 text-sm font-medium text-primary-foreground backdrop-blur-sm">
                <Zap className="h-4 w-4" />
                The referral-powered acquisition marketplace
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="mb-6 font-display text-5xl font-bold leading-[1.1] text-primary-foreground md:text-6xl lg:text-7xl"
            >
              Acquire Customers.
              <br />
              <span className="text-accent">Reward Referrers.</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mb-10 text-lg text-primary-foreground/70 max-w-2xl mx-auto leading-relaxed">
              Businesses set referral payouts. Referrers submit real opportunities. Revvin manages the economics. Everyone earns on outcomes.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" variant="secondary" className="gap-2 font-semibold text-base px-8 h-12 shadow-lg" asChild>
                <Link to="/auth?mode=signup&role=referrer">
                  <DollarSign className="h-5 w-5" /> Start Referring & Earning
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 gap-2 text-base px-8 h-12 border border-primary-foreground/20" asChild>
                <Link to="/auth?mode=signup&role=business">
                  <Building2 className="h-5 w-5" /> Create Business Account
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative -mt-8 z-20">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-5xl rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {[
                { value: "$2.4M+", label: "Total Payouts Available", icon: DollarSign },
                { value: "850+", label: "Active Businesses", icon: Building2 },
                { value: "12,000+", label: "Registered Referrers", icon: Users },
                { value: "$285", label: "Avg. Commission Size", icon: TrendingUp },
              ].map((stat, i) => (
                <motion.div key={stat.label} variants={fadeUp} custom={i} className="text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="font-display text-2xl font-bold text-foreground md:text-3xl">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Split-Entry Onboarding Gate */}
      <section className="py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Get Started</p>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Choose Your Path</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Two sides of the marketplace. One platform that makes referrals profitable for everyone.</p>
            </motion.div>
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
              {/* For Businesses */}
              <motion.div variants={fadeUp} custom={1} className="rounded-2xl border-2 border-border bg-card p-8 transition-all hover:shadow-lg hover:border-primary/30">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">For Businesses</p>
                <h3 className="font-display text-2xl font-bold text-foreground mb-3">Acquire Customers Through Referral Payouts</h3>
                <p className="text-muted-foreground leading-relaxed mb-5">
                  Set your own referral fees. Get qualified leads from motivated referrers. Pay only when deals close — zero upfront risk.
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Define custom payout structures</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Review and manage incoming referrals</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Track acquisition cost per customer</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> $0 to list — pay only on results</li>
                </ul>
                <Button className="w-full gap-2 h-12 text-base" asChild>
                  <Link to="/auth?mode=signup&role=business">Create Business Account <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </motion.div>

              {/* For Referrers */}
              <motion.div variants={fadeUp} custom={2} className="rounded-2xl border-2 border-border bg-card p-8 transition-all hover:shadow-lg hover:border-earnings/30">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-earnings/10">
                  <Users className="h-7 w-7 text-earnings" />
                </div>
                <p className="text-xs font-semibold text-earnings uppercase tracking-wider mb-2">For Referrers</p>
                <h3 className="font-display text-2xl font-bold text-foreground mb-3">Earn Income Referring Trusted Businesses</h3>
                <p className="text-muted-foreground leading-relaxed mb-5">
                  Browse high-paying referral programs. Submit qualified leads. Earn real commissions when deals close.
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-earnings shrink-0" /> Browse programs by map or list</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-earnings shrink-0" /> Track referrals and earnings in real time</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-earnings shrink-0" /> Earn badges and climb leaderboards</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-earnings shrink-0" /> 90% of every referral fee goes to you</li>
                </ul>
                <Button variant="outline" className="w-full gap-2 h-12 text-base border-2 border-earnings/30 text-earnings hover:bg-earnings/5" asChild>
                  <Link to="/auth?mode=signup&role=referrer">Start Referring & Earning <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3-Step Explainer */}
      <section className="border-y border-border bg-muted/30 py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mb-14 text-center">
            <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How It Works</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl font-bold text-foreground md:text-4xl">Three Steps to Start Earning</motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-3 text-muted-foreground max-w-xl mx-auto">A simple, transparent process that connects businesses with referrers for mutual benefit.</motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {[
              { step: "01", icon: Building2, title: "Businesses Publish Offers", desc: "Companies set their referral payout — flat fee or percentage. They define the deal, you browse the options.", color: "bg-primary/10 text-primary" },
              { step: "02", icon: Users, title: "Referrers Submit Customers", desc: "Know someone who needs the service? Submit their details with context. Track the status in real time.", color: "bg-earnings/10 text-earnings" },
              { step: "03", icon: DollarSign, title: "Payouts When Deals Close", desc: "Business closes the deal? Your commission is approved and paid out. No deal, no cost for anyone.", color: "bg-accent/10 text-accent-foreground" },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i} className="group relative rounded-2xl border border-border bg-card p-8 text-center transition-all hover:shadow-lg hover:-translate-y-1">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-md">
                  Step {item.step}
                </div>
                <div className={`mx-auto mb-5 mt-4 flex h-14 w-14 items-center justify-center rounded-2xl ${item.color}`}>
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-3 font-display text-lg font-bold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Payout Economics */}
      <section className="py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mx-auto max-w-4xl">
            <motion.div variants={fadeUp} custom={0} className="text-center mb-12">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Transparent Economics</p>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">See Exactly What You Earn</h2>
              <p className="mt-3 text-muted-foreground">Revvin takes a small platform fee. You keep the lion's share.</p>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="text-center mb-8">
                <p className="text-sm text-muted-foreground mb-1">Example: Business sets a</p>
                <p className="font-display text-5xl font-bold text-foreground">$1,500</p>
                <p className="text-sm text-muted-foreground mt-1">Referral Fee</p>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2 mb-6">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-earnings/10 to-earnings/5 border border-earnings/20 p-6 text-center">
                  <div className="relative z-10">
                    <Users className="mx-auto mb-2 h-7 w-7 text-earnings" />
                    <p className="text-sm font-medium text-muted-foreground">Referrer Earns</p>
                    <p className="font-display text-4xl font-bold text-earnings mt-1">$1,350</p>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">90% of the fee</p>
                  </div>
                </div>
                <div className="rounded-xl bg-muted/50 border border-border p-6 text-center">
                  <Briefcase className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Revvin Platform Fee</p>
                  <p className="font-display text-4xl font-bold text-foreground mt-1">$150</p>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">10% management fee</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span>Business pays only when the deal closes. Zero upfront costs.</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Featured Offers */}
      <section className="border-y border-border bg-muted/30 py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="mb-12 flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Live Opportunities</p>
                <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Featured Referral Programs</h2>
                <p className="mt-2 text-muted-foreground">High-paying programs from verified businesses</p>
              </div>
              <Button variant="outline" className="hidden gap-2 md:flex" asChild>
                <Link to="/browse">View All Opportunities <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </motion.div>
            <motion.div variants={fadeUp} custom={1} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </motion.div>
            <div className="mt-8 text-center md:hidden">
              <Button variant="outline" className="gap-2" asChild>
                <Link to="/browse">View All Opportunities <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust & Credibility Layer */}
      <section className="py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Trust & Transparency</p>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Built for Credibility</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Both sides of the marketplace are protected by verification, transparent economics, and structured processes.</p>
            </motion.div>
            <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: BadgeCheck, title: "Business Verification", desc: "Every business is reviewed before their offers go live on the marketplace." },
                { icon: Lock, title: "Payout Protection", desc: "Commissions are tracked transparently. Payouts are approved when deals close." },
                { icon: FileCheck, title: "Qualification Guidelines", desc: "Clear criteria for what makes a qualified referral — no guesswork." },
                { icon: Briefcase, title: "10% Platform Fee", desc: "Revvin takes a transparent 10% management fee. No hidden costs, ever." },
              ].map((item, i) => (
                <motion.div key={item.title} variants={fadeUp} custom={i + 1} className="rounded-2xl border border-border bg-card p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display text-base font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-muted/30 py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mx-auto max-w-3xl text-center">
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Ready to Join the Referral Economy?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-muted-foreground leading-relaxed text-lg">
              Whether you're a business looking for customers or someone who knows the right people — Revvin makes referrals profitable.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="gap-2 h-12 px-8" asChild>
                <Link to="/auth?mode=signup&role=referrer">Start Earning <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 h-12 px-8" asChild>
                <Link to="/auth?mode=signup&role=business">List Your Business</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
