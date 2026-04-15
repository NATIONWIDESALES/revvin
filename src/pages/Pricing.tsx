import { CheckCircle2, Building2, Zap, Crown, Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/mo",
    fee: "25%",
    feeLabel: "platform fee per close",
    desc: "Get listed quickly with no monthly cost.",
    icon: Building2,
    features: [
      "List your business for free",
      "Create referral offers",
      "Receive and manage referrals",
      "Platform-mediated payouts",
      "Basic business profile",
      "Email notifications",
    ],
    featured: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "$50",
    period: "/mo",
    fee: "10%",
    feeLabel: "platform fee per close",
    desc: "For businesses actively acquiring through referrals.",
    icon: Zap,
    features: [
      "Everything in Free",
      "Lower 10% platform fee",
      "Priority business review",
      "Enhanced profile visibility",
      "Referral analytics",
      "Priority support",
    ],
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$250",
    period: "/mo",
    fee: "1%",
    feeLabel: "platform fee per close",
    desc: "For high-volume referral programs.",
    icon: Crown,
    features: [
      "Everything in Starter",
      "Minimal 1% platform fee",
      "Featured marketplace placement",
      "Advanced analytics dashboard",
      "Dedicated support",
      "Custom payout terms",
    ],
    featured: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$500",
    period: "/mo",
    fee: "Custom",
    feeLabel: "negotiated rate",
    desc: "For referral programs at scale.",
    icon: Rocket,
    features: [
      "Everything in Pro",
      "Custom platform fee",
      "Premium featured placement",
      "Multi-location support",
      "Dedicated account manager",
      "Custom integrations",
    ],
    featured: false,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

const Pricing = () => (
  <div className="py-16 md:py-24">
    <SEOHead
      title="Pricing — REVVIN.CO | Pay Only When Deals Close"
      description="Simple, transparent pricing for businesses. Platform fees are deducted only when a referral closes. Referrers always earn 100% of the advertised payout."
      path="/pricing"
    />
    <div className="container max-w-5xl">
      <motion.div initial="hidden" animate="visible" className="text-center mb-12">
        <motion.h1 variants={fadeUp} custom={0} className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
          Simple pricing. Pay only when deals close.
        </motion.h1>
        <motion.p variants={fadeUp} custom={1} className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Platform fees are deducted from your business wallet when a referral closes. Referrers always earn 100% of the advertised payout.
        </motion.p>
      </motion.div>

      <motion.div initial="hidden" animate="visible" className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            variants={fadeUp}
            custom={i + 2}
            className={`rounded-2xl border p-6 flex flex-col relative ${
              plan.featured
                ? "border-primary bg-primary/[0.02] shadow-sm ring-2 ring-primary/20"
                : "border-border bg-card"
            }`}
          >
            {plan.featured && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                Most Popular
              </span>
            )}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5">
                <plan.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">{plan.name}</span>
            </div>
            <div className="flex items-baseline gap-0.5 mb-1">
              <span className="text-3xl font-bold text-foreground">{plan.price}</span>
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            </div>
            <span className="inline-flex items-center text-xs font-medium bg-primary/5 text-primary px-2.5 py-1 rounded-full mb-4 w-fit">
              {plan.fee} {plan.feeLabel}
            </span>
            <p className="text-sm text-muted-foreground mb-5">{plan.desc}</p>
            <ul className="space-y-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>

      {/* Example block */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-14 rounded-2xl border border-border bg-muted/40 p-6 md:p-8 max-w-3xl mx-auto"
      >
        <h3 className="text-lg font-bold text-foreground mb-3">How it works in practice</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You offer <span className="font-semibold text-foreground">$500</span> per closed roofing customer.
          On the <span className="font-semibold text-foreground">Free plan</span>, you pay $500 to the referrer + $125 platform fee (<span className="font-semibold text-foreground">$625 total</span>).
          On <span className="font-semibold text-foreground">Pro</span>, you pay $500 + $5 (<span className="font-semibold text-foreground">$505 total</span>).
          Ten closes per month on Pro saves you <span className="font-semibold text-primary">$1,200 vs. Free</span>.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.5 }}
        className="mt-12 text-center"
      >
        <Button size="lg" className="gap-2 px-8" asChild>
          <Link to="/auth?mode=signup&role=business">
            Create Free Business Account <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <p className="mt-3 text-sm text-muted-foreground">
          No credit card required. Upgrade anytime from your dashboard.
        </p>
      </motion.div>
    </div>
  </div>
);

export default Pricing;
