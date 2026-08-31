import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, CheckCircle2, DollarSign, BarChart3, Shield, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import MarqueeTicker from "@/components/MarqueeTicker";
import ROICalculator from "@/components/ROICalculator";

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
      title="Revvin | Referrals, repeat work and reviews"
      description="Turn your past-customer list into referrals, repeat work, and reviews. Your referral page is free. Revvin Pro is $49/month USD. Cancel anytime."
      path="/for-businesses"
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "Revvin for Service Businesses",
          "description": "Customer retention and referral software for service businesses. Turns one past-customer list into three revenue loops: referrals with a branded referral page, link, QR code and lead inbox; repeat work with pre-written rebooking messages to past customers; and reviews with a follow-up referral ask. Also includes reward tracking, an ROI scoreboard, and a print pack. Publishing your referral page is free; Revvin Pro costs a flat $49/month. Businesses pay their referrers directly when deals close.",
          "provider": { "@type": "Organization", "name": "Revvin", "slogan": "Your customer list, working for you" },
          "offers": {
            "@type": "Offer",
            "price": "49",
            "priceCurrency": "USD",
            "description": "Publishing your referral page is free. $49/month for Revvin Pro: customer list import, the bulk referral ask, ROI reporting and custom branding. Cancel anytime. No contract."
          }
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            { "@type": "Question", "name": "How much does Revvin cost?", "acceptedAnswer": { "@type": "Answer", "text": "Publishing your referral page and taking referrals on it is free. Revvin Pro costs a flat $49/month and adds the tools that ask your whole customer list for you: import, the bulk referral ask, ROI reporting and custom branding. Cancel anytime, no contract, no setup fee, no platform fees. You pay your referrers directly off-platform when deals close." } },
            { "@type": "Question", "name": "What are the three loops?", "acceptedAnswer": { "@type": "Answer", "text": "Loop one is referrals: a branded referral page, shareable link and QR code, a lead inbox, and a pre-written referral ask you send from your own phone or email app. Loop two is repeat work: pre-written seasonal and maintenance messages to past customers. Loop three is reviews: a review ask after a job, followed by a referral ask to happy customers. All three run off the same past-customer list." } },
            { "@type": "Question", "name": "What happens if a referral doesn't close?", "acceptedAnswer": { "@type": "Answer", "text": "You pay your referrer nothing because they only earn when a deal closes. Your referral page costs nothing, and the only optional cost is the flat $49/month Revvin Pro subscription." } },
            { "@type": "Question", "name": "Who decides the referral payout amount?", "acceptedAnswer": { "@type": "Answer", "text": "The business sets the payout based on what a closed customer is worth. Referrers receive 100% of that advertised amount." } },
            { "@type": "Question", "name": "How is this different from Google Ads or Facebook Ads?", "acceptedAnswer": { "@type": "Answer", "text": "Ads charge per click or impression with no guarantee of conversion. With Revvin your referral page is free, and Revvin Pro is a flat $49/month subscription with no platform fees. You pay your referrers directly when deals close." } }
          ]
        }
      ]}
    />

    {/* Hero */}
    <section className="relative pt-28 pb-24 lg:pt-36 lg:pb-32">
      <div className="absolute inset-0 dot-grid opacity-50" />
      <div className="container relative z-10 text-center">
        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0}>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Building2 className="h-3.5 w-3.5" /> For Businesses
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight text-foreground">
            Stop paying for clicks.
            <br />
            <span className="text-primary">Start working the list you have.</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Every customer who ever paid you is a referral, a repeat job, or a review waiting to happen. Revvin runs all three loops off that one list. Your referral page is free, and Revvin Pro is $49/month USD. You pay your referrers directly when deals close.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
            <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
              <Link to="/signup">Build your page — free <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-sm" asChild>
              <Link to="/how-it-works">How It Works</Link>
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} custom={4} className="mt-4 text-xs text-muted-foreground">
            Free referral page · Revvin Pro $49/month · Cancel anytime
          </motion.p>
        </motion.div>
      </div>
    </section>

    {/* Social proof ticker */}
    <section className="py-3 bg-muted/30 border-y border-border overflow-hidden">
      <MarqueeTicker items={["Referrals", "Repeat work", "Reviews", "Free referral page", "Revvin Pro $49/month", "You set the referrer payout", "Pay referrers directly", "Cancel anytime"]} />
    </section>
    <section className="py-24 lg:py-32 bg-surface">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-4xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">How it works</motion.p>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
            From setup to payout in 4 steps
          </motion.h2>
          <div className="grid gap-12 md:gap-8 md:grid-cols-4 text-center">
            {[
              { num: "01", title: "Set up and import", desc: "Add your business details, logo, and service area, then import the customers who already paid you." },
              { num: "02", title: "Set your payout", desc: "Define what you'll pay a referrer for a closed deal: flat fee or percentage." },
              { num: "03", title: "Send the ask", desc: "Share your link and QR code, and send a pre-written referral ask to your customer list from your own phone or email app." },
              { num: "04", title: "Close and pay", desc: "Work leads in your inbox, close deals, and pay your referrer directly. They are notified at pending and at paid." },
            ].map((item, i) => (
              <motion.div key={item.num} variants={fadeUp} custom={i + 1}>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5 text-sm font-bold text-primary">
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

    {/* Benefits */}
    <section className="py-24 lg:py-32">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-4xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">Why businesses choose Revvin</motion.p>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
            Better than ads. Simpler than hiring.
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: DollarSign, title: "Flat monthly price", desc: "Your page is free. $49/month flat for Revvin Pro. No per-referral fee from Revvin; you decide what to pay your own referrers when deals close." },
              { icon: Users, title: "Warm introductions", desc: "Referrals come from people who know your next customer, not algorithms guessing from cookie data." },
              { icon: Shield, title: "Clean records", desc: "Tracked referrals, rewards from pending to paid, and a clear pipeline. No more informal deals and missing follow-ups." },
              { icon: Zap, title: "You press send", desc: "Every ask opens pre-written and pre-filled in your own texting or email app, so it comes from you, not from us." },
              { icon: BarChart3, title: "Full visibility", desc: "Track referrals, payouts, and an ROI scoreboard all from your dashboard." },
              { icon: CheckCircle2, title: "You set the terms", desc: "Choose your payout amount, define qualification criteria, and control your referral program." },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i + 1} className="rounded-xl border bg-card p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>

    {/* ROI Calculator */}
    <section className="py-24 lg:py-32 bg-surface">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-2xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="section-label text-center mb-3">The math</motion.p>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center mb-8 tracking-tight">
            See what you'd save vs. ads
          </motion.h2>
          <motion.div variants={fadeUp} custom={1}>
            <ROICalculator />
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Pricing Hook */}
    <section className="py-24 lg:py-32 bg-surface">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-2xl mx-auto text-center">
          <motion.p variants={fadeUp} custom={0} className="section-label mb-3">Simple economics</motion.p>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            Your page is free. Pro is $49/month.
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-sm mb-8 max-w-lg mx-auto">
            Build your page, publish it, and take referrals at no cost. Revvin Pro is one flat $49/month, billed monthly, and adds the tools that ask your whole customer list for you across referrals, repeat work, and reviews. Cancel any time and your page stays live and your referrals keep coming in; you only lose the Pro tools. No contract, no setup fee, no per-referral cut. You pay referrers directly when deals close.
          </motion.p>
          <motion.div variants={fadeUp} custom={2} className="inline-flex flex-wrap items-center justify-center gap-4">
            {["Free referral page", "Revvin Pro $49/month", "All three loops included", "You set the payout", "Cancel anytime", "Pay referrers directly"].map(item => (
              <span key={item} className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                {item}
              </span>
            ))}
          </motion.div>
          <motion.div variants={fadeUp} custom={3} className="mt-10">
            <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
              <Link to="/signup">Build your page — free <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Referrer accounts are always free.</p>
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-24 lg:py-32 bg-surface">
      <div className="container text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="max-w-xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Start acquiring customers today</h2>
          <p className="text-muted-foreground mb-8">Create your business account for free, set your referral payout, and publish your page at no cost.</p>
          <Button size="lg" className="h-12 px-8 text-sm gap-2" asChild>
            <Link to="/signup">Build your page — free <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">Free referral page. Revvin Pro $49/month. Cancel anytime.</p>
        </motion.div>
      </div>
    </section>
  </div>
);

export default ForBusinesses;
