import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Users, Zap, Ban, DollarSign, Shield, Target, Gauge } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import PhoneNotification from "@/components/PhoneNotification";
import HeroNotificationStream from "@/components/HeroNotificationStream";

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

const faqItems = [
  { q: "How much does it cost to list?", a: "Nothing. You only pay when a referred customer actually closes." },
  { q: "How do referrers get paid?", a: "When a deal is confirmed closed, Revvin processes the payout automatically. The business sets the reward amount upfront." },
  { q: "What if a referral doesn't convert?", a: "You owe nothing. No close, no cost." },
  { q: "How does Revvin make money?", a: "A 10% platform fee on successful payouts. We only earn when everyone else does." },
];

const Index = () => {
  return (
    <div>
      <SEOHead
        title="Revvin — Pay-Per-Close Referral Marketplace | Get Customers Through Referrals"
        description="Set a reward, share your link, and only pay when the deal closes. Revvin connects businesses with referrers who bring real, paying customers. Free to list."
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Revvin",
            "url": "https://revvin.co",
            "description": "Pay-per-close referral marketplace connecting businesses with referrers.",
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

      {/* Hero */}
      <section className="relative pt-32 pb-28 lg:pt-40 lg:pb-36 dot-grid">
        <div className="container relative z-10">
          <motion.div initial="hidden" animate="visible" className="mx-auto max-w-3xl text-center">
            <motion.div variants={fadeUp} custom={0}>
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
                Pay-per-close referral marketplace
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight text-foreground"
            >
              Turn your customers into
              <br />
              <span className="text-primary">your best salespeople.</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Set a reward. Share your link. Only pay when the deal closes.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-8 text-sm" asChild>
                <Link to="/auth?mode=signup&role=business">List Your Business</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-sm" asChild>
                <Link to="/auth?mode=signup&role=referrer">Start Earning</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Visual Explainer */}
      <section className="py-28 lg:py-36 bg-surface">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="mx-auto max-w-5xl">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
              Simple as it sounds
            </motion.h2>
            <div className="grid gap-16 md:grid-cols-3 text-center">
              {[
                { num: "01", title: "Set your reward", desc: "Pick what a new customer is worth to you." },
                { num: "02", title: "Spread the word", desc: "Share your link with anyone who might know someone." },
                { num: "03", title: "Pay on close", desc: "Deal closes, referrer gets paid. No close, no cost." },
              ].map((item, i) => (
                <motion.div key={item.num} variants={fadeUp} custom={i + 1}>
                  <div className="mb-4 text-4xl font-bold text-primary/15">{item.num}</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Phone Mockups */}
      <section className="py-28 lg:py-36">
        <div className="container">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease }}
            className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight"
          >
            See it in action
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
            className="text-muted-foreground text-center mb-16 text-sm"
          >
            Real notifications. Real payouts.
          </motion.p>
          <div className="grid gap-12 md:grid-cols-2 max-w-3xl mx-auto">
            <div className="text-center">
              <PhoneNotification variant="business" />
              <p className="mt-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Business receives a lead</p>
            </div>
            <div className="text-center">
              <PhoneNotification variant="referrer" />
              <p className="mt-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Referrer gets paid</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section className="py-12 border-y border-border">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            {["Free to list", "90/10 payout split", "Pay only on close", "Canada & USA"].map((text) => (
              <span key={text} className="rounded-full border border-border bg-surface px-5 py-2 text-xs font-medium text-muted-foreground">
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-28 lg:py-36">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
              Why pay for attention when you<br className="hidden md:block" /> can pay for results?
            </motion.h2>
            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
              <motion.div variants={fadeUp} custom={1} className="glass-card">
                <div className="flex items-center gap-3 mb-6">
                  <Ban className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground">Traditional Ads</h3>
                </div>
                <div className="space-y-4">
                  {[
                    "Pay per click, hope for the best",
                    "Leads from strangers",
                    "Unpredictable costs",
                  ].map((text) => (
                    <p key={text} className="text-sm text-muted-foreground">{text}</p>
                  ))}
                </div>
              </motion.div>
              <motion.div variants={fadeUp} custom={2} className="glass-card relative overflow-hidden border-primary/20">
                <div className="absolute top-0 left-0 right-0 h-[2px] shimmer-border" />
                <div className="flex items-center gap-3 mb-6">
                  <Zap className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Revvin</h3>
                </div>
                <div className="space-y-4">
                  {[
                    "Pay only when a deal closes",
                    "Warm intros from trusted people",
                    "You set the price — it never changes",
                  ].map((text) => (
                    <p key={text} className="text-sm text-foreground font-medium">{text}</p>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Choose Your Path */}
      <section className="py-28 lg:py-36 bg-surface">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
              Which side are you on?
            </motion.h2>
            <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-2">
              <motion.div variants={fadeUp} custom={1} className="glass-card text-center">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">I'm a business</h3>
                <p className="text-sm text-muted-foreground mb-6">Get customers without gambling on ads.</p>
                <Button className="w-full" asChild>
                  <Link to="/for-businesses">Learn More <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </motion.div>
              <motion.div variants={fadeUp} custom={2} className="glass-card text-center">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-earnings/5">
                  <Users className="h-6 w-6 text-earnings" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">I know people</h3>
                <p className="text-sm text-muted-foreground mb-6">Get paid for recommending businesses you trust.</p>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/for-referrers">Learn More <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-28 lg:py-36">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="mx-auto max-w-2xl">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-12 tracking-tight">
              Questions
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

      {/* CTA */}
      <section className="py-28 lg:py-36 bg-surface">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease }}
            className="mx-auto max-w-xl text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Ready to put your network to work?
            </h2>
            <div className="mt-10">
              <Button size="lg" className="h-12 px-8 text-sm" asChild>
                <Link to="/auth?mode=signup&role=business">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Free to list. No credit card required.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
