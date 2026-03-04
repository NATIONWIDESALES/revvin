import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, DollarSign, Users, Building2, TrendingUp, Shield, Briefcase, MapPin, CheckCircle2, Zap, BarChart3, Lock, FileCheck, BadgeCheck, Ban, Target, Gauge, AlertTriangle, Scale } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import ConstellationBackground from "@/components/ConstellationBackground";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";


const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
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

const faqItems = [
  { q: "How much does it cost to list my business?", a: "Nothing. It's free to create an account and set up your offer. You only pay when a referred customer actually closes." },
  { q: "How do referrers get paid?", a: "When a deal is marked as won and verified, Revvin processes the payout to the referrer. The business sets the reward amount upfront." },
  { q: "What if a referral doesn't work out?", a: "You owe nothing. If the deal doesn't close, no payout is created. You only pay for real results." },
  { q: "Can I refer people I already know?", a: "Absolutely. Most referrers start by connecting people they already know to businesses they trust. You don't need to find strangers." },
  { q: "How does Revvin make money?", a: "Revvin takes a small platform fee (10%) from successful payouts. We only earn when everyone else does." },
  { q: "Is this available in my city?", a: "Revvin is live across Canada and the United States. If you don't see offers in your area yet, you can still sign up and be notified when businesses near you join." },
];

const ScenarioCard = ({ scenario }: { scenario: typeof scenarios[0] }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="polished-card">
      <p className="section-label mb-1">{scenario.scenario}</p>
      <p className="text-base font-bold text-foreground mb-3">{scenario.persona}</p>
      <div className="relative">
        <p className={`text-sm text-muted-foreground leading-relaxed mb-4 ${!expanded ? "line-clamp-2" : ""}`}>
          {scenario.quote}
        </p>
        {!expanded && (
          <button onClick={(e) => { e.preventDefault(); setExpanded(true); }} className="text-xs font-medium text-primary hover:underline">
            Read more
          </button>
        )}
      </div>
      <div className="pt-3 border-t border-border">
        <span className="text-[13px] font-semibold text-primary">{scenario.highlight}</span>
      </div>
    </div>
  );
};

