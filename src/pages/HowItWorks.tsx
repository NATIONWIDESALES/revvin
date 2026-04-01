import { ArrowRight, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

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

const steps = [
  { num: "01", title: "Business sets a reward", desc: "A roofing company offers $500 for every new customer that closes." },
  { num: "02", title: "Referrer spots an opportunity", desc: "A realtor's client mentions they need a new roof." },
  { num: "03", title: "Referral is submitted", desc: "The realtor submits the client's details through Revvin. First submission wins." },
  { num: "04", title: "Business closes the deal", desc: "The roofing company contacts the lead, does the work, and marks it closed." },
  { num: "05", title: "Everyone gets paid", desc: "The realtor receives the full $500. The business paid a platform fee on top. Revvin earns from the business, not the referrer." },
];

const HowItWorks = () => (
  <div>
    <SEOHead title="How Revvin Works — Pay-Per-Close Referral Marketplace" description="Businesses set referral rewards. Referrers submit warm introductions. Deals close, payouts are processed. Learn how it works." path="/how-it-works" />

    {/* Hero */}
    <section className="relative pt-32 pb-28 lg:pt-40 lg:pb-36 dot-grid">
      <div className="container relative z-10 text-center">
        <motion.div initial="hidden" animate="visible">
          <motion.h1 variants={fadeUp} custom={0} className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight text-foreground">
            How it works
          </motion.h1>
          <motion.p variants={fadeUp} custom={1} className="mt-6 text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            One referral. Five steps. Everyone wins.
          </motion.p>
        </motion.div>
      </div>
    </section>

    {/* Timeline */}
    <section className="py-28 lg:py-36 bg-surface">
      <div className="container">
        <div className="max-w-2xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, ease, delay: 0.05 }}
              className="relative pl-16 pb-16 last:pb-0"
            >
              {/* Vertical line */}
              {i < steps.length - 1 && (
                <div className="absolute left-[22px] top-10 bottom-0 w-px bg-border" />
              )}
              {/* Number circle */}
              <div className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary/20 bg-background text-sm font-bold text-primary">
                {step.num}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* From the Founders */}
    <section className="w-full py-28 lg:py-36 bg-surface">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="flex flex-col items-center"
        >
          {/* Megaphone icon */}
          <Megaphone className="h-5 w-5 text-primary" />

          {/* Eyebrow with lines */}
          <div className="flex items-center gap-4 mt-3">
            <div className="w-8 h-px bg-border" />
            <span className="section-label">
              From the Founders
            </span>
            <div className="w-8 h-px bg-border" />
          </div>

          {/* Decorative quote */}
          <div className="mt-8 text-primary/50 text-6xl leading-none font-serif">
            "
          </div>

          {/* Quote body */}
          <div className="mt-2 text-center max-w-2xl mx-auto space-y-6">
            <p className="text-lg leading-relaxed text-muted-foreground">
              We spent years running paid ads for small businesses and large enterprises. Millions on Facebook, Google, TikTok. Costs kept climbing, quality kept dropping. Every month was a balancing act between sustainability and unpredictability.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              The best customers always came from referrals. A neighbor recommending a roofer. A friend texting about their insurance guy. Word of mouth converted better, stayed longer, and cost nothing.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              So we built Revvin. Stop paying for unqualified clicks. Start rewarding the people already sending you your best customers. Let businesses decide what a closed deal is actually worth to them.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full max-w-2xl h-px bg-border mt-10" />

          {/* Attribution */}
          <div className="mt-6 text-center">
            <div className="text-foreground font-semibold text-base">
              The Revvin Team
            </div>
            <div className="text-muted-foreground text-sm">
              Founders
            </div>
          </div>
        </motion.div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-28 lg:py-36 bg-surface">
      <div className="container text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="max-w-xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Ready to get started?</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
              <Link to="/auth?mode=signup&role=referrer">Start Earning <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-sm" asChild>
              <Link to="/auth?mode=signup&role=business">List Your Business</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Free to list. Free to join.</p>
        </motion.div>
      </div>
    </section>
  </div>
);

export default HowItWorks;
