import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Building2, Users, Zap, Ban, DollarSign, Shield, Target,
  CheckCircle2, Briefcase, Home, Wrench, Car, Dumbbell, PaintBucket,
  Landmark, Sun, Camera, Scale, Heart, TrendingUp, Star, Lock, FileText,
  BadgeCheck
} from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

const categories = [
  { name: "Real Estate", icon: Home, example: "$500 per closed buyer" },
  { name: "Home Services", icon: Wrench, example: "$150 per booked job" },
  { name: "Automotive", icon: Car, example: "$200 per vehicle sold" },
  { name: "Fitness & Wellness", icon: Dumbbell, example: "$75 per new member" },
  { name: "Financial Services", icon: Landmark, example: "$300 per funded loan" },
  { name: "Solar & Energy", icon: Sun, example: "$1,000 per install" },
  { name: "Contractors", icon: PaintBucket, example: "$250 per project" },
  { name: "Legal", icon: Scale, example: "$400 per retained client" },
];

const faqItems = [
  { q: "How much does it cost to list an offer?", a: "Nothing. Listing is free. You only pay a platform fee when a referred customer actually closes. The referrer always receives the full advertised payout amount." },
  { q: "How do referrers get paid?", a: "When the business confirms a deal is closed, Revvin processes the payout. The business sets the reward amount upfront, and the referrer receives 100% of it." },
  { q: "What if a referral doesn't convert?", a: "You owe nothing. No close, no cost. There's zero risk to listing an offer." },
  { q: "How does Revvin make money?", a: "Revvin charges a platform fee on top of each successful referral payout — 25% on the Free plan, 10% on Starter, and as low as 1% on higher tiers. The referrer always gets the full amount." },
  { q: "What types of businesses can use Revvin?", a: "Any business that benefits from customer referrals — realtors, contractors, mortgage brokers, gyms, auto dealers, SaaS companies, service providers, and more. If someone can refer a customer to you, Revvin works." },
  { q: "How is this different from affiliate marketing?", a: "Affiliate marketing tracks clicks and cookies. Revvin tracks real introductions between real people and real businesses, with payouts tied to actual closed deals — not impressions or signups." },
  { q: "Is my data and payment information secure?", a: "Yes. Revvin uses bank-level encryption, platform-mediated payouts, and every business is reviewed before going live. We're building the trust layer that informal referral deals are missing." },
];