const Index = () => {
  return (
    <div>
      <SEOHead
        title="Revvin — Pay-Per-Close Referral Marketplace for Businesses | Get Customers Through Referrals"
        description="Turn your customers into your best salespeople. Set a reward, share your link, and only pay when the deal closes. Revvin connects businesses with referrers who bring real, paying customers. Free to list. Available in Canada and the USA."
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Revvin",
            "url": "https://revvin.co",
            "description": "Pay-per-close referral marketplace connecting businesses with referrers who bring real customers.",
            "foundingDate": "2025",
            "areaServed": [
              { "@type": "Country", "name": "Canada" },
              { "@type": "Country", "name": "United States" }
            ],
            "sameAs": []
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Revvin",
            "url": "https://revvin.co",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://revvin.co/browse?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              { "@type": "Question", "name": "How much does it cost to list my business?", "acceptedAnswer": { "@type": "Answer", "text": "Nothing. It's free to create an account and set up your offer. You only pay when a referred customer actually closes." } },
              { "@type": "Question", "name": "How do referrers get paid?", "acceptedAnswer": { "@type": "Answer", "text": "When a deal is marked as won and verified, Revvin processes the payout to the referrer. The business sets the reward amount upfront." } },
              { "@type": "Question", "name": "What if a referral doesn't work out?", "acceptedAnswer": { "@type": "Answer", "text": "You owe nothing. If the deal doesn't close, no payout is created. You only pay for real results." } },
              { "@type": "Question", "name": "Can I refer people I already know?", "acceptedAnswer": { "@type": "Answer", "text": "Absolutely. Most referrers start by connecting people they already know to businesses they trust." } },
              { "@type": "Question", "name": "How does Revvin make money?", "acceptedAnswer": { "@type": "Answer", "text": "Revvin takes a small platform fee (10%) from successful payouts. We only earn when everyone else does." } },
              { "@type": "Question", "name": "Is this available in my city?", "acceptedAnswer": { "@type": "Answer", "text": "Revvin is live across Canada and the United States. If you don't see offers in your area yet, you can still sign up and be notified when businesses near you join." } }
            ]
          }
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-20 lg:pt-32 lg:pb-24" style={{ background: "radial-gradient(circle at 50% 30%, rgba(21,128,61,0.03), transparent 70%)" }}>
        <ConstellationBackground />
        <div className="container relative z-10">
          <motion.div initial="hidden" animate="visible" className="mx-auto max-w-3xl text-center">
            <motion.h1
              variants={fadeUp}
              custom={0}
              className="mb-4 text-4xl md:text-5xl font-bold leading-[1.1] text-foreground"
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
              <Button size="lg" asChild>
                <Link to="/auth?mode=signup&role=business">Create Business Offer</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth?mode=signup&role=referrer">Start Earning</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 3-Step Explainer */}
      <section className="py-24 lg:py-32 bg-surface">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mb-14 text-center">
            <motion.p variants={fadeUp} custom={0} className="section-label mb-2">How It Works</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold text-foreground md:text-4xl">Simple as it sounds</motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {[
              { num: "1", title: "Set your reward", desc: "Pick how much you want to pay someone for bringing you a new customer. You choose the amount and you set the rules for what counts." },
              { num: "2", title: "Spread the word", desc: "Share your link with anyone - happy customers, friends, family, business contacts. When they know someone who needs what you offer, they send them your way through Revvin." },
              { num: "3", title: "Pay only when it works", desc: "You get the introduction. You close the deal. If it turns into a real paying customer, the person who referred them gets rewarded. If it doesn't, you owe nothing." },
            ].map((item, i) => (
              <motion.div key={item.num} variants={fadeUp} custom={i} className="polished-card text-left">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
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
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="section-label mb-2">Why Revvin</p>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">Why pay for attention when you can pay for results?</h2>
            </motion.div>
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
              {/* Traditional Ads */}
              <motion.div variants={fadeUp} custom={1} className="polished-card">
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
                    <div key={item.label} className="flex items-center gap-3 rounded-lg bg-surface p-3">
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
              <motion.div variants={fadeUp} custom={2} className="polished-card relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] shimmer-border" />
                <div className="absolute -top-3 right-6">
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">Recommended</span>
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
      <section className="py-24 lg:py-32 bg-surface">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="section-label mb-2">How It Could Work For You</p>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">Picture this</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Here's how real businesses and everyday people can use Revvin.</p>
            </motion.div>
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
              {scenarios.map((t, i) => (
                <motion.div key={t.persona} variants={fadeUp} custom={i + 1}>
                  <ScenarioCard scenario={t} />
                </motion.div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-6 italic">These are illustrative examples showing how Revvin is designed to work.</p>
          </motion.div>
        </div>
      </section>

      {/* Choose Your Path */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
              <p className="section-label mb-2">Get Started</p>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">Which side are you on?</h2>
            </motion.div>
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
              {/* For Businesses */}
              <motion.div variants={fadeUp} custom={1} className="polished-card hover:border-primary/40">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <p className="section-label text-primary mb-2">For Businesses</p>
                <h3 className="text-xl font-bold text-foreground mb-3">Get customers without gambling on ads</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                  Set a reward for new customers. Share your link with the people who already know and trust your work. You only pay when someone actually becomes a paying customer.
                </p>
                <ul className="space-y-2.5 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> You decide exactly what you'll pay per customer</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Share one link with anyone who might send you business</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Other referrers across Revvin can find and refer to you too</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" /> Free to list - you only pay on results</li>
                </ul>
                <Button className="w-full" asChild>
                  <Link to="/auth?mode=signup&role=business">Create Business Offer</Link>
                </Button>
              </motion.div>

              {/* For Referrers */}
              <motion.div variants={fadeUp} custom={2} className="polished-card">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-earnings/5">
                  <Users className="h-5 w-5 text-earnings" />
                </div>
                <p className="section-label text-earnings mb-2">For Referrers</p>
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
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/auth?mode=signup&role=referrer">Start Earning</Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust & Protection */}
      <section className="py-24 lg:py-32 bg-surface">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-10">
              <p className="section-label mb-2">Trust & Protection</p>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">Built so both sides can trust the process</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Clear rules, verified outcomes, and no surprises - for businesses and referrers.</p>
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
                <motion.div key={item.title} variants={fadeUp} custom={i + 1} className="rounded-xl border border-border bg-card p-5 shadow-card">
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

      {/* FAQ */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mx-auto max-w-3xl">
            <motion.div variants={fadeUp} custom={0} className="text-center mb-10">
              <p className="section-label mb-2">Common Questions</p>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">Got questions?</h2>
            </motion.div>
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

      {/* Final CTA */}
      <section className="py-24 lg:py-32 bg-surface">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mx-auto max-w-2xl text-center">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold text-foreground md:text-4xl">
              Ready to put your network to work?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-muted-foreground leading-relaxed text-lg">
              Whether you're a business looking for customers or someone who knows the right people - every good introduction should be worth something.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/auth?mode=signup&role=business">Create Business Offer</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth?mode=signup&role=referrer">Start Earning</Link>
              </Button>
            </motion.div>
            <motion.p variants={fadeUp} custom={3} className="mt-4 text-xs text-muted-foreground">
              Free to list. No credit card required to browse.
            </motion.p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
