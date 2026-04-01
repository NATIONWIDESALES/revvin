import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, BadgeCheck, Clock, Scale, AlertTriangle, DollarSign, Users, Briefcase, CheckCircle2, ArrowRight, FileCheck, Eye } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const TrustCenter = () => {
  return (
    <div>
      <SEOHead title="Trust & Payouts — Revvin Verification and Dispute Resolution" description="How Revvin protects both businesses and referrers with verification, dispute resolution, and transparent payout economics. Full referrer payouts, verified businesses, fair dispute process." path="/trust" />
      {/* Hero */}
      <section className="hero-gradient py-20">
        <div className="container text-center">
          <motion.div initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0}>
              <Shield className="mx-auto mb-4 h-12 w-12 text-primary-foreground/80" />
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl font-bold text-primary-foreground md:text-5xl">
              Trust & Payouts
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-primary-foreground/70 max-w-2xl mx-auto">
              Revvin's verification and payout system ensures every referral commission is tracked transparently — in both Canada (CAD) and United States (USD).
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* How Payouts Work */}
      <section className="py-20">
        <div className="container max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3">How Payouts Work</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground mb-10 max-w-xl">
              Revvin coordinates every payout from submission to close to payment. Here's the flow:
            </motion.p>
            <div className="space-y-4">
              {[
                { step: "1", title: "Business Posts Offer", desc: "The business sets a payout amount (flat fee or percentage) and publishes their referral offer to the marketplace.", icon: Briefcase, color: "text-primary" },
                { step: "2", title: "Referrer Submits a Lead", desc: "A referrer submits a qualified lead with contact details and notes. First submission wins — timestamped for fairness.", icon: Users, color: "text-earnings" },
                { step: "3", title: "Business Accepts & Works the Deal", desc: "The business reviews the referral, accepts it, and works toward closing the deal. Payout terms are locked at acceptance.", icon: CheckCircle2, color: "text-primary" },
                { step: "4", title: "Deal Closes → Payout Processed", desc: "When the deal is marked as won, Revvin verifies the outcome and processes the payout. The referrer receives 100% of the advertised amount. The platform fee is charged separately to the business.", icon: DollarSign, color: "text-earnings" },
                { step: "↩", title: "Deal Lost → No Charge", desc: "If the referral is declined or the deal is lost, no payout is created. The business pays nothing.", icon: ArrowRight, color: "text-muted-foreground" },
              ].map((item, i) => (
                <motion.div key={item.step} variants={fadeUp} custom={i + 2} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shrink-0">{item.step}</div>
                  <div className="flex-1">
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                  <item.icon className={`h-5 w-5 ${item.color} shrink-0 mt-1`} />
                </motion.div>
              ))}
            </div>

            {/* Early Access Note */}
            <motion.div variants={fadeUp} custom={7} className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-5 text-center">
              <p className="text-sm text-foreground font-medium">
                During early access, payouts are processed by Revvin after a verified close.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                We're building automated payout rails — for now, our team manually verifies and processes every payout.
              </p>
            </motion.div>

            {/* Payout Example */}
            <motion.div variants={fadeUp} custom={8} className="mt-10 rounded-xl border border-border bg-muted/30 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" /> Payout Examples — CAD & USD
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-3">Canada Example (CAD) — Free Tier</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-card border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Advertised Payout</p>
                      <p className="text-lg font-bold">CA$600</p>
                    </div>
                    <div className="rounded-xl bg-earnings/10 border border-earnings/20 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Referrer Earns</p>
                      <p className="text-lg font-bold text-earnings">CA$600</p>
                    </div>
                    <div className="rounded-xl bg-card border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Business Total Cost</p>
                      <p className="text-lg font-bold">CA$750</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-3">USA Example (USD) — Paid Tier</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-card border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Advertised Payout</p>
                      <p className="text-lg font-bold">$500</p>
                    </div>
                    <div className="rounded-xl bg-earnings/10 border border-earnings/20 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Referrer Earns</p>
                      <p className="text-lg font-bold text-earnings">$500</p>
                    </div>
                    <div className="rounded-xl bg-card border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Business Total Cost</p>
                      <p className="text-lg font-bold">$550</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">Referrers always earn the full advertised payout. The platform fee is charged to the business separately — it depends on the business's selected plan.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Verification Levels */}
      <section className="border-y border-border bg-muted/30 py-20">
        <div className="container max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3">Business Verification Levels</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground mb-10 max-w-xl">
              Every business on Revvin goes through a verification process before their offers are visible to referrers.
            </motion.p>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { level: "Unverified", icon: AlertTriangle, color: "text-muted-foreground", bg: "bg-muted", desc: "Account created, but business details not yet reviewed. Limited visibility in marketplace." },
                { level: "Verified Email & Domain", icon: BadgeCheck, color: "text-primary", bg: "bg-primary/10", desc: "Email domain verified against business website. Offers visible but marked as 'Basic Verified'." },
                { level: "Fully Verified Business", icon: Shield, color: "text-earnings", bg: "bg-earnings/10", desc: "Business license, insurance, and contact information reviewed. Priority placement in search results." },
              ].map((item, i) => (
                <motion.div key={item.level} variants={fadeUp} custom={i + 2} className="rounded-xl border border-border bg-card p-6">
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${item.bg}`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{item.level}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How Outcomes Are Verified */}
      <section className="py-20">
        <div className="container max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3">How Outcomes Are Verified</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground mb-10 max-w-xl">
              We track every referral from submission to payout to ensure fairness.
            </motion.p>
            <div className="space-y-4">
              {[
                { step: "1", title: "Referral Submitted", desc: "Referrer submits lead details with timestamp. First submission wins for duplicate protection.", icon: Users },
                { step: "2", title: "Business Accepts → Terms Locked", desc: "Business reviews the lead and accepts it. The payout amount and type are snapshotted at this point.", icon: CheckCircle2 },
                { step: "3", title: "Deal Outcome Recorded", desc: "Business marks the referral as won or lost. Revenue and deal details are logged.", icon: FileCheck },
                { step: "4", title: "Verified Close → Payout Processed", desc: "Revvin verifies the outcome and processes the payout. The referrer receives 100% of the advertised amount.", icon: DollarSign },
              ].map((item, i) => (
                <motion.div key={item.step} variants={fadeUp} custom={i + 2} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shrink-0">{item.step}</div>
                  <div className="flex-1">
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                  <item.icon className="h-5 w-5 text-primary shrink-0 mt-1" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Payout Timeline */}
      <section className="py-20">
        <div className="container max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3">Payout Timelines</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground mb-10 max-w-xl">
              Businesses choose their payout timeline when creating an offer. Referrers always know when to expect payment.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Net 7", desc: "Payout 7 days after verified close", speed: "Fastest" },
                { label: "Net 14", desc: "Payout 14 days after verified close", speed: "Standard" },
                { label: "Net 30", desc: "Payout 30 days after verified close", speed: "Extended" },
              ].map((t) => (
                <div key={t.label} className="rounded-xl border border-border bg-card p-6 text-center">
                  <Clock className="mx-auto mb-3 h-8 w-8 text-primary" />
                  <h3 className="text-2xl font-bold">{t.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                  <p className="text-xs text-primary font-medium mt-2">{t.speed}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Dispute Resolution */}
      <section className="border-y border-border bg-muted/30 py-20">
        <div className="container max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3">Dispute Resolution</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground mb-10 max-w-xl">
              Disagreements happen. Here's how we handle them fairly.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="grid gap-4 md:grid-cols-2">
              {[
                { title: "Referrer Disputes Outcome", desc: "If a referrer believes their referral resulted in a deal but was marked as 'lost', they can file a dispute. Revvin reviews the timeline and evidence." },
                { title: "Business Disputes Lead Quality", desc: "If a business believes the lead didn't meet qualification criteria, they can provide a reason. The referrer is notified and can respond." },
                { title: "Duplicate Lead Disputes", desc: "If two referrers submit the same lead, the first timestamped submission wins. In contested cases, Revvin reviews the evidence and makes a determination." },
                { title: "Resolution Timeline", desc: "All disputes are reviewed within 5 business days. Both parties are notified of the outcome. Appeals can be submitted once." },
              ].map((item, i) => (
                <motion.div key={item.title} variants={fadeUp} custom={i + 3} className="rounded-xl border border-border bg-card p-6">
                  <Scale className="mb-3 h-5 w-5 text-primary" />
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Platform Fee Transparency */}
      <section className="py-20">
        <div className="container max-w-4xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3">Platform Fee Transparency</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground mb-10 max-w-xl mx-auto">
              Revvin is aligned with successful outcomes. We only earn when you earn.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="rounded-xl border border-border bg-card p-8 shadow-sm">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-muted/50 border border-border p-5">
                  <Briefcase className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <div className="text-3xl font-bold text-foreground">$0</div>
                  <p className="text-xs text-muted-foreground mt-1">To list an offer</p>
                </div>
                <div className="rounded-xl bg-earnings/10 border border-earnings/20 p-5">
                  <Users className="mx-auto mb-2 h-6 w-6 text-earnings" />
                  <div className="text-3xl font-bold text-earnings">100%</div>
                  <p className="text-xs text-muted-foreground mt-1">Goes to referrer</p>
                </div>
                <div className="rounded-xl bg-muted/50 border border-border p-5">
                  <Briefcase className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <div className="text-3xl font-bold text-foreground">10–25%</div>
                  <p className="text-xs text-muted-foreground mt-1">Business platform fee</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-6">
                Referrers always earn the full advertised payout. The platform fee is charged to the business on each successful close — the rate depends on the business's selected plan.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="container text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold">Ready to Get Started?</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-3 text-muted-foreground text-lg">Join a marketplace built on trust and transparency</motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8 flex justify-center gap-4">
              <Button size="lg" className="gap-2 h-12 px-8" asChild>
                <Link to="/auth?mode=signup&role=referrer">Start Earning <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8" asChild>
                <Link to="/auth?mode=signup&role=business">List Your Business</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default TrustCenter;
