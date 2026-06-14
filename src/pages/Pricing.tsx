import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import SEOHead from "@/components/SEOHead";
import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LAUNCH_PACKAGE_ENABLED } from "@/config/featureFlags";

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

const LAUNCH_KEY = "revvin_addon_launch";

const setLaunchFlag = (on: boolean) => {
  if (typeof window === "undefined") return;
  if (on) window.sessionStorage.setItem(LAUNCH_KEY, "1");
  else window.sessionStorage.removeItem(LAUNCH_KEY);
};

const Pricing = () => {
  const [addLaunch, setAddLaunch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAddLaunch(window.sessionStorage.getItem(LAUNCH_KEY) === "1");
  }, []);

  const toggleLaunch = (next: boolean) => {
    setAddLaunch(next);
    setLaunchFlag(next);
  };

  return (
    <>
      <SEOHead
        title="Pricing — Revvin"
        description="$49/month, cancel anytime. No contract, no setup fee. Free for referrers."
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
            Billed monthly. No contract, no setup fee, no trial, no platform fees. Businesses are billed from day one. Referrers are free.
          </p>
        </div>
      </section>

      <section>
        <div className="container max-w-6xl py-20">
          <div className={`grid gap-6 ${LAUNCH_PACKAGE_ENABLED ? "md:grid-cols-3" : "md:grid-cols-2 md:max-w-3xl md:mx-auto"}`}>
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
              <Button variant="outline" size="lg" className="mt-6 h-11 w-full" asChild onClick={() => setLaunchFlag(false)}>
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
              <Button size="lg" className="mt-6 h-11 w-full shadow-soft hover:bg-primary-deep" asChild onClick={() => setLaunchFlag(LAUNCH_PACKAGE_ENABLED && addLaunch)}>
                <Link to="/signup">
                  {LAUNCH_PACKAGE_ENABLED && addLaunch ? "Start program + Launch Package" : "Start your referral program"}
                </Link>
              </Button>
              {LAUNCH_PACKAGE_ENABLED && (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-surface-warm p-3">
                  <Checkbox
                    id="add-launch-pro"
                    checked={addLaunch}
                    onCheckedChange={(v) => toggleLaunch(v === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="add-launch-pro" className="cursor-pointer text-xs leading-snug text-foreground">
                    <span className="font-semibold">Add $297 Launch Package</span>
                    <span className="block text-muted-foreground">
                      One-time. We set up your offer, page, and launch assets with you.
                    </span>
                  </Label>
                </div>
              )}
              <ul className="mt-8 space-y-2.5 border-t border-border pt-6">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Launch Package add-on (gated by LAUNCH_PACKAGE_ENABLED) */}
            {LAUNCH_PACKAGE_ENABLED && (
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
              <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-surface-warm p-3">
                <Checkbox
                  id="add-launch-card"
                  checked={addLaunch}
                  onCheckedChange={(v) => toggleLaunch(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="add-launch-card" className="cursor-pointer text-sm font-semibold text-foreground">
                  {addLaunch ? "Added to checkout" : "Add $297 Launch Package"}
                </Label>
              </div>
              <Button
                variant={addLaunch ? "default" : "outline"}
                size="lg"
                className="mt-3 h-11 w-full"
                asChild
                onClick={() => setLaunchFlag(true)}
              >
                <Link to="/signup">{addLaunch ? "Continue to checkout" : "Add and continue"}</Link>
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
                Charged once, at checkout, on top of your $49/month subscription.
              </p>
            </div>
            )}
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
            {LAUNCH_PACKAGE_ENABLED && (
              <AccordionItem value="p2">
                <AccordionTrigger>What's in the $297 Launch Package?</AccordionTrigger>
                <AccordionContent>
                  A 1:1 onboarding call where we build your offer with you, set up your referral page, generate your QR and print-ready flyer, and hand over launch email and SMS templates. Plus 30 days of priority support. It's optional; you can run Pro on your own without it.
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="p3">
              <AccordionTrigger>Is the Free tier really free?</AccordionTrigger>
              <AccordionContent>
                Yes. The Free tier is for referrers — people who want to send leads to businesses on Revvin and earn payouts directly. No card required.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="p4">
              <AccordionTrigger>Does Revvin take a cut of referral payouts?</AccordionTrigger>
              <AccordionContent>
                No. Revvin is the infrastructure, not a middleman on payouts. You pay referrers directly when deals close and keep 100% of that relationship.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </>
  );
};

export default Pricing;