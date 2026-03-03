import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, DollarSign, Users, Building2, TrendingUp, Shield, Briefcase, MapPin, CheckCircle2, Zap, BarChart3, Lock, FileCheck, BadgeCheck, Ban, Target, Gauge, AlertTriangle, Scale } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";


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
    persona: "Roofing Company",
    scenario: "Business Example",
    quote: "We set a $400 reward for every new customer. We sent our Revvin link to past clients and a few contractor friends. When they send someone our way and we close the job, they get paid. We only spend money when we actually land the work.",
    highlight: "You choose what a customer is worth",
  },
  {
    persona: "Real Estate Agent",
    scenario: "Referrer Example",
    quote: "My clients always ask me for contractor recommendations. Now when I refer them through Revvin and the job gets done, I get a payout. Same conversations I was already having - except now I earn from them.",
    highlight: "Earn from the introductions you already make",
  },
  {
    persona: "Insurance Professional",
    scenario: "Referrer Example",
    quote: "I talk to homeowners every single day. When someone mentions needing a roofer, a fence, or a kitchen renovation, I refer them to a business on Revvin. Takes me two minutes. I get paid when the job closes.",
    highlight: "Your conversations are worth more than you think",
  },
  {
    persona: "Mortgage Broker",
    scenario: "Business Example",
    quote: "Realtors on Revvin see my listing and send their buyers directly to me. I'm getting introduced to people by professionals who already have the relationship built. And I only pay when the loan actually funds.",
    highlight: "Other businesses' networks become yours",
  },
];

const Index = () => {
  return (
    <div>
      <SEOHead title="Revvin - Pay-Per-Close Referral Marketplace" description="Businesses pay only for closed deals. Referrers earn commissions. Active across Canada and the United States." path="/" />

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-[60px] lg:pt-[80px] bg-muted/30 border-b border-border">
        
        <div className="container relative z-10">
          <motion.div initial="hidden" animate="visible" className="mx-auto max-w-3xl text-center">
            <motion.h1
              variants={fadeUp}
              custom={0}
              className="mb-4 text-4xl md:text-5xl font-bold leading-[1.1] tracking-[-0.02em] text-foreground"
            >
              Turn your customers into your best salespeople.
            </motion.h1>
            <motion.p variants={fadeUp} custom={1} className="mb-3 text-lg font-normal text-muted-foreground leading-relaxed">
              They already love what you do. Now they <span className="text-primary font-normal">get paid to spread the word.</span>
            </motion.p>
            <motion.p variants={fadeUp} custom={2} className="mb-8 text-sm font-normal text-muted-foreground leading-relaxed">
              Set a reward for new customers. Share your link. Only pay when the deal actually closes.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-8" asChild>
                <Link to="/auth?mode=signup&role=business">Create Business Offer</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8" asChild>
                <Link to="/auth?mode=signup&role=referrer">Start Earning</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 3-Step Explainer */}
      <section className="py-20 lg:py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mb-14 text-center">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">How It Works</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold text-foreground md:text-4xl tracking-tight">Simple as it sounds</motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {[
              { num: "1", title: "Set your reward", desc: "Pick how much you want to pay someone for bringing you a new customer. You choose the amount and you set the rules for what counts." },
              { num: "2", title: "Spread the word", desc: "Share your link with anyone - happy customers, friends, family, business contacts. When they know someone who needs what you offer, they send them your way through Revvin." },
              { num: "3", title: "Pay only when it works", desc: "You get the introduction. You close the deal. If it turns into a real paying customer, the person who referred them gets rewarded. If it doesn't, you owe nothing." },
            ].map((item, i) => (
              <motion.div key={item.num} variants={fadeUp} custom={i} className="rounded-xl border border-border bg-card p-8 text-center shadow-sm transition-shadow hover:shadow-md">
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

      {/* Revvin vs Ads */}
      <section className="py-20 lg:py-24 border-y border-border bg-muted">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">Why Revvin</p>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl tracking-tight">Why pay for attention when you can pay for results?</h2>
            </motion.div>
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
              {/* Traditional Ads */}
              <motion.div variants={fadeUp} custom={1} className="rounded-xl border border-border bg-card p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Ban className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Traditional Ads</h3>
                    <p className="text-xs text-muted-foreground">Pay upfront, hope for results</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Cost Model", value: "You pay every time someone clicks or sees your ad", icon: DollarSign },
                    { label: "Risk", value: "You spend money before you know if it works", icon: AlertTriangle },
                    { label: "Lead Quality", value: "Strangers who may not need what you offer", icon: Target },
                    { label: "ROI Predictability", value: "Hard to predict - costs keep changing", icon: Gauge },
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
              <motion.div variants={fadeUp} custom={2} className="rounded-xl border border-border bg-card p-8 shadow-sm relative border-l-4 border-l-primary">
                <div className="absolute -top-3 right-6">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Recommended</span>
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
                    { label: "Cost Model", value: "You pay only when you get a real customer", icon: DollarSign },
                    { label: "Risk", value: "No customer, no cost", icon: Shield },
                    { label: "Lead Quality", value: "Warm introductions from people who already trust you", icon: Target },
                    { label: "ROI Predictability", value: "You set the price. It never changes unless you want it to.", icon: Gauge },
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

      {/* Real-World Scenarios */}
      <section className="py-20 lg:py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">How It Could Work For You</p>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl tracking-tight">Picture this</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Here's how real businesses and everyday people can use Revvin.</p>
            </motion.div>
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
              {scenarios.map((t, i) => (
                <motion.div key={t.persona} variants={fadeUp} custom={i + 1} className="rounded-xl border border-border bg-card p-7 shadow-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-1">{t.scenario}</p>
                  <p className="text-base font-bold text-foreground mb-3">{t.persona}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t.quote}</p>
                  <div className="pt-3 border-t border-border">
                    <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{t.highlight}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-6 italic">These are illustrative examples showing how Revvin is designed to work.</p>
          </motion.div>
        </div>
      </section>

      {/* Choose Your Path */}
      <section className="py-20 lg:py-24 border-y border-border bg-muted">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">Get Started</p>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl tracking-tight">Which side are you on?</h2>
            </motion.div>
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
              {/* For Businesses */}
              <motion.div variants={fadeUp} custom={1} className="rounded-xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
                <Building2 className="h-5 w-5 text-muted-foreground mb-4" />
                <p className="text-xs font-semibold text-primary uppercase tracking-[0.05em] mb-2">For Businesses</p>
                <h3 className="text-xl font-bold text-foreground mb-3">Get customers without gambling on ads</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                  Set a reward for new customers. Share your link with the people who already know and trust your work. You only pay when someone actually becomes a paying customer. As the Revvin marketplace grows, new people can discover your business and refer customers to you too.
                </p>
                <ul className="space-y-2.5 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> You decide exactly what you'll pay per customer</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Share one link with anyone who might send you business</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Other referrers across Revvin can find and refer to you too</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Free to list - you only pay on results</li>
                </ul>
                <Button className="w-full h-12" asChild>
                  <Link to="/auth?mode=signup&role=business">Create Business Offer</Link>
                </Button>
              </motion.div>

              {/* For Referrers */}
              <motion.div variants={fadeUp} custom={2} className="rounded-xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
                <Users className="h-5 w-5 text-muted-foreground mb-4" />
                <p className="text-xs font-semibold text-earnings uppercase tracking-[0.05em] mb-2">For Referrers</p>
                <h3 className="text-xl font-bold text-foreground mb-3">Get paid for recommending businesses you believe in</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                  You already tell friends, family, and colleagues about businesses you trust. Revvin lets you earn real money when those recommendations turn into paying customers.
                </p>
                <ul className="space-y-2.5 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Browse businesses offering referral rewards</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Refer someone you know who needs their service</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Track your referrals and earnings in one place</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Earn $200-$1,500+ when deals close</li>
                </ul>
                <Button variant="outline" className="w-full h-12" asChild>
                  <Link to="/auth?mode=signup&role=referrer">Start Earning</Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust & Protection */}
      <section className="py-20 lg:py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-10">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">Trust & Protection</p>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl tracking-tight">Built so both sides can trust the process</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Clear rules, verified outcomes, and no surprises - for businesses and referrers.</p>
            </motion.div>

            {/* Trust Badges */}
            <motion.div variants={fadeUp} custom={1} className="mx-auto max-w-4xl mb-10">
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
            </motion.div>

            {/* Trust Feature Cards */}
            <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: BadgeCheck, title: "Verified Businesses", desc: "Every business is reviewed before their offer goes live. No one gets listed without a check." },
                { icon: Lock, title: "Protected Payouts", desc: "Referral rewards are tracked from start to finish and only paid out when the deal is confirmed closed." },
                { icon: FileCheck, title: "Clear Rules", desc: "Businesses set exactly what counts as a valid referral upfront. No confusion, no grey areas." },
                { icon: Scale, title: "Fair Dispute Process", desc: "If something doesn't seem right, there's a structured process to sort it out. Both sides get heard." },
                { icon: Briefcase, title: "No Hidden Costs", desc: "Businesses set their reward. Referrers see exactly what they'll earn. No surprise fees on either side." },
                { icon: Shield, title: "Fraud Prevention", desc: "Duplicate submissions are caught automatically. Every referral is timestamped and reviewed." },
              ].map((item, i) => (
                <motion.div key={item.title} variants={fadeUp} custom={i + 2} className="rounded-xl border border-border bg-card p-6 shadow-sm">
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
      <section className="border-t border-border bg-muted py-20 lg:py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mx-auto max-w-2xl text-center">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold text-foreground md:text-4xl tracking-tight">
              Ready to put your network to work?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-muted-foreground leading-relaxed text-lg">
              Whether you're a business looking for customers or someone who knows the right people - every good introduction should be worth something.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Button size="lg" className="h-12 px-8" asChild>
                <Link to="/auth?mode=signup&role=business">Create Business Offer</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8" asChild>
                <Link to="/auth?mode=signup&role=referrer">Start Earning</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
