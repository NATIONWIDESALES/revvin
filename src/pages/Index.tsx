import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { ArrowRight, Check, Share2, Inbox, Sparkles } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Index = () => {
  return (
    <>
      <SEOHead
        title="Revvin — Launch a referral program for your business in minutes"
        description="Branded referral page, shareable link and QR code, and a simple lead inbox. One plan. $147 for the first 3 months, then $49/month."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Revvin Business Referral Page",
          description: "Referral program software for service businesses.",
          brand: { "@type": "Brand", name: "Revvin" },
          offers: {
            "@type": "Offer",
            price: "147.00",
            priceCurrency: "USD",
            url: "https://revvin.co/pricing",
            availability: "https://schema.org/InStock",
          },
        }}
      />

      {/* Hero */}
      <section className="border-b border-border bg-background">
        <div className="container py-20 md:py-28 max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-foreground leading-[1.05]">
            Get your own business referral page in minutes.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Launch a branded referral page, create a clear offer, share your link or QR code, and track every referral lead from one simple dashboard.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="h-12 px-6 text-base" asChild>
              <Link to="/signup">
                Start your referral program — $147 for 3 months
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-6 text-base" asChild>
              <Link to="/how-it-works">See how it works</Link>
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Billed upfront for the first 3 months, then $49/month. Cancel anytime.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border">
        <div className="container py-20">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              From signup to referrals in under 10 minutes.
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { n: "01", t: "Build your referral page", d: "Add your logo, write your offer, and pick a custom URL. We do the rest." },
              { n: "02", t: "Share your link or QR code", d: "Email it to past customers. Stick the QR on invoices, jobsites, business cards." },
              { n: "03", t: "Receive and manage leads", d: "Every referral lands in your dashboard. Track status. Pay your referrer directly when the deal closes." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card p-8">
                <div className="text-xs font-mono text-muted-foreground mb-4">{s.n}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{s.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="border-b border-border bg-muted/30">
        <div className="container py-20">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">What you get</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              Everything you need to run a referral program.
            </h2>
          </div>
          <div className="grid gap-x-12 gap-y-4 md:grid-cols-2">
            {[
              "Custom business referral page",
              "Clear referral offer builder",
              "Public lead submission form",
              "Shareable link",
              "Downloadable QR code (PNG + print)",
              "Lead inbox and dashboard",
              "Email and SMS lead notifications",
              "Mobile-friendly referral page",
              "Edit your offer anytime",
              "Stripe billing and customer portal",
            ].map((f) => (
              <div key={f} className="flex items-start gap-3 py-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-base text-foreground">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-b border-border">
        <div className="container py-20">
          <div className="max-w-3xl mx-auto rounded-2xl border-2 border-primary/20 bg-card p-10 md:p-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">One simple plan</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              Business Referral Page
            </h2>
            <div className="mt-6 flex items-baseline justify-center gap-2">
              <span className="text-5xl font-semibold text-foreground">$147</span>
              <span className="text-base text-muted-foreground">for the first 3 months</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Then $49/month. Cancel anytime.</p>
            <Button size="lg" className="h-12 px-8 mt-8" asChild>
              <Link to="/signup">Start your referral program</Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              <Link to="/pricing" className="underline hover:text-foreground">See full plan details</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Example preview */}
      <section className="border-b border-border bg-muted/30">
        <div className="container py-20">
          <div className="max-w-2xl mb-12 mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Example</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              What your referral page looks like.
            </h2>
          </div>
          <div className="max-w-sm mx-auto rounded-3xl border border-border bg-background p-8 shadow-sm">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold text-xl mb-4">
              A
            </div>
            <h3 className="text-lg font-semibold text-foreground">Apex Roofing</h3>
            <p className="text-sm text-muted-foreground mt-1">Residential roofing across Denver, CO</p>
            <div className="mt-6 rounded-xl bg-primary/5 border border-primary/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Referral offer</p>
              <p className="text-2xl font-semibold text-foreground">Refer a customer, earn $500</p>
              <p className="text-xs text-muted-foreground mt-1">Paid per closed roofing job.</p>
            </div>
            <Button className="w-full mt-6" size="lg">Submit a referral</Button>
            <p className="text-[10px] text-muted-foreground text-center mt-3">Powered by REVVIN.CO</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border">
        <div className="container py-20 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Questions</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-10">
            Frequently asked.
          </h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger>Does Revvin pay the referrers for me?</AccordionTrigger>
              <AccordionContent>
                No. Revvin is the infrastructure — your branded page, lead capture, and dashboard. You pay referrers directly when the deal closes, in whatever way works for your business.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>How does billing work?</AccordionTrigger>
              <AccordionContent>
                You pay $147 upfront, which covers your first 3 months. After that, it renews at $49/month. You can cancel anytime, and you keep access until the end of the period you've already paid for.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Is there a free tier?</AccordionTrigger>
              <AccordionContent>
                No. We keep one simple plan so we can support every customer well.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>Do you have a marketplace where I can browse referrers?</AccordionTrigger>
              <AccordionContent>
                Not for V1. Revvin powers your own referral program. Your network — customers, partners, employees — sends you the leads.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger>What if I cancel?</AccordionTrigger>
              <AccordionContent>
                You can cancel from your Stripe customer portal anytime. Your referral page stays live until the end of the paid period.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q6">
              <AccordionTrigger>What kind of businesses is Revvin for?</AccordionTrigger>
              <AccordionContent>
                Service businesses where one new customer is worth real money — roofers, HVAC, plumbers, real estate, mortgage, insurance, solar, home services, and more.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section>
        <div className="container py-20 text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            Launch your referral program today.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One plan. $147 for the first 3 months. Cancel anytime.
          </p>
          <Button size="lg" className="h-12 px-8 mt-8" asChild>
            <Link to="/signup">Start your referral program</Link>
          </Button>
        </div>
      </section>
    </>
  );
};

export default Index;