import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle2, ArrowRight, DollarSign, Shield, MapPin, Trophy, Globe, Wallet, Zap } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const ForReferrers = () => (
  <div>
    <SEOHead title="For Referrers — Earn Commissions" description="Browse paid referral opportunities across Canada and the USA. Earn 90% commissions when deals close. Free to join." path="/for-referrers" />
    <section className="hero-gradient py-20">
      <div className="container text-center">
        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0}>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-sm font-medium text-primary-foreground">
              <Users className="h-4 w-4" /> For Referrers
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="font-display text-4xl font-bold text-primary-foreground md:text-5xl">
            Know Someone Who Needs a Service?<br />Get Paid for the Introduction.
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-primary-foreground/70 max-w-2xl mx-auto">
            Browse paid referral opportunities across Canada 🇨🇦 and the United States 🇺🇸. Earn real commissions when deals close.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-8 flex justify-center gap-4">
            <Button size="lg" variant="secondary" className="gap-2 h-12 px-8" asChild>
              <Link to="/auth?mode=signup&role=referrer">Start Earning <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 gap-2 h-12 px-8 border border-primary-foreground/20" asChild>
              <Link to="/browse">Browse Offers</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>

    <section className="py-20">
      <div className="container max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold mb-10 text-center">How You Earn</motion.h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: "01", icon: MapPin, title: "Find Opportunities", desc: "Browse by map, category, city, or payout. Filter by Canada, USA, or both." },
              { step: "02", icon: Users, title: "Submit Referrals", desc: "Know someone who needs a service? Submit their details. First submission wins." },
              { step: "03", icon: DollarSign, title: "Earn on Close", desc: "When the deal closes, you earn 90% of the referral fee. Paid via e-Transfer (CA) or ACH (US)." },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i + 1} className="rounded-2xl border border-border bg-card p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-earnings/10">
                  <item.icon className="h-6 w-6 text-earnings" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>

    <section className="border-y border-border bg-muted/30 py-20">
      <div className="container max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold mb-10 text-center">Payout Methods by Country</motion.h2>
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div variants={fadeUp} custom={1} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display font-bold mb-3">🇨🇦 Canada — Paid in CAD</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-earnings shrink-0" /> Interac e-Transfer (fastest)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-earnings shrink-0" /> Direct deposit via EFT</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-earnings shrink-0" /> Payout timelines: Net 7 / Net 14 / Net 30</li>
              </ul>
            </motion.div>
            <motion.div variants={fadeUp} custom={2} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display font-bold mb-3">🇺🇸 United States — Paid in USD</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-earnings shrink-0" /> ACH direct deposit</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-earnings shrink-0" /> Bank transfer</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-earnings shrink-0" /> Payout timelines: Net 7 / Net 14 / Net 30</li>
              </ul>
            </motion.div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
            <Shield className="h-3.5 w-3.5 text-primary" /> Powered by Stripe — secure payout rails (prototype)
          </p>
        </motion.div>
      </div>
    </section>

    <section className="py-20">
      <div className="container max-w-4xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold mb-10 text-center">Why Referrers Love Revvin</motion.h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Shield, title: "Funds Secured", desc: "Look for the badge — it means the payout is backed by escrowed funds." },
              { icon: Trophy, title: "Badges & Leaderboards", desc: "Earn badges, climb city and country leaderboards, build your reputation." },
              { icon: Wallet, title: "Transparent Economics", desc: "You keep 90% of every referral fee. 10% platform fee, no hidden costs." },
              { icon: Globe, title: "Cross-Border Opportunities", desc: "Browse offers in Canada and the USA. Filter by country, province/state, or city." },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i + 1} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-earnings/10 shrink-0">
                  <item.icon className="h-5 w-5 text-earnings" />
                </div>
                <div>
                  <h3 className="font-display font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>

    <section className="border-t border-border bg-muted/30 py-20">
      <div className="container text-center">
        <h2 className="font-display text-3xl font-bold mb-4">Start Earning From Referrals</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">Free to join. Earn real commissions across Canada and the United States.</p>
        <div className="flex justify-center gap-4">
          <Button size="lg" className="gap-2 h-12 px-8" asChild>
            <Link to="/auth?mode=signup&role=referrer">Create Free Account <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8" asChild>
            <Link to="/browse">Browse Opportunities</Link>
          </Button>
        </div>
      </div>
    </section>
  </div>
);

export default ForReferrers;
