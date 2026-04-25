import { CheckCircle2, Building2, Zap, Crown, Rocket, ArrowRight, Users, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SEOHead from "@/components/SEOHead";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/mo",
    fee: "25%",
    feeLabel: "platform fee per closed referral",
    desc: "Get listed, start receiving referrals — no monthly cost.",
    icon: Building2,
    features: [
      "Free business listing",
      "Create referral offers",
      "Accept or reject referrals",
      "Basic marketplace visibility",
      "Platform-mediated payouts",
      "Email notifications",
    ],
    bestFor: "Best for testing referral marketing",
    featured: false,
  },
  {
    id: "starter",
    name: "Growth",
    price: "$50",
    yearly: "or $500/year",
    period: "/mo",
    fee: "10%",
    feeLabel: "platform fee per closed referral",
    desc: "For businesses actively acquiring through referrals.",
    icon: Zap,
    features: [
      "Everything in Free",
      "Lower 10% platform fee",
      "Enhanced marketplace visibility",
      "More offer / profile detail",
      "Basic analytics",
      "Priority business review",
    ],
    bestFor: "Best for businesses actively using referrals",
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$250",
    period: "/mo",
    fee: "1%",
    feeLabel: "platform fee per closed referral",
    desc: "For high-volume referral programs.",
    icon: Crown,
    features: [
      "Everything in Growth",
      "Minimal 1% platform fee",
      "Featured marketplace placement",
      "Advanced analytics dashboard",
      "Multi-offer support",
      "Multi-location support",
      "Priority support",
    ],
    bestFor: "Best for high-volume businesses",
    featured: false,
  },
  {
    id: "enterprise",
    name: "Elite",
    price: "$500",
    period: "/mo",
    fee: "0%",
    feeLabel: "platform fee on closed referrals",
    desc: "For category leaders running serious referral programs.",
    icon: Rocket,
    features: [
      "Everything in Pro",
      "0% platform fee — keep every dollar",
      "Premium featured placement",
      "Dedicated onboarding",
      "Custom referral campaigns",
      "Multi-location support",
      "Dedicated account manager",
    ],
    bestFor: "Best for category leaders & serious operators",
    featured: false,
  },
];

const faqs = [
  {
    q: "Do businesses pay anything upfront?",
    a: "No. Listing your business and publishing your first referral offer is free. You only pay a platform fee when a referred customer actually closes — and a monthly subscription is optional if you want a lower fee rate.",
  },
  {
    q: "Are referrers ever charged?",
    a: "Never. Revvin is 100% free for referrers. The full advertised payout goes to the referrer on every closed deal — Revvin's platform fee is charged separately to the business.",
  },
  {
    q: "Can businesses change plans later?",
    a: "Yes. You can upgrade, downgrade, or cancel at any time from your dashboard. Changes apply to future referrals — terms locked on existing accepted referrals don't change.",
  },
  {
    q: "What happens if a referral doesn't close?",
    a: "You owe nothing. No close means no payout to the referrer and no platform fee to Revvin. There's zero cost for unconverted referrals.",
  },
  {
    q: "How are platform fees calculated?",
    a: "The fee is a percentage of the advertised payout, applied only when a deal is marked as won. Example on the Free plan: a $500 advertised payout means the referrer earns $500 and the business pays $500 + 25% fee = $625 total.",
  },
  {
    q: "Can a business start completely free?",
    a: "Yes — the Free plan has no monthly cost. Most businesses start on Free, then upgrade once they're consistently closing referred deals and want to reduce the platform fee.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5 },
  }),
};

const Pricing = () => (
  <div className="py-16 md:py-24">
    <SEOHead
      title="Revvin Pricing — Free to List. Pay Per Closed Referral."
      description="Revvin is free for referrers and free for businesses to list. Businesses only pay a platform fee when a referred customer closes. Plans from $0 to 0% fees."
      path="/pricing"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }}
    />

    <div className="container max-w-6xl">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" className="text-center mb-12">
        <motion.span
          variants={fadeUp}
          custom={0}
          className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-5"
        >
          Simple pricing
        </motion.span>
        <motion.h1
          variants={fadeUp}
          custom={1}
          className="text-4xl md:text-5xl font-bold text-foreground tracking-tight"
        >
          Free to list. Pay only when referrals close.
        </motion.h1>
        <motion.p
          variants={fadeUp}
          custom={2}
          className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto"
        >
          Choose a plan that matches how you're using referrals. The platform fee comes off only when a deal actually closes — never upfront, never per click.
        </motion.p>

        {/* Referrer-free strip */}
        <motion.div
          variants={fadeUp}
          custom={3}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-earnings/20 bg-earnings/5 px-4 py-2 text-sm font-medium text-foreground"
        >
          <Users className="h-4 w-4 text-earnings" />
          Referrers are always free and earn 100% of the advertised payout.
        </motion.div>
      </motion.div>

      {/* Plans */}
      <motion.div
        initial="hidden"
        animate="visible"
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"
      >
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            variants={fadeUp}
            custom={i + 4}
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
            {plan.yearly && (
              <p className="text-xs text-muted-foreground mb-1">{plan.yearly}</p>
            )}
            <span className="inline-flex items-center text-xs font-medium bg-primary/5 text-primary px-2.5 py-1 rounded-full mt-2 mb-4 w-fit">
              {plan.fee} {plan.feeLabel}
            </span>
            <p className="text-sm text-muted-foreground mb-5">{plan.desc}</p>
            <ul className="space-y-2 flex-1 mb-5">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-xs font-medium text-muted-foreground border-t border-border pt-4">
              {plan.bestFor}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* How it works in practice */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mt-16 rounded-2xl border border-border bg-muted/40 p-6 md:p-8 max-w-4xl mx-auto"
      >
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">
            Businesses only pay when a referred customer closes
          </h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          You list a referral offer for free. A referrer submits a customer.
          Nothing happens financially until the deal closes. When it closes,
          the referrer gets the full advertised payout, and Revvin's platform
          fee is added on top — never deducted from the referrer.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 mt-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              Free plan example
            </p>
            <p className="text-sm text-foreground">
              You offer{" "}
              <span className="font-bold">$500</span> per closed customer. On
              close, the referrer earns{" "}
              <span className="font-bold text-earnings">$500</span> and you pay{" "}
              <span className="font-bold">$625 total</span> ($500 + 25% fee).
            </p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-semibold text-primary mb-1">
              Elite plan example
            </p>
            <p className="text-sm text-foreground">
              Same{" "}
              <span className="font-bold">$500</span> offer on Elite. The
              referrer earns{" "}
              <span className="font-bold text-earnings">$500</span> and you pay{" "}
              <span className="font-bold">$500 total</span> — 0% platform fee.
            </p>
          </div>
        </div>
      </motion.div>

      {/* FAQ */}
      <div className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3 tracking-tight">
          Pricing FAQ
        </h2>
        <p className="text-center text-muted-foreground text-sm mb-8">
          Everything you need to know about how Revvin charges.
        </p>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border">
              <AccordionTrigger className="text-left text-base font-medium text-foreground hover:no-underline py-5">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* CTA */}
      <div className="mt-16 text-center">
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button size="lg" className="gap-2 px-8 h-12" asChild>
            <Link to="/auth?mode=signup&role=business">
              <Building2 className="h-4 w-4" /> List Your Business
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="gap-2 px-8 h-12" asChild>
            <Link to="/auth?mode=signup&role=referrer">
              <Users className="h-4 w-4" /> Start as a Referrer
            </Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          No credit card required · Upgrade anytime · Free forever for referrers
        </p>
      </div>
    </div>
  </div>
);

export default Pricing;
