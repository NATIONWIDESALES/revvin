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

const proFeatures = [
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

const freeFeatures = [
  "Public referrer profile",
  "Submit referrals to any business on Revvin",
  "Track your referrals in one place",
  "Get paid directly by the business",
];

const launchFeatures = [
  "1:1 onboarding call",
  "Done-for-you offer setup",
  "Custom QR + print-ready flyer",
  "Launch email + SMS templates",
  "30 days of priority support",
];

const addLaunchAtCheckout = () => {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem("revvin_addon_launch", "1");
  }
};

const clearLaunchAtCheckout = () => {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem("revvin_addon_launch");
  }
};

const Pricing = () => {
  return (
    <>
      <SEOHead
        title="Pricing — Revvin"
        description="$49/month, cancel anytime. No contract. Free tier available. Optional $297 Launch Package."
        path="/pricing"
      />

      <section className="relative overflow-hidden border-b border-border hero-radial">
        <div aria-hidden className="absolute inset-0 grid-faint" />
        <div className="container relative max-w-3xl py-24 text-center">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Pricing</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
            $49/month. Cancel anytime.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            No contract, no setup fee. Start free, upgrade when you're ready.
          </p>
        </div>
      </section>

      <section>
        <div className="container max-w-6xl py-20">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Free */}
            <div className="relative flex flex-col rounded-2xl border border-border bg-card p-8 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Free</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">Referrer</h2>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-foreground">$0</span>
                <span className="text-sm text-muted-foreground">forever</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Send referrals to any business on Revvin and get paid directly.
              </p>
              <Button variant="outline" size="lg" className="mt-6 h-11 w-full" asChild onClick={clearLaunchAtCheckout}>
                <Link to="/signup?role=referrer">Create free account</Link>
              </Button>
              <ul className="mt-8 space-y-2.5 border-t border-border pt-6">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro — featured */}
            <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-8 shadow-product md:-mt-4">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Most popular
                </span>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Pro</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">Business Referral Page</h2>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-foreground">$49</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Cancel anytime. No contract, no setup fee.
              </p>
              <Button size="lg" className="mt-6 h-11 w-full shadow-soft hover:bg-primary-deep" asChild onClick={clearLaunchAtCheckout}>
                <Link to="/signup">Start your referral program</Link>
              </Button>
              <ul className="mt-8 space-y-2.5 border-t border-border pt-6">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Launch Package add-on */}
            <div className="relative flex flex-col rounded-2xl border border-border bg-card p-8 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Add-on</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">Launch Package</h2>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-foreground">+$297</span>
                <span className="text-sm text-muted-foreground">one-time</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Optional. We set up your offer, page, and launch assets with you.
              </p>
              <Button variant="outline" size="lg" className="mt-6 h-11 w-full" asChild onClick={addLaunchAtCheckout}>
                <Link to="/signup">Add at checkout</Link>
              </Button>
              <ul className="mt-8 space-y-2.5 border-t border-border pt-6">
                {launchFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[11px] text-muted-foreground">
                Charged once, at checkout, on top of your $49/month Pro plan.
              </p>
            </div>
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Revvin does not pay referrers for you. You pay referrers directly when the deal closes.
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-surface-warm">
        <div className="container max-w-3xl py-20">
          <h2 className="mb-8 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Common questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="p1">
              <AccordionTrigger>Is there really no contract?</AccordionTrigger>
              <AccordionContent>
                Correct. Pro is $49/month, billed monthly. Cancel anytime from your billing portal — your page stays live through the end of the period you've already paid for.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="p2">
              <AccordionTrigger>What's in the $297 Launch Package?</AccordionTrigger>
              <AccordionContent>
                A 1:1 onboarding call where we build your offer with you, set up your referral page, generate your QR and print-ready flyer, and hand over launch email + SMS templates. Plus 30 days of priority support. It's optional — you can run Pro on your own without it.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="p3">
              <AccordionTrigger>Is the Free tier really free?</AccordionTrigger>
              <AccordionContent>
                Yes. The Free tier is for referrers — people who want to send leads to businesses on Revvin and earn payouts directly. No card required.
              </AccordionContent>
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