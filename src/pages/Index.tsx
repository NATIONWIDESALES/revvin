import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, DollarSign, Users, Building2, TrendingUp, Shield, Briefcase, MapPin, CheckCircle2, Zap, BarChart3, Lock, FileCheck, BadgeCheck, Ban, Target, Gauge, AlertTriangle, Scale } from "lucide-react";
import { motion } from "framer-motion";
import OfferCard from "@/components/OfferCard";
import SEOHead from "@/components/SEOHead";
import CitySlots from "@/components/CitySlots";
import { cityJumpsCA, cityJumpsUS } from "@/lib/offerUtils";
import { useDbOffers } from "@/hooks/useDbOffers";
import { usePlatformStats } from "@/hooks/usePlatformStats";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const scenarios = [
  {
    persona: "Real Estate Agent",
    scenario: "Referrer Scenario",
    quote: "Imagine referring a friend to a roofing company and earning $800 when the job closes. Submit in 5 minutes. Revvin handles the rest.",
    highlight: "Potential: $500-$1,500 per referral",
  },
  {
    persona: "HVAC Business Owner",
    scenario: "Business Scenario",
    quote: "Instead of paying for clicks that don't convert, set a fixed referral fee and pay only when a new customer signs. Zero upfront risk.",
    highlight: "Pay-per-close acquisition",
  },
  {
    persona: "Insurance Professional",
    scenario: "Referrer Scenario",
    quote: "If you already talk to homeowners daily, Revvin lets you monetize those conversations. Refer to contractors and earn commissions.",
    highlight: "Turn conversations into income",
  },
  {
    persona: "Service Business Owner",
    scenario: "Business Scenario",
    quote: "Set a payout amount, publish your offer, and only pay when a referred client actually signs. Controlled acquisition costs with zero upfront risk.",
    highlight: "Pay-per-close, transparent payouts",
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
  const { data: allOffers = [] } = useDbOffers();
  const featured = allOffers.filter((o) => o.featured).slice(0, 4);
  const { data: stats } = usePlatformStats();

  const hasRealData = stats && (stats.activeBusinesses > 0 || stats.totalReferrals > 0);
  const statItems = hasRealData ? [
    { value: formatCurrency(stats.totalPayoutsAvailable), label: "Payouts Available" },
    { value: `${stats.activeBusinesses}`, label: "Businesses" },
    { value: `$${stats.avgPayout}`, label: "Avg. Payout" },
    { value: "2", label: "Countries" },
    { value: `${stats.activeCities}`, label: "Cities" },
    { value: `${stats.totalReferrals}`, label: "Referrals" },
  ] : null;

  return (
    <div>
      <SEOHead title="Revvin - Pay-Per-Close Referral Marketplace" description="Businesses pay only for closed deals. Referrers earn commissions. Active across Canada and the United States." path="/" />

      {/* Hero */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div initial="hidden" animate="visible" className="mx-auto max-w-3xl text-center">
            <motion.h1
              variants={fadeUp}
              custom={0}
              className="mb-4 text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[1.1] tracking-[-0.02em] text-foreground"
            >
              Turn your customers into your best salespeople.
            </motion.h1>
            <motion.p variants={fadeUp} custom={1} className="mb-3 text-[18px] font-normal text-[#6B7280] leading-relaxed">
              They already love what you do. Now they <span className="text-primary font-normal">get paid to spread the word.</span>
            </motion.p>
            <motion.p variants={fadeUp} custom={2} className="mb-8 text-[15px] font-normal text-[#9CA3AF] leading-relaxed">
              Pay-per-close customer acquisition. Powered by referrals, not ads.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-8 text-[15px]" asChild>
                <Link to="/auth?mode=signup&role=business">Create Business Offer</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-[15px]" asChild>
                <Link to="/auth?mode=signup&role=referrer">Start Referring &amp; Earning</Link>
              </Button>
            </motion.div>
            <motion.div variants={fadeUp} custom={4} className="mt-5">
              <Link to="/browse" className="text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4 transition-colors">
                See all offers
              </Link>
            </motion.div>
            <motion.p variants={fadeUp} custom={5} className="mt-6 text-[13px] text-muted-foreground/70 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Trusted by businesses across Canada and the US
            </motion.p>
          </motion.div>

          {/* Hero Visual - sample offer cards */}
          {featured.length > 0 && (
            <motion.div variants={fadeUp} custom={5} initial="hidden" animate="visible" className="mx-auto mt-16 max-w-5xl">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured.slice(0, 3).map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Marketplace Stats */}
      {statItems && (
        <section className="py-16 border-y border-border">
          <div className="container">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-8 text-center">
              Live Marketplace. Canada + United States
            </p>
            <div className="mx-auto max-w-4xl grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
              {statItems.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="text-center"
                >
                  <div className="text-[28px] font-bold text-foreground leading-none">{stat.value}</div>
                  <div className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider mt-2">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Early Stage CTA */}
      {!statItems && (
        <section className="py-16 border-y border-border">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.05em] mb-2">Early Access</p>
              <h3 className="text-xl font-bold mb-2 text-foreground">Be among the first on the platform</h3>
              <p className="text-muted-foreground text-sm mb-5">We're onboarding businesses across Canada and the USA. Join now to claim your market.</p>
              <div className="flex justify-center gap-3">
                <Button size="sm" asChild><Link to="/auth?mode=signup&role=business">List Your Business</Link></Button>
                <Button size="sm" variant="outline" asChild><Link to="/auth?mode=signup&role=referrer">Start Earning</Link></Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Trust Badges Strip */}
      <section className="py-8">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <p className="text-center text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-4">
              Trusted by businesses and referrers across North America
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { icon: Shield, label: "256-bit Encrypted" },
                { icon: BadgeCheck, label: "Verified Payouts" },
                { icon: BadgeCheck, label: "Verified Businesses" },
                { icon: Scale, label: "Dispute Resolution" },
                { icon: FileCheck, label: "PIPEDA & CCPA Compliant" },
              ].map((badge) => (
                <div key={badge.label} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
                  <badge.icon className="h-3 w-3 text-muted-foreground/50" />
                  {badge.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Explainer */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mb-14 text-center">
            <motion.p variants={fadeUp} custom={0} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">How It Works</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold text-foreground md:text-[40px] md:leading-[1.15] tracking-tight">Three Steps. Real Outcomes.</motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {[
              { num: "1", title: "Business Posts Offer", desc: "Set a fixed dollar or percentage payout. Define qualification rules. Publish to the marketplace." },
              { num: "2", title: "Referrer Submits Customer", desc: "Know someone who needs the service? Submit their details. First submission wins. Timestamped." },
              { num: "3", title: "Deal Closes → Payout", desc: "Business accepts referral. Deal closes → Revvin verifies → payout processed." },
            ].map((item, i) => (
              <motion.div key={item.num} variants={fadeUp} custom={i} className="rounded-xl border border-border bg-card p-8 text-center transition-shadow hover:shadow-md">
                <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {item.num}
                </div>
                <h3 className="mb-3 text-lg font-bold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Real-World Scenarios */}
      <section className="border-y border-border bg-muted py-20 lg:py-28">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">How It Could Work For You</p>
              <h2 className="text-3xl font-bold text-foreground md:text-[40px] md:leading-[1.15] tracking-tight">Real-World Scenarios</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Here's how businesses and referrers can use Revvin to drive results.</p>
            </motion.div>
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
              {scenarios.map((t, i) => (
                <motion.div key={t.persona} variants={fadeUp} custom={i + 1} className="rounded-xl border border-border bg-card p-7">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-1">{t.scenario}</p>
                  <p className="text-base font-bold text-foreground mb-3">{t.persona}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t.quote}</p>
                  <div className="pt-3 border-t border-border">
                    <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{t.highlight}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground/60 mt-6 italic">These are illustrative scenarios, not user testimonials. We're building real success stories with our first users.</p>
          </motion.div>
        </div>
      </section>

      {/* Featured Cities */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">Active Markets</p>
              <h2 className="text-3xl font-bold text-foreground md:text-[40px] md:leading-[1.15] tracking-tight">Featured Cities</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Referral programs are live across these metro areas in Canada and the United States.</p>
            </motion.div>
            <motion.div variants={fadeUp} custom={1} className="mx-auto max-w-5xl grid gap-8 md:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-4">Canada</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {cityJumpsCA.map((city) => {
                    const count = allOffers.filter(o => o.city === city.label || o.location.includes(city.label)).length;
                    return (
                      <Link
                        key={city.label}
                        to="/browse"
                        className={`rounded-lg border border-border bg-card p-3 text-center transition-shadow ${count > 0 ? 'hover:shadow-sm' : 'opacity-50'}`}
                      >
                        <p className="text-sm font-medium text-foreground">{city.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{count} offer{count !== 1 ? "s" : ""}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-4">United States</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {cityJumpsUS.map((city) => {
                    const count = allOffers.filter(o => o.city === city.label || o.location.includes(city.label)).length;
                    return (
                      <Link
                        key={city.label}
                        to="/browse"
                        className={`rounded-lg border border-border bg-card p-3 text-center transition-shadow ${count > 0 ? 'hover:shadow-sm' : 'opacity-50'}`}
                      >
                        <p className="text-sm font-medium text-foreground">{city.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{count} offer{count !== 1 ? "s" : ""}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} custom={2} className="mt-8 text-center">
              <Button variant="outline" asChild>
                <Link to="/browse">Explore All Markets</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Revvin vs Ads */}
      <section className="py-20 lg:py-28 border-y border-border bg-muted">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">Why Revvin</p>
              <h2 className="text-3xl font-bold text-foreground md:text-[40px] md:leading-[1.15] tracking-tight">Revvin vs. Traditional Advertising</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Stop paying for clicks. Start paying for customers.</p>
            </motion.div>
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
              {/* Traditional Ads */}
              <motion.div variants={fadeUp} custom={1} className="rounded-xl border border-border bg-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Ban className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Traditional Ads</h3>
                    <p className="text-xs text-muted-foreground">Pay upfront, hope for results</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Cost Model", value: "Pay per click / impression", icon: DollarSign },
                    { label: "Risk", value: "High. Spend before results", icon: AlertTriangle },
                    { label: "Intent Quality", value: "Low. Cold audiences", icon: Target },
                    { label: "ROI Predictability", value: "Uncertain. Rising CPMs", icon: Gauge },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                        <p className="text-sm text-foreground">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Revvin */}
              <motion.div variants={fadeUp} custom={2} className="rounded-xl border border-border bg-card p-8 relative border-l-4 border-l-primary">
                <div className="absolute -top-3 right-6">
                  <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">Recommended</span>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <Zap className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Revvin</h3>
                    <p className="text-xs text-muted-foreground">Pay only on closed deals</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Cost Model", value: "Pay per closed deal", icon: DollarSign },
                    { label: "Risk", value: "Zero. No deal, no cost", icon: Shield },
                    { label: "Intent Quality", value: "High. Warm introductions", icon: Target },
                    { label: "ROI Predictability", value: "Controlled CPA, fixed payouts", icon: Gauge },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-lg bg-primary/5 p-3">
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

      {/* Choose Your Path */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">Get Started</p>
              <h2 className="text-3xl font-bold text-foreground md:text-[40px] md:leading-[1.15] tracking-tight">Choose Your Path</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Two sides of the marketplace. One platform that makes referrals profitable for everyone.</p>
            </motion.div>
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
              {/* For Businesses */}
              <motion.div variants={fadeUp} custom={1} className="rounded-xl border border-border bg-card p-8 transition-shadow hover:shadow-md">
                <Building2 className="h-5 w-5 text-muted-foreground mb-4" />
                <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.05em] mb-2">For Businesses</p>
                <h3 className="text-xl font-bold text-foreground mb-3">Acquire Customers Through Referral Payouts</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                  Set your own referral fees. Get qualified leads from motivated referrers. Pay only when deals close — zero upfront risk.
                </p>
                <ul className="space-y-2.5 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Define custom payout structures</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Set qualification rules for leads</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Track acquisition cost per customer</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> $0 to list — pay only on results</li>
                </ul>
                <Button className="w-full h-12" asChild>
                  <Link to="/auth?mode=signup&role=business">Create Business Account</Link>
                </Button>
              </motion.div>

              {/* For Referrers */}
              <motion.div variants={fadeUp} custom={2} className="rounded-xl border border-border bg-card p-8 transition-shadow hover:shadow-md">
                <Users className="h-5 w-5 text-muted-foreground mb-4" />
                <p className="text-[11px] font-semibold text-earnings uppercase tracking-[0.05em] mb-2">For Referrers</p>
                <h3 className="text-xl font-bold text-foreground mb-3">Earn Income Referring Trusted Businesses</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                  Browse high-paying referral programs. Submit qualified leads. Earn real commissions when deals close.
                </p>
                <ul className="space-y-2.5 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Browse by map, category, or payout</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Track referrals and earnings in real time</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Earn badges and climb leaderboards</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Competitive referral payouts</li>
                </ul>
                <Button variant="outline" className="w-full h-12" asChild>
                  <Link to="/auth?mode=signup&role=referrer">Start Referring &amp; Earning</Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Offers */}
      {featured.length > 0 && (
        <section className="border-y border-border bg-muted py-20 lg:py-28">
          <div className="container">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.div variants={fadeUp} custom={0} className="mb-12 flex items-end justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-2">Live Opportunities</p>
                  <h2 className="text-3xl font-bold text-foreground md:text-[40px] md:leading-[1.15] tracking-tight">Featured Referral Programs</h2>
                  <p className="mt-2 text-muted-foreground">High-paying programs from verified businesses</p>
                </div>
                <Button variant="outline" className="hidden md:flex" asChild>
                  <Link to="/browse">View All Opportunities</Link>
                </Button>
              </motion.div>
              <motion.div variants={fadeUp} custom={1} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {featured.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </motion.div>
              <div className="mt-8 text-center md:hidden">
                <Button variant="outline" asChild>
                  <Link to="/browse">View All Opportunities</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Trust & Protection */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">Trust & Protection</p>
              <h2 className="text-3xl font-bold text-foreground md:text-[40px] md:leading-[1.15] tracking-tight">Built for Credibility</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Both sides of the marketplace are protected by verification, transparent economics, and structured processes.</p>
            </motion.div>
            <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: BadgeCheck, title: "Business Verification", desc: "Every business is reviewed before offers go live." },
                { icon: Lock, title: "Payout Protection", desc: "Commissions tracked transparently, paid on close." },
                { icon: FileCheck, title: "Qualification Rules", desc: "Clear criteria for what makes a valid referral." },
                { icon: Scale, title: "Dispute Resolution", desc: "Fair process to handle disagreements." },
                { icon: Briefcase, title: "Transparent Pricing", desc: "No hidden costs. Clear, aligned incentives." },
                { icon: Shield, title: "Fraud Prevention", desc: "Duplicate detection and timestamp verification." },
              ].map((item, i) => (
                <motion.div key={item.title} variants={fadeUp} custom={i + 1} className="rounded-xl border border-border bg-card p-6">
                  <item.icon className="h-5 w-5 text-muted-foreground mb-3" />
                  <h3 className="text-base font-bold text-foreground mb-1.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button variant="outline" asChild>
                <Link to="/trust">Learn More About Trust & Protection</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-muted py-20 lg:py-28">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mx-auto max-w-2xl text-center">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold text-foreground md:text-[40px] md:leading-[1.15] tracking-tight">
              Ready to Join the Referral Economy?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-muted-foreground leading-relaxed text-lg">
              Whether you're a business looking for customers or someone who knows the right people, Revvin makes referrals profitable.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Button size="lg" className="h-12 px-8" asChild>
                <Link to="/auth?mode=signup&role=business">Create Business Offer</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8" asChild>
                <Link to="/auth?mode=signup&role=referrer">Start Referring &amp; Earning</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
