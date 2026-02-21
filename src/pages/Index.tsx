import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, DollarSign, Users, Building2, TrendingUp, Search, Shield, Briefcase, MapPin, CheckCircle2, Zap, BarChart3, Lock, FileCheck, BadgeCheck, Ban, Target, Gauge, AlertTriangle, Scale, Star, Quote } from "lucide-react";
import { motion } from "framer-motion";
import OfferCard from "@/components/OfferCard";
import SEOHead from "@/components/SEOHead";
import CitySlots from "@/components/CitySlots";
import { mockOffers, cityJumpsCA, cityJumpsUS } from "@/data/mockOffers";
import { usePlatformStats } from "@/hooks/usePlatformStats";
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

// These are illustrative scenarios, not real user testimonials (yet!)
const scenarios = [
  {
    persona: "Real Estate Agent",
    scenario: "Referrer Scenario",
    city: "Example",
    avatar: "RE",
    quote: "Imagine referring a friend to a roofing company and earning $800 when the job closes. Submit in 5 minutes — Revvin handles the rest.",
    highlight: "Potential: $500–$1,500 per referral",
  },
  {
    persona: "HVAC Business Owner",
    scenario: "Business Scenario",
    city: "Example",
    avatar: "HV",
    quote: "Instead of paying for clicks that don't convert, set a fixed referral fee and pay only when a new customer signs. Zero upfront risk.",
    highlight: "Pay-per-close acquisition",
  },
  {
    persona: "Insurance Professional",
    scenario: "Referrer Scenario",
    city: "Example",
    avatar: "IP",
    quote: "If you already talk to homeowners daily, Revvin lets you monetize those conversations. Refer to contractors and earn commissions.",
    highlight: "Turn conversations into income",
  },
  {
    persona: "Service Business Owner",
    scenario: "Business Scenario",
    city: "Example",
    avatar: "SB",
    quote: "The escrow system means you fund your wallet, set a payout, and only pay when a referred client actually signs. Controlled acquisition costs.",
    highlight: "Escrowed, transparent payouts",
  },
];

const formatCurrency = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K+`;
  return `$${n}`;
};

const formatNumber = (n: number) => {
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K+`;
  return `${n}+`;
};

