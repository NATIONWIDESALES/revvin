import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, HelpCircle } from "lucide-react";
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

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    fee: "25%",
    feeLabel: "platform fee per closed referral",
    desc: "Perfect for trying Revvin. No commitment.",
    features: [
      "List your business for free",
      "Create unlimited referral offers",
      "Receive and manage referrals",
      "Platform-mediated payouts",
      "Basic business profile",
      "Email notifications",
    ],
    cta: "Get Started Free",
    featured: false,
  },
  {
    name: "Starter",
    price: "$50",
    period: "/mo",
    fee: "10%",
    feeLabel: "platform fee per closed referral",
    desc: "For businesses actively acquiring through referrals.",
    features: [
      "Everything in Free",
      "Lower 10% platform fee",
      "Priority business review",
      "Enhanced profile visibility",
      "Referral analytics",
      "Priority support",
    ],
    cta: "Start Starter Plan",
    featured: true,
  },
  {
    name: "Pro",
    price: "$250",
    period: "/mo",
    fee: "1%",
    feeLabel: "platform fee per closed referral",
    desc: "For high-volume referral programs.",
    features: [
      "Everything in Starter",
      "Minimal 1% platform fee",
      "Featured marketplace placement",
      "Advanced analytics dashboard",
      "Dedicated support",
      "Custom payout terms",
    ],
    cta: "Go Pro",
    featured: false,
  },
  {
    name: "Enterprise",
    price: "$500",
    period: "/mo",
    fee: "Custom",
    feeLabel: "negotiated rate",
    desc: "For organizations running referral programs at scale.",
    features: [
      "Everything in Pro",
      "Custom platform fee negotiation",
      "Premium featured placement",
      "Multi-location support",
      "Dedicated account manager",
      "Custom integrations",
    ],
    cta: "Contact Us",
    featured: false,
  },
];

const faqItems = [
  { q: "What is the platform fee?", a: "When a referral results in a closed deal, Revvin charges the business a platform fee on top of the referrer's payout. For example, if you offer a $100 referral reward on the Free plan (25% fee), your total cost would be $125. The referrer always receives the full $100." },
  { q: "Does the referrer pay anything?", a: "Never. Referrers always receive 100% of the advertised payout amount. The platform fee is only charged to the business." },
  { q: "Can I upgrade or downgrade anytime?", a: "Yes. You can change your plan at any time. Changes take effect on your next billing cycle." },
  { q: "Is there a contract or minimum commitment?", a: "No. All plans are month-to-month. You can cancel anytime." },
  { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards through Stripe." },
];

const Pricing = () => (
  <div>
    <SEOHead
      title="Pricing — Revvin Referral Marketplace"
      description="Free to list. Pay only when referrals close. Choose the plan that fits your referral volume — from free to enterprise."
      path="/pricing"
    />

    {/* Hero */}
    <section className="pt-28 pb-16 lg:pt-36 lg:pb-20">
      <div className="container text-center">
        <motion.div initial="hidden" animate="visible">
          <motion.p variants={fadeUp} custom={0} className="section-label mb-3">Pricing</motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Simple, transparent pricing
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
            Free to list your business. Pay a small platform fee only when a referral converts into a real customer. Referrers always earn 100%.
          </motion.p>
        </motion.div>
      </div>
    </section>

    {/* Pricing Cards */}
    <section className="pb-24 lg:pb-32">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              custom={i}
              className={`rounded-2xl border p-6 relative flex flex-col ${plan.featured ? "border-primary/30 bg-card shadow-md" : "bg-card"}`}
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
              <div className="mb-3">
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/5 text-primary px-2 py-0.5 rounded-full">
                  {plan.fee} {plan.feeLabel}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant={plan.featured ? "default" : "outline"} className="w-full" asChild>
                <Link to={plan.name === "Enterprise" ? "/auth?mode=signup&role=business" : "/auth?mode=signup&role=business"}>
                  {plan.cta}
                </Link>
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>

    {/* How the fee works */}
    <section className="py-24 lg:py-32 bg-surface">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="mx-auto max-w-2xl">
          <motion.h2 variants={fadeUp} custom={0} className="text-2xl md:text-3xl font-bold text-center mb-8 tracking-tight">
            How the platform fee works
          </motion.h2>
          <motion.div variants={fadeUp} custom={1} className="rounded-2xl border bg-card p-7">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Example: $500 referral payout on the Free plan (25% fee)</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-lg bg-primary/5 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Referrer earns</p>
                    <p className="text-xl font-bold text-primary">$500</p>
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground mb-1">Platform fee</p>
                    <p className="text-xl font-bold text-foreground">$125</p>
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground mb-1">Business pays</p>
                    <p className="text-xl font-bold text-foreground">$625</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm font-semibold text-foreground mb-2">Same referral on the Starter plan (10% fee)</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-lg bg-primary/5 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Referrer earns</p>
                    <p className="text-xl font-bold text-primary">$500</p>
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground mb-1">Platform fee</p>
                    <p className="text-xl font-bold text-foreground">$50</p>
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground mb-1">Business pays</p>
                    <p className="text-xl font-bold text-foreground">$550</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-6 text-xs text-muted-foreground text-center">
              The referrer always receives the full advertised amount. The platform fee is charged separately to the business.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* FAQ */}
    <section className="py-24 lg:py-32">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="mx-auto max-w-2xl">
          <motion.h2 variants={fadeUp} custom={0} className="text-2xl md:text-3xl font-bold text-center mb-12 tracking-tight">
            Pricing questions
          </motion.h2>
          {faqItems.map((item, i) => (
            <motion.div key={i} variants={fadeUp} custom={i + 1} className="border-b border-border py-5">
              <p className="text-base font-medium text-foreground mb-2">{item.q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-24 lg:py-32 bg-surface">
      <div className="container text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="max-w-xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Start for free today</h2>
          <p className="text-muted-foreground mb-8">List your business, create your first offer, and start receiving referrals. No credit card required.</p>
          <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
            <Link to="/auth?mode=signup&role=business">Create Business Account <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </motion.div>
      </div>
    </section>
  </div>
);

export default Pricing;
