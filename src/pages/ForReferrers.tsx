import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, BadgeCheck, Trophy, DollarSign, Search, Shield, CheckCircle2 } from "lucide-react";
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

const ForReferrers = () => (
  <div>
    <SEOHead title="Revvin for Referrers — Earn Money Referring Customers You Trust" description="Browse paid referral opportunities across Canada and the USA. Earn $75 to $1,500+ per closed referral. Free to join. Earn the full advertised payout." path="/for-referrers" />

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
            Know someone who
            <br />
            <span className="text-earnings">needs a service?</span>
            <br />
            Get paid for the intro.
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Browse businesses willing to pay real money for customer referrals. Submit a referral. Earn when the deal closes.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
            <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
              <Link to="/auth?mode=signup&role=referrer">Start Earning <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-sm gap-2" asChild>
              <Link to="/browse"><Search className="h-4 w-4" /> Browse Offers</Link>
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} custom={4} className="mt-4 text-xs text-muted-foreground">
            Free to join · No fees ever · Keep 100% of every payout
          </motion.p>
        </motion.div>
      </div>
    </section>

    {/* How it works */}
    <section className="py-24 lg:py-32 bg-surface">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-4xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">How referrers earn</motion.p>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
            You're already making introductions. Now get paid.
          </motion.h2>
          <div className="grid gap-12 md:gap-8 md:grid-cols-3 text-center">
            {[
              { num: "01", title: "Find an opportunity", desc: "Browse live referral offers from real businesses. See what they'll pay for a new customer." },
              { num: "02", title: "Submit a referral", desc: "Know someone who needs the service? Submit their info through Revvin. First submission wins." },
              { num: "03", title: "Earn when it closes", desc: "When the business closes the deal, you get paid the full advertised amount. Automatically." },
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
          <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">Why referrers choose Revvin</motion.p>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
            Your network is worth more than you think
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: DollarSign, title: "Earn the full payout", desc: "The full advertised payout goes to you. Revvin charges a separate fee to the business — you keep every dollar." },
              { icon: BadgeCheck, title: "Verified businesses", desc: "Every business on Revvin is reviewed and approved. You're referring people to legitimate companies." },
              { icon: Shield, title: "Platform protection", desc: "No chasing businesses for payment. Revvin handles the payout process so you always get paid." },
              { icon: Trophy, title: "Build your reputation", desc: "Earn badges, climb leaderboards, and build a track record as a top referrer." },
              { icon: Search, title: "Browse real opportunities", desc: "Filter by category, city, and payout amount. Find offers that match your network." },
              { icon: CheckCircle2, title: "Works for anyone", desc: "Whether you're a professional connector or just know the right people — Revvin works for you." },
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
              "Real estate agents",
              "Insurance brokers",
              "Financial advisors",
              "Car salespeople",
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
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Start earning from referrals</h2>
          <p className="text-muted-foreground mb-8">Create your free account, browse live offers, and start making introductions that pay.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
              <Link to="/auth?mode=signup&role=referrer">Create Free Account <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-sm gap-2" asChild>
              <Link to="/browse">Browse Offers</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Free forever. No credit card required.</p>
        </motion.div>
      </div>
    </section>
  </div>
);

export default ForReferrers;
