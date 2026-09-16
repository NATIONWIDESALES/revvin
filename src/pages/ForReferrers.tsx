import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, DollarSign, Shield, CheckCircle2, FileText } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import MarqueeTicker from "@/components/MarqueeTicker";

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

const ForReferrers = () => (
  <div>
    <SEOHead
      title="How Referring Works | Revvin"
      description="Someone sent you a Revvin link? Learn how to submit a referral, when a fixed reward becomes owed, and how the business pays you directly."
      path="/for-referrers"
      noindex
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "How do I get paid as a referrer?", "acceptedAnswer": { "@type": "Answer", "text": "When the business confirms the referred customer closed a deal, the business pays you directly for the full advertised amount, using whatever method they publish on their offer. Revvin does not hold or send the money." } },
          { "@type": "Question", "name": "Does Revvin take a cut of my earnings?", "acceptedAnswer": { "@type": "Answer", "text": "No. You receive the full advertised fixed reward directly from the business. Revvin does not hold, move, or take a cut of reward money." } },
          { "@type": "Question", "name": "Do I need to be a professional to refer?", "acceptedAnswer": { "@type": "Answer", "text": "No. Anyone with a network, friends, family, neighbors, clients, can submit referrals and earn." } },
          { "@type": "Question", "name": "What if someone else refers the same customer first?", "acceptedAnswer": { "@type": "Answer", "text": "Revvin uses a first-in-wins policy. The first valid referral submitted for a given customer receives credit for the close." } }
        ]
      }}
    />

    {/* Hero */}
    <section className="relative pt-28 pb-24 lg:pt-36 lg:pb-32">
      <div className="absolute inset-0 dot-grid opacity-50" />
      <div className="container relative z-10 text-center">
        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0}>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-earnings/15 bg-earnings/5 px-4 py-1.5 text-xs font-medium text-earnings">
              <Users className="h-3.5 w-3.5" /> For Referrers
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight text-foreground">
            Someone sent you a link?
            <br />
            <span className="text-earnings">Here is how referring works.</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Open the business's referral page, read its terms, and send someone who needs that service. If the referred job closes and qualifies, the business pays you the fixed reward directly.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
            <Button size="lg" variant="outline" className="h-12 px-8 text-sm gap-2" asChild>
              <Link to="/trust">How rewards are tracked <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} custom={4} className="mt-4 text-xs text-muted-foreground">
            No account is required to use the link. Revvin takes no cut. The business pays you directly.
          </motion.p>
        </motion.div>
      </div>
    </section>

    {/* Factual claim ticker. No earnings averages or payout timing claims here:
        the business pays the referrer directly, so Revvin cannot promise speed. */}
    <section className="py-3 bg-muted/30 border-y border-border overflow-hidden">
      <MarqueeTicker items={["100% of the advertised payout", "Paid directly by the business", "Every referral is timestamped", "Revvin does not take a cut of your reward", "Businesses publish their own payout terms", "Free to join"]} />
    </section>
    <section className="py-24 lg:py-32 bg-surface">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-4xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">How it works</motion.p>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
            Follow the terms on the business's page
          </motion.h2>
          <div className="grid gap-12 md:gap-8 md:grid-cols-3 text-center">
            {[
              { num: "01", title: "Read the offer", desc: "The link shows the business, its fixed reward, what qualifies, and when it pays." },
              { num: "02", title: "Submit the referral", desc: "Share the customer's details with their permission. The first valid submission receives credit if more than one person refers the same customer." },
              { num: "03", title: "Follow the result", desc: "If the job closes and qualifies under the offer, the business pays you the fixed amount directly. Revvin records the reward from owed to paid." },
            ].map((item, i) => (
              <motion.div key={item.num} variants={fadeUp} custom={i + 1}>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-earnings/5 text-sm font-bold text-earnings">
                  {item.num}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>

    {/* Why referrers love it */}
    <section className="py-24 lg:py-32">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-4xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">What to expect</motion.p>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
            Clear terms and a clear record
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: DollarSign, title: "The reward is fixed", desc: "The business publishes one dollar amount and pays it directly when the referred job closes and qualifies." },
              { icon: Shield, title: "A clear record", desc: "Every referral is timestamped in your dashboard, and each reward is tracked from pending to paid, so there is always a record of who referred whom and when." },
              { icon: FileText, title: "Terms you can read first", desc: "Businesses publish their own payout terms on their offer, so you know the reward and when it pays before you send a lead." },
              { icon: CheckCircle2, title: "No cut from Revvin", desc: "Revvin does not hold, move, or take a cut of reward money. The business handles payment directly." },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i + 1} className="rounded-xl border bg-card p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-earnings/5">
                  <item.icon className="h-5 w-5 text-earnings" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>

    {/* Who can be a referrer */}
    <section className="py-24 lg:py-32 bg-surface">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-3xl mx-auto text-center">
          <motion.p variants={fadeUp} custom={0} className="section-label mb-3">Who can earn</motion.p>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold mb-12 tracking-tight">
            Anyone with the right connections
          </motion.h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {[
              "Home service pros",
              "Handymen",
              "Community leaders",
              "Content creators",
              "Entrepreneurs",
              "Anyone with a network",
            ].map(role => (
              <motion.div key={role} variants={fadeUp} custom={1} className="rounded-lg border bg-card p-4 text-center">
                <p className="text-sm font-medium text-foreground">{role}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-24 lg:py-32">
      <div className="container text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="max-w-xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Have a referral link?</h2>
          <p className="text-muted-foreground mb-8">Return to the business's page, read the offer, and submit the referral there.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
              <Link to="/trust">Read about trust and rewards <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  </div>
);

export default ForReferrers;