const Index = () => {
  const featured = mockOffers.filter((o) => o.featured).slice(0, 4);
  const { data: stats } = usePlatformStats();

  // Show real stats only — no fake inflated numbers
  const hasRealData = stats && (stats.activeBusinesses > 0 || stats.totalReferrals > 0);
  const statItems = hasRealData ? [
    { value: formatCurrency(stats.totalPayoutsAvailable), label: "Payouts Available", icon: DollarSign },
    { value: `${stats.activeBusinesses}`, label: "Businesses", icon: Building2 },
    { value: `$${stats.avgPayout}`, label: "Avg. Payout", icon: TrendingUp },
    { value: "2", label: "Countries", icon: MapPin },
    { value: `${stats.activeCities}`, label: "Cities", icon: BarChart3 },
    { value: `${stats.totalReferrals}`, label: "Referrals", icon: Users },
  ] : null;

  return (
    <div>
      <SEOHead title="Revvin — Pay-Per-Close Referral Marketplace" description="Businesses pay only for closed deals. Referrers earn 90% commissions. Active across Canada and the United States." path="/" />
      {/* Positioning Strip */}
      <div className="bg-foreground text-background py-2.5 text-center">
        <p className="text-sm font-medium tracking-wide">
          Pay-per-close customer acquisition — powered by referrals. <span className="opacity-60">This is not ads.</span>
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
                The referral acquisition marketplace
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="mb-6 font-display text-5xl font-bold leading-[1.1] text-primary-foreground md:text-6xl lg:text-7xl"
            >
              Businesses pay for closed deals.
              <br />
              <span className="text-accent">You earn for introductions.</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mb-10 text-lg text-primary-foreground/70 max-w-2xl mx-auto leading-relaxed">
              Businesses publish referral payouts. Referrers submit real opportunities. Revvin verifies outcomes and coordinates payouts.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" variant="secondary" className="gap-2 font-semibold text-base px-8 h-12 shadow-lg" asChild>
                <Link to="/auth?mode=signup&role=business">
                  <Building2 className="h-5 w-5" /> Create Business Offer
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 gap-2 text-base px-8 h-12 border border-primary-foreground/20" asChild>
                <Link to="/auth?mode=signup&role=referrer">
                  <DollarSign className="h-5 w-5" /> Start Referring & Earning
                </Link>
              </Button>
            </motion.div>
            <motion.div variants={fadeUp} custom={4} className="mt-4">
              <Link to="/browse" className="text-sm text-primary-foreground/50 hover:text-primary-foreground/80 underline underline-offset-4 transition-colors">
                See all offers →
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Marketplace Stats — only shown when real data exists */}
      {statItems && (
        <section className="relative -mt-8 z-20">
          <div className="container">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="mx-auto max-w-5xl rounded-2xl border border-border bg-card p-6 shadow-xl"
            >
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-4 text-center">Live Marketplace — 🇨🇦 Canada + 🇺🇸 USA</p>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
                {statItems.map((stat, i) => (
                  <motion.div key={stat.label} variants={fadeUp} custom={i} className="text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Early Stage CTA — shown when no real data */}
      {!statItems && (
        <section className="relative -mt-8 z-20">
          <div className="container">
            <div className="mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-card p-8 shadow-xl text-center">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">🚀 Early Access</p>
              <h3 className="font-display text-xl font-bold mb-2">Be among the first businesses and referrers on the platform</h3>
              <p className="text-muted-foreground text-sm mb-4">We're onboarding businesses across Canada and the USA. Join now to claim your market.</p>
              <div className="flex justify-center gap-3">
                <Button size="sm" asChild><Link to="/auth?mode=signup&role=business">List Your Business</Link></Button>
                <Button size="sm" variant="outline" asChild><Link to="/auth?mode=signup&role=referrer">Start Earning</Link></Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Trust Badges Strip */}
      <section className="py-10">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mx-auto max-w-4xl">
            <motion.p variants={fadeUp} custom={0} className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider mb-5">
              Trusted by businesses and referrers across North America
            </motion.p>
            <motion.div variants={fadeUp} custom={1} className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              {[
                { icon: Shield, label: "256-bit Encrypted" },
                { icon: Lock, label: "Escrow Protected" },
                { icon: BadgeCheck, label: "Verified Businesses" },
                { icon: Scale, label: "Dispute Resolution" },
                { icon: FileCheck, label: "PIPEDA & CCPA Compliant" },
              ].map((badge, i) => (
                <div key={badge.label} className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
                  <badge.icon className="h-3.5 w-3.5 text-primary" />
                  {badge.label}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 3-Step Explainer */}
      <section className="py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mb-14 text-center">
            <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How Revvin Works</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl font-bold text-foreground md:text-4xl">Three Steps. Real Outcomes.</motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {[
              { step: "01", icon: Building2, title: "Business Funds Wallet & Posts Offer", desc: "Add funds to your Revvin Wallet. Set a fixed dollar or percentage payout. Publish to the marketplace.", color: "bg-primary/10 text-primary" },
              { step: "02", icon: Users, title: "Referrer Submits Customer", desc: "Know someone who needs the service? Submit their details. First submission wins — timestamped.", color: "bg-earnings/10 text-earnings" },
              { step: "03", icon: DollarSign, title: "Accept → Funds Reserved → Close → Payout", desc: "Business accepts referral, funds are escrowed. Deal closes → payout released. 90% to referrer, 10% platform fee.", color: "bg-accent/10 text-accent-foreground" },
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

      <section className="border-y border-border bg-muted/30 py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How It Could Work For You</p>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Real-World Scenarios</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Here's how businesses and referrers can use Revvin to drive results.</p>
            </motion.div>
            <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
              {scenarios.map((t, i) => (
                <motion.div key={t.persona} variants={fadeUp} custom={i + 1} className="rounded-2xl border border-border bg-card p-6 relative">
                  <Quote className="absolute top-5 right-5 h-8 w-8 text-primary/10" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold">{t.persona}</p>
                      <p className="text-xs text-muted-foreground">{t.scenario}</p>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-4">"{t.quote}"</p>
                  <div className="pt-3 border-t border-border">
                    <span className="text-xs font-semibold text-primary">{t.highlight}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-6 italic">These are illustrative scenarios — not user testimonials. We're building real success stories with our first users.</p>
          </motion.div>
        </div>
      </section>

      {/* Featured Cities */}
      <section className="py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Active Markets</p>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Featured Cities</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Referral programs are live across these metro areas in Canada and the United States.</p>
            </motion.div>
            <motion.div variants={fadeUp} custom={1} className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">🇨🇦 Canada</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {cityJumpsCA.map((city) => {
                    const count = mockOffers.filter(o => o.city === city.label || o.location.includes(city.label)).length;
                    return (
                      <Link key={city.label} to={`/browse`} className="group rounded-xl border border-border bg-card p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5">
                        <p className="font-display text-sm font-bold group-hover:text-primary transition-colors">{city.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{count} offer{count !== 1 ? "s" : ""}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">🇺🇸 United States</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {cityJumpsUS.map((city) => {
                    const count = mockOffers.filter(o => o.city === city.label || o.location.includes(city.label)).length;
                    return (
                      <Link key={city.label} to={`/browse`} className="group rounded-xl border border-border bg-card p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5">
                        <p className="font-display text-sm font-bold group-hover:text-primary transition-colors">{city.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{count} offer{count !== 1 ? "s" : ""}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} custom={2} className="mt-8 text-center">
              <Button variant="outline" className="gap-2" asChild>
                <Link to="/browse">Explore All Markets <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Revvin vs Ads */}
      <section className="py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Why Revvin</p>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Revvin vs. Traditional Advertising</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Stop paying for clicks. Start paying for customers.</p>
            </motion.div>
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
              {/* Traditional Ads */}
              <motion.div variants={fadeUp} custom={1} className="rounded-2xl border border-destructive/20 bg-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
                    <Ban className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold">Traditional Ads</h3>
                    <p className="text-xs text-muted-foreground">Pay upfront, hope for results</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Cost Model", value: "Pay per click / impression", icon: DollarSign },
                    { label: "Risk", value: "High — spend before results", icon: AlertTriangle },
                    { label: "Intent Quality", value: "Low — cold audiences", icon: Target },
                    { label: "ROI Predictability", value: "Uncertain — rising CPMs", icon: Gauge },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                      <item.icon className="h-4 w-4 text-destructive/60 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                        <p className="text-sm text-foreground">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Revvin */}
              <motion.div variants={fadeUp} custom={2} className="rounded-2xl border-2 border-primary/30 bg-card p-8 relative">
                <div className="absolute -top-3 right-6">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-md">Recommended</span>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold">Revvin</h3>
                    <p className="text-xs text-muted-foreground">Pay only on closed deals</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Cost Model", value: "Pay per closed deal", icon: DollarSign },
                    { label: "Risk", value: "Zero — no deal, no cost", icon: Shield },
                    { label: "Intent Quality", value: "High — warm introductions", icon: Target },
                    { label: "ROI Predictability", value: "Controlled CPA, fixed payouts", icon: Gauge },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/10 p-3">
                      <item.icon className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-medium text-foreground">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Split-Entry Onboarding Gate */}
      <section className="border-y border-border bg-muted/30 py-24">
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
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Set qualification rules for leads</li>
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
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-earnings shrink-0" /> Browse by map, category, or payout</li>
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
                  <Users className="mx-auto mb-2 h-7 w-7 text-earnings" />
                  <p className="text-sm font-medium text-muted-foreground">Referrer Earns</p>
                  <p className="font-display text-4xl font-bold text-earnings mt-1">$1,350</p>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">90% of the fee</p>
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
            <motion.div variants={fadeUp} custom={1} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Trust & Protection</p>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Built for Credibility</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Both sides of the marketplace are protected by verification, transparent economics, and structured processes.</p>
            </motion.div>
            <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { icon: BadgeCheck, title: "Business Verification", desc: "Every business is reviewed before offers go live." },
                { icon: Lock, title: "Payout Protection", desc: "Commissions tracked transparently, paid on close." },
                { icon: FileCheck, title: "Qualification Rules", desc: "Clear criteria for what makes a valid referral." },
                { icon: Scale, title: "Dispute Resolution", desc: "Fair process to handle disagreements." },
                { icon: Briefcase, title: "10% Platform Fee", desc: "No hidden costs. Transparent and aligned." },
                { icon: Shield, title: "Fraud Prevention", desc: "Duplicate detection and timestamp verification." },
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
            <div className="mt-8 text-center">
              <Button variant="outline" className="gap-2" asChild>
                <Link to="/trust">Learn More About Trust & Protection <ArrowRight className="h-4 w-4" /></Link>
              </Button>
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
                <Link to="/auth?mode=signup&role=business">Create Business Offer <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 h-12 px-8" asChild>
                <Link to="/auth?mode=signup&role=referrer">Start Referring & Earning</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