const Index = () => {
  return (
    <div>
      <SEOHead
        title="Revvin — The Referral Marketplace | List Offers. Refer Customers. Get Paid."
        description="Revvin connects businesses with referrers who bring real, paying customers. Businesses list referral offers and only pay when deals close. Referrers earn by making introductions. Free to list."
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Revvin",
            "url": "https://revvin.co",
            "description": "The referral marketplace where businesses list offers and referrers earn by sending customers.",
            "foundingDate": "2025",
            "areaServed": [
              { "@type": "Country", "name": "Canada" },
              { "@type": "Country", "name": "United States" }
            ]
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqItems.map(item => ({
              "@type": "Question",
              "name": item.q,
              "acceptedAnswer": { "@type": "Answer", "text": item.a }
            }))
          }
        ]}
      />

      {/* ============ HERO ============ */}
      <section className="relative pt-28 pb-24 lg:pt-36 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-50" />
        <div className="container relative z-10">
          <motion.div initial="hidden" animate="visible" className="mx-auto max-w-3xl text-center">
            <motion.div variants={fadeUp} custom={0}>
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
                The referral marketplace
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight text-foreground"
            >
              Businesses list offers.
              <br />
              Referrers send customers.
              <br />
              <span className="text-primary">Everyone gets paid.</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Revvin is where businesses post referral rewards and people earn by making introductions that close. Free to list. Pay only on results.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
                <Link to="/auth?mode=signup&role=business">
                  <Building2 className="h-4 w-4" /> List Your Business
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-sm gap-2" asChild>
                <Link to="/auth?mode=signup&role=referrer">
                  <DollarSign className="h-4 w-4" /> Start Earning
                </Link>
              </Button>
            </motion.div>
            <motion.p variants={fadeUp} custom={4} className="mt-4 text-xs text-muted-foreground">
              Free to list · No credit card required · Canada & USA
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ============ SOCIAL PROOF STRIP ============ */}
      <section className="py-6 border-y border-border bg-surface">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[
              { icon: CheckCircle2, text: "Free to list" },
              { icon: Shield, text: "Platform-mediated payouts" },
              { icon: BadgeCheck, text: "Every business reviewed" },
              { icon: DollarSign, text: "Referrers keep 100%" },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="mx-auto max-w-5xl">
            <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">How it works</motion.p>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
              Three steps. That's it.
            </motion.h2>
            <div className="grid gap-12 md:gap-8 md:grid-cols-3 text-center">
              {[
                { num: "01", title: "Business posts an offer", desc: "Set what a new customer is worth to you. $100, $500, 5% — you decide." },
                { num: "02", title: "Referrer makes an intro", desc: "Someone in our network knows your next customer. They submit the referral through Revvin." },
                { num: "03", title: "Deal closes, everyone wins", desc: "You close the deal, the referrer gets paid automatically. No close = no cost." },
              ].map((item, i) => (
                <motion.div key={item.num} variants={fadeUp} custom={i + 1} className="relative">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5 text-lg font-bold text-primary">
                    {item.num}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ DUAL PATH - WHO IS REVVIN FOR ============ */}
      <section className="py-24 lg:py-32 bg-surface">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">Two sides, one marketplace</motion.p>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
              Which side are you on?
            </motion.h2>
            <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
              {/* Business Card */}
              <motion.div variants={fadeUp} custom={1} className="rounded-2xl border bg-card p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">I'm a business</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Get customers without gambling on ads. List your referral offer, set your payout, and only pay when deals actually close.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Free to list your first offer",
                    "You set the payout amount",
                    "Only pay when a deal closes",
                    "Reviewed by our team before going live",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full gap-2" asChild>
                  <Link to="/auth?mode=signup&role=business">Create Business Account <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </motion.div>

              {/* Referrer Card */}
              <motion.div variants={fadeUp} custom={2} className="rounded-2xl border bg-card p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-earnings" />
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-earnings/5">
                  <Users className="h-6 w-6 text-earnings" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">I know people</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Browse real businesses willing to pay for referrals. Make an introduction, and earn when the deal closes.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Free to join — no fees ever",
                    "Browse live referral offers",
                    "Keep 100% of the referral payout",
                    "Platform handles everything",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-earnings mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full gap-2" asChild>
                  <Link to="/auth?mode=signup&role=referrer">Start Earning <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ MARKETPLACE CATEGORIES ============ */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">Browse by category</motion.p>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight">
              Real businesses. Real payouts.
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground text-sm mb-12 max-w-lg mx-auto">
              From contractors to realtors to gyms — businesses across every industry use Revvin to reward referrals.
            </motion.p>
            <div className="mx-auto max-w-4xl grid gap-4 grid-cols-2 md:grid-cols-4">
              {categories.map((cat, i) => (
                <motion.div key={cat.name} variants={fadeUp} custom={i * 0.5}>
                  <Link
                    to={`/browse?category=${encodeURIComponent(cat.name === "Home Services" ? "Services" : cat.name === "Contractors" ? "Roofing" : cat.name === "Financial Services" ? "Finance" : cat.name === "Solar & Energy" ? "Energy" : cat.name === "Fitness & Wellness" ? "Services" : cat.name)}`}
                    className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-all hover:border-primary/30 hover:shadow-sm hover:-translate-y-0.5"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                      <cat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{cat.example}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button variant="outline" className="gap-2" asChild>
                <Link to="/browse">Browse All Offers <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ COMPARISON: REVVIN VS ADS ============ */}
      <section className="py-24 lg:py-32 bg-surface">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">Why Revvin</motion.p>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
              Stop paying for clicks.<br className="hidden md:block" /> Start paying for customers.
            </motion.h2>
            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
              <motion.div variants={fadeUp} custom={1} className="rounded-2xl border bg-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Ban className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground">Traditional Ads</h3>
                </div>
                <div className="space-y-4">
                  {[
                    "Pay per click — hope for the best",
                    "Cold leads from strangers",
                    "Unpredictable and rising costs",
                    "No guarantee of revenue",
                  ].map((text) => (
                    <div key={text} className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-2 shrink-0" />
                      <p className="text-sm text-muted-foreground">{text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div variants={fadeUp} custom={2} className="rounded-2xl border border-primary/20 bg-card p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] shimmer-border" />
                <div className="flex items-center gap-3 mb-6">
                  <Zap className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Revvin</h3>
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">Recommended</span>
                </div>
                <div className="space-y-4">
                  {[
                    "Pay only when a deal actually closes",
                    "Warm intros from trusted people",
                    "You set the price — it never changes",
                    "Every dollar tied to real revenue",
                  ].map((text) => (
                    <div key={text} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground font-medium">{text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ PRICING PREVIEW ============ */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">Simple pricing</motion.p>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight">
              Free to start. Pay as you grow.
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground text-sm mb-12 max-w-lg mx-auto">
              Revvin charges businesses a small platform fee on successful referrals. Referrers always earn 100% of the advertised payout.
            </motion.p>
            <div className="mx-auto max-w-4xl grid gap-6 md:grid-cols-3">
              {[
                {
                  name: "Free",
                  price: "$0",
                  period: "/mo",
                  fee: "25%",
                  desc: "Perfect for testing the waters",
                  features: ["List your business", "Create referral offers", "Receive referrals", "Platform-mediated payouts"],
                  cta: "Get Started Free",
                  featured: false,
                },
                {
                  name: "Starter",
                  price: "$50",
                  period: "/mo",
                  fee: "10%",
                  desc: "For businesses ready to scale",
                  features: ["Everything in Free", "Lower 10% platform fee", "Priority business review", "Enhanced profile visibility"],
                  cta: "Start Starter Plan",
                  featured: true,
                },
                {
                  name: "Pro",
                  price: "$250",
                  period: "/mo",
                  fee: "1%",
                  desc: "For high-volume referral programs",
                  features: ["Everything in Starter", "Minimal 1% platform fee", "Featured marketplace placement", "Priority support"],
                  cta: "Go Pro",
                  featured: false,
                },
              ].map((plan, i) => (
                <motion.div
                  key={plan.name}
                  variants={fadeUp}
                  custom={i + 1}
                  className={`rounded-2xl border p-7 relative ${plan.featured ? "border-primary/30 bg-card shadow-md" : "bg-card"}`}
                >
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">Most Popular</span>
                    </div>
                  )}
                  <p className="text-sm font-semibold text-primary mb-1">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{plan.fee} platform fee on closed referrals</p>
                  <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button variant={plan.featured ? "default" : "outline"} className="w-full" asChild>
                    <Link to="/auth?mode=signup&role=business">{plan.cta}</Link>
                  </Button>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link to="/pricing" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
                See all plans & details <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ TRUST & STRUCTURE ============ */}
      <section className="py-24 lg:py-32 bg-surface">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">Built for trust</motion.p>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
              Not another handshake deal.
            </motion.h2>
            <div className="mx-auto max-w-4xl grid gap-6 md:grid-cols-3">
              {[
                { icon: BadgeCheck, title: "Business review", desc: "Every business is reviewed and approved before offers go live on the marketplace." },
                { icon: Lock, title: "Platform-mediated payouts", desc: "No chasing payments. Revvin handles the payout process so referrers always get paid." },
                { icon: FileText, title: "Clean records", desc: "Every referral, status change, and payout is logged. Better accountability for everyone." },
              ].map((item, i) => (
                <motion.div key={item.title} variants={fadeUp} custom={i + 1} className="rounded-2xl border bg-card p-7 text-center">
                  <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/5">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ REAL-WORLD EXAMPLES ============ */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">Real-world scenarios</motion.p>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-12 tracking-tight">
              See how referrals happen on Revvin
            </motion.h2>
            <div className="mx-auto max-w-4xl grid gap-6 md:grid-cols-2">
              {[
                {
                  business: "Roofing Company",
                  payout: "$500",
                  referrer: "Real Estate Agent",
                  scenario: "A realtor's client mentions they need a new roof after the home inspection. The realtor submits a referral through Revvin. The roofing company closes the deal — the realtor earns $500.",
                },
                {
                  business: "Mortgage Broker",
                  payout: "$300",
                  referrer: "Financial Advisor",
                  scenario: "A financial advisor's client is looking to buy their first home. They submit the referral to a mortgage broker on Revvin. The loan funds — the advisor earns $300.",
                },
                {
                  business: "Landscaping Company",
                  payout: "$150",
                  referrer: "Neighbor",
                  scenario: "A homeowner loves their landscaper and submits a neighbor who just moved in. The landscaper books the job — the homeowner earns $150.",
                },
                {
                  business: "Gym",
                  payout: "$75",
                  referrer: "Current Member",
                  scenario: "A gym member tells their coworker about a great gym on Revvin. They submit the referral. The coworker signs up for a membership — the member earns $75.",
                },
              ].map((ex, i) => (
                <motion.div key={i} variants={fadeUp} custom={i + 1} className="rounded-2xl border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Business</p>
                      <p className="text-sm font-semibold text-foreground">{ex.business}</p>
                    </div>
                    <span className="text-lg font-bold text-primary">{ex.payout}</span>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground">Referrer</p>
                    <p className="text-sm font-medium text-foreground">{ex.referrer}</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{ex.scenario}</p>
                </motion.div>
              ))}
            </div>
            <p className="text-center mt-6 text-xs text-muted-foreground italic">
              These are illustrative examples showing how Revvin works across industries.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="py-24 lg:py-32 bg-surface">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="mx-auto max-w-2xl">
            <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">FAQ</motion.p>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-12 tracking-tight">
              Common questions
            </motion.h2>
            <motion.div variants={fadeUp} custom={1}>
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border">
                    <AccordionTrigger className="text-left text-base font-medium text-foreground hover:no-underline py-5">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Ready to put your network to work?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Whether you're a business looking for customers or someone who knows the right people — Revvin is where it happens.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
                <Link to="/auth?mode=signup&role=business"><Building2 className="h-4 w-4" /> List Your Business</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-sm gap-2" asChild>
                <Link to="/auth?mode=signup&role=referrer"><DollarSign className="h-4 w-4" /> Start Earning</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Free to list · No credit card required
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
