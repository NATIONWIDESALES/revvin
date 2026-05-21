import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const includes = [
  "Branded referral page",
  "Referral offer builder",
  "Lead capture form",
  "Lead dashboard",
  "QR code (PNG + print)",
  "Shareable link",
  "Email and SMS lead notifications",
  "Edit your offer anytime",
  "Stripe billing portal",
];

const Pricing = () => {
  return (
    <>
      <SEOHead
        title="Pricing — Revvin"
        description="One simple plan. $147 for the first 3 months, then $49/month. Cancel anytime."
        path="/pricing"
      />

      <section className="relative overflow-hidden border-b border-border hero-radial">
        <div aria-hidden className="absolute inset-0 grid-faint" />
        <div className="container relative max-w-3xl py-24 text-center">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Pricing</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
            One simple plan. No surprises.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Everything you need to launch a referral program for your business.
          </p>
        </div>
      </section>

      <section>
        <div className="container max-w-2xl py-20">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-10 shadow-product md:p-14">
            <span className="absolute left-0 top-0 h-full w-[3px] bg-primary" />
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Business Referral Page</p>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                Only plan
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-6xl font-extrabold tracking-tight text-foreground">$147</span>
              <span className="text-base font-medium text-muted-foreground">for the first 3 months</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Then $49/month. Cancel anytime — access continues through the end of the paid period.
            </p>

            <Button size="lg" className="mt-8 h-12 w-full text-base shadow-soft hover:bg-primary-deep" asChild>
              <Link to="/signup">Start your referral program</Link>
            </Button>

            <div className="mt-10 grid grid-cols-1 gap-y-3 border-t border-border pt-8 sm:grid-cols-2 sm:gap-x-8">
              {includes.map((f) => (
                <div key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm text-foreground">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Revvin does not pay referrers for you. You pay referrers directly when the deal closes.
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-surface-warm">
        <div className="container max-w-3xl py-20">
          <h2 className="mb-8 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Common questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="p1">
              <AccordionTrigger>How does the $147 work?</AccordionTrigger>
              <AccordionContent>
                $147 is charged at signup and covers your first 3 months. After that, billing switches to $49/month automatically.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="p2">
              <AccordionTrigger>Can I cancel?</AccordionTrigger>
              <AccordionContent>
                Yes, anytime, from your Stripe customer portal. Your access — and your live referral page — continues until the end of the paid period.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="p3">
              <AccordionTrigger>Is there a free tier?</AccordionTrigger>
              <AccordionContent>No free tier.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="p4">
              <AccordionTrigger>Does Revvin charge a platform fee per referral?</AccordionTrigger>
              <AccordionContent>
                No. Revvin is the infrastructure, not a middleman on payouts. You keep 100% of the relationship with your referrer.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </>
  );
};

export default Pricing;