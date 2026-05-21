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

      <section className="border-b border-border">
        <div className="container py-20 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            One simple plan. No surprises.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to launch a referral program for your business.
          </p>
        </div>
      </section>

      <section>
        <div className="container py-16 max-w-2xl">
          <div className="rounded-2xl border-2 border-primary bg-card p-10 md:p-12 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Business Referral Page</p>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Only plan
              </span>
            </div>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-5xl font-semibold text-foreground">$147</span>
              <span className="text-base text-muted-foreground">for the first 3 months</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Then $49/month. Cancel anytime — access continues through the end of the paid period.
            </p>

            <Button size="lg" className="h-12 w-full mt-8" asChild>
              <Link to="/signup">Start your referral program</Link>
            </Button>

            <div className="mt-8 border-t border-border pt-6 space-y-3">
              {includes.map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
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

      <section className="border-t border-border bg-muted/30">
        <div className="container py-16 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-8">Common questions</h2>
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