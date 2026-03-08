import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import PhoneNotification from "@/components/PhoneNotification";

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
      description="Stop paying for clicks. Set your own referral fee and only pay when a deal closes. Zero upfront cost. Available across Canada and the United States."
      path="/for-businesses"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Revvin Referral Marketing for Businesses",
        "description": "Pay-per-close customer acquisition.",
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
    <section className="relative pt-32 pb-28 lg:pt-40 lg:pb-36 dot-grid">
      <div className="container relative z-10 text-center">
        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0}>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Building2 className="h-3.5 w-3.5" /> For Businesses
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight text-foreground">
            Acquire customers.
            <br />
            <span className="text-primary">Pay when deals close.</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Zero upfront cost. You set the reward. You control the rules.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-10">
            <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
              <Link to="/auth?mode=signup&role=business">Create Business Account <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* How it works — Phone mockup */}
    <section className="py-28 lg:py-36 bg-surface">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-4xl mx-auto">
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight">
            A lead arrives. You close. They get paid.
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-center mb-16 text-sm">
            That's the entire workflow.
          </motion.p>
          <div className="flex justify-center">
            <PhoneNotification variant="business" />
          </div>
        </motion.div>
      </div>
    </section>

    {/* 3 steps — minimal */}
    <section className="py-28 lg:py-36">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-4xl mx-auto">
          <div className="grid gap-16 md:grid-cols-3 text-center">
            {[
              { num: "01", title: "Set your payout", desc: "Define a flat fee or percentage for each closed referral." },
              { num: "02", title: "Publish your offer", desc: "Set qualifications, payout timelines, and service area." },
              { num: "03", title: "Pay on close", desc: "Accept referrals, close deals, and Revvin handles payout." },
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

    {/* Cross-border */}
    <section className="py-20 bg-surface">
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
    <section className="py-28 lg:py-36">
      <div className="container text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="max-w-xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Start acquiring customers today</h2>
          <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
            <Link to="/auth?mode=signup&role=business">Create Business Account <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">Free to list. No credit card required.</p>
        </motion.div>
      </div>
    </section>
  </div>
);

export default ForBusinesses;
