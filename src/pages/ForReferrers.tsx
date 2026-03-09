import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, BadgeCheck, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import IMessageThread from "@/components/iMessageThread";
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

const ForReferrers = () => (
  <div>
    <SEOHead title="Revvin for Referrers — Earn Money Referring Customers You Trust" description="Browse paid referral opportunities across Canada and the USA. Earn $150 to $1,500+ per closed referral. Free to join." path="/for-referrers" />

    {/* Hero */}
    <section className="relative pt-32 pb-28 lg:pt-40 lg:pb-36 dot-grid">
      <div className="container relative z-10 text-center">
        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0}>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-earnings/15 bg-earnings/5 px-4 py-1.5 text-xs font-medium text-earnings">
              <Users className="h-3.5 w-3.5" /> For Referrers
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight text-foreground">
            Know someone who
            <br />
            <span className="text-earnings">needs a service?</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Get paid for the introduction. It's that simple.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-10 flex justify-center gap-4">
            <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
              <Link to="/auth?mode=signup&role=referrer">Start Earning <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-sm" asChild>
              <Link to="/browse">Browse Offers</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* iMessage Conversation */}
    <section className="py-28 lg:py-36 bg-surface">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-4xl mx-auto">
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight">
            You're already doing this
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-center mb-16 text-sm">
            Now you get paid for it.
          </motion.p>
          <div className="flex flex-col md:flex-row justify-center items-center md:items-start max-w-3xl mx-auto">
            <div className="text-center md:rotate-[-3deg] md:z-10 md:-mr-6">
              <IMessageThread />
              <p className="mt-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">You make the introduction</p>
            </div>
            <div className="text-center md:rotate-[3deg] md:z-0 mt-12 md:mt-0">
              <PhoneNotification variant="referrer" />
              <p className="mt-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">You get paid when it closes</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Why referrers love it — just 2 items */}
    <section className="py-28 lg:py-36">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-2xl mx-auto">
          <div className="grid gap-8 md:grid-cols-2">
            <motion.div variants={fadeUp} custom={0} className="glass-card text-center">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-earnings/5">
                <BadgeCheck className="h-6 w-6 text-earnings" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Verified businesses</h3>
              <p className="text-sm text-muted-foreground">Every business is reviewed before offers go live.</p>
            </motion.div>
            <motion.div variants={fadeUp} custom={1} className="glass-card text-center">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-earnings/5">
                <Trophy className="h-6 w-6 text-earnings" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Badges & leaderboards</h3>
              <p className="text-sm text-muted-foreground">Build your reputation. Climb city rankings.</p>
            </motion.div>
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
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Start earning from referrals</h2>
          <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
            <Link to="/auth?mode=signup&role=referrer">Create Free Account <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">Free to join. No credit card required.</p>
        </motion.div>
      </div>
    </section>
  </div>
);

export default ForReferrers;
