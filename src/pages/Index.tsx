import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, DollarSign, Users, Building2, TrendingUp, Search, Shield } from "lucide-react";
import { motion } from "framer-motion";
import OfferCard from "@/components/OfferCard";
import { mockOffers } from "@/data/mockOffers";
import heroBg from "@/assets/hero-bg.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

const Index = () => {
  const featured = mockOffers.filter((o) => o.featured);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden hero-gradient py-24 lg:py-32">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div variants={fadeUp} custom={0}>
              <span className="mb-4 inline-block rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-xs font-medium text-primary-foreground">
                Earn money by referring customers →
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="mb-6 font-display text-4xl font-bold leading-tight text-primary-foreground md:text-6xl"
            >
              Get Paid for Every
              <br />
              <span className="text-accent">Referral You Make</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mb-8 text-lg text-primary-foreground/70"
            >
              Browse referral opportunities from top businesses. Submit leads, track deals, and earn commissions — all in one platform.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="secondary" className="gap-2 font-semibold" asChild>
                <Link to="/browse">
                  Browse Opportunities <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link to="/how-it-works">How It Works</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-card py-12">
        <div className="container">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: "$2.4M+", label: "Paid to Referrers", icon: DollarSign },
              { value: "12,000+", label: "Active Referrers", icon: Users },
              { value: "850+", label: "Business Partners", icon: Building2 },
              { value: "94%", label: "Payout Rate", icon: TrendingUp },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="mx-auto mb-2 h-5 w-5 text-primary" />
                <div className="font-display text-2xl font-bold text-foreground md:text-3xl">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Offers */}
      <section className="py-20">
        <div className="container">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground">Featured Opportunities</h2>
              <p className="mt-2 text-muted-foreground">Top-paying referral programs available now</p>
            </div>
            <Button variant="ghost" className="hidden gap-1 md:flex" asChild>
              <Link to="/browse">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="border-t border-border bg-muted/50 py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold text-foreground">How RefBoard Works</h2>
            <p className="mt-2 text-muted-foreground">Start earning in three simple steps</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Search,
                title: "Browse Offers",
                desc: "Explore referral opportunities from verified businesses across industries.",
              },
              {
                step: "02",
                icon: Users,
                title: "Submit Referrals",
                desc: "Know someone who needs the service? Submit their details securely.",
              },
              {
                step: "03",
                icon: DollarSign,
                title: "Get Paid",
                desc: "When the deal closes, you earn your commission. Simple as that.",
              },
            ].map((item) => (
              <div key={item.step} className="relative rounded-xl border border-border bg-card p-6 text-center">
                <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  {item.step}
                </div>
                <item.icon className="mx-auto mb-4 mt-2 h-8 w-8 text-primary" />
                <h3 className="mb-2 font-display text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Shield className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h2 className="font-display text-3xl font-bold text-foreground">Built on Trust</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Every business on RefBoard is verified. Payouts are tracked transparently, and our rating system ensures quality on both sides of the marketplace.
            </p>
            <Button className="mt-6 gap-2" asChild>
              <Link to="/browse">
                Start Earning Today <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
