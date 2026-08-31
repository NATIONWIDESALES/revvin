import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import SEOHead from "@/components/SEOHead";
import { Check, Lock } from "lucide-react";
import RiskReversalStrip from "@/components/marketing/RiskReversalStrip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LAUNCH_PACKAGE_ENABLED } from "@/config/featureFlags";
import { PRICE_TEXT, ANNUAL_TERMS_COPY, type BillingPlan } from "@/config/pricing";
import HowPayoutsWork from "@/components/marketing/HowPayoutsWork";

// Publishing is free, so the free column now carries the whole referral loop.
// Pro is grouped by what it does for you: it asks your customer list on your
// behalf, reports what came back, and makes the page yours.
const proFeatureGroups: { label: string; features: string[] }[] = [
  {
    label: "Asks your list for you",
    features: [
      "Customer list import",
      "Job done auto-ask with customer name, technician name and service, sent on a delay",
      "Reactivation campaigns segmented by time since last job",
      "Seasonal and maintenance campaign templates",
      "Review requests sent after a job, with a follow-up referral ask for happy customers",
    ],
  },
  {
    label: "Shows you what it produced",
    features: [
      "ROI scoreboard: leads, closed deals and attributed revenue",
      "Campaign results reporting",
      "Monthly recap emailed to you",
      "Reward tracking from pending to paid, with the referrer notified at both moments",
    ],
  },
  {
    label: "Makes the page yours",
    features: [
      "Brand colour, cover image, custom headline and welcome message",
      "Testimonials on your referral page",
      "Print pack: yard signs, door hangers, invoice inserts, business cards, truck magnets",
      "Webhooks and an API, so job complete in another tool fires the auto-ask",
      "Stripe billing portal, cancel anytime",
    ],
  },
];

const freeFeatures = [
  "Branded referral page on your own custom URL, published free",
  "Shareable link and QR code (PNG + print)",
  "Referral offer builder, edit anytime",
  "Lead inbox with status tracking",
  "One-tap text or call back on a new referral",
  "Email and in-app lead notifications",
  "Referrer accounts are free too, and they get paid by you directly",
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
  // Monthly stays the default: annual is the saving for someone already
  // convinced, not the path we push a first-time visitor down.
  const [plan, setPlan] = useState<BillingPlan>("monthly");
  const annual = plan === "annual";

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
        title="Revvin | Pricing"
        description="Build free. Pay $49/month USD only when you publish. All three loops included: referrals, repeat work, and reviews. Cancel anytime. You pay your referrers directly."
        path="/pricing"
      />

      <section className="relative overflow-hidden border-b border-border hero-radial">
        <div aria-hidden className="absolute inset-0 grid-faint" />
        <div className="container relative max-w-3xl py-24 text-center">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Pricing</p>
          {/* Every figure reads from the pricing config so the numbers can
              never drift between pages. */}
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
            {`Build free. Pay ${PRICE_TEXT.monthlyPerMonth} to go live.`}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Building your page, offer, and QR code costs nothing, and you can preview it before you commit. Publishing costs a flat {PRICE_TEXT.monthlyPerMonth} USD, or {PRICE_TEXT.annualPerYear} billed once, which saves {PRICE_TEXT.saving} ({PRICE_TEXT.discount} off). Both include all three loops: referrals, repeat work, and reviews. No contract and no platform fees on your referral rewards. Referrers are free.
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

            {/* Pro, featured */}
            <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-8 shadow-product md:-mt-4">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Most popular
                </span>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Pro</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">All three loops</h2>

              {/* Billing period toggle */}
              <div role="group" aria-label="Billing period" className="mt-5 grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-warm p-1">
                <button
                  type="button"
                  aria-pressed={!annual}
                  onClick={() => setPlan("monthly")}
                  className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${!annual ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  aria-pressed={annual}
                  onClick={() => setPlan("annual")}
                  className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${annual ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {`Annual, save ${PRICE_TEXT.discount}`}
                </button>
              </div>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-foreground">
                  {annual ? PRICE_TEXT.annual : PRICE_TEXT.monthly}
                </span>
                <span className="text-sm text-muted-foreground">{annual ? "/year" : "/month"}</span>
              </div>
              {annual ? (
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    <span className="line-through">{PRICE_TEXT.annualListPrice}</span>{" "}
                    if paid monthly for twelve months. You save {PRICE_TEXT.saving}, {PRICE_TEXT.discount} off.
                  </p>
                  <p className="text-muted-foreground">
                    Works out to {PRICE_TEXT.effectiveMonthly} USD.
                  </p>
                  <p className="text-xs text-muted-foreground">{ANNUAL_TERMS_COPY}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Billing starts when you publish your page. Cancel anytime. No contract.
                </p>
              )}
              <Button size="lg" className="mt-6 h-11 w-full shadow-soft hover:bg-primary-deep" asChild onClick={() => setLaunchFlag(LAUNCH_PACKAGE_ENABLED && addLaunch)}>
                <Link to={`/signup?plan=${plan}`}>
                  {LAUNCH_PACKAGE_ENABLED && addLaunch ? "Build free + Launch Package" : "Build your page free"}
                </Link>
              </Button>
              {!annual && (
                <button
                  type="button"
                  onClick={() => setPlan("annual")}
                  className="mt-3 text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  {`Pay yearly instead and save ${PRICE_TEXT.saving} (${PRICE_TEXT.discount} off)`}
                </button>
              )}
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
              <div className="mt-8 space-y-6 border-t border-border pt-6">
                {proFeatureGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {group.label}
                    </p>
                    <ul className="space-y-2.5">
                      {group.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
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
                Charged once, at checkout, on top of your Revvin subscription.
              </p>
            </div>
            )}
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Revvin does not pay referrers for you. You pay referrers directly when the deal closes.
          </p>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Secure checkout powered by Stripe.
          </p>

          <div className="mx-auto mt-8 max-w-3xl">
            <RiskReversalStrip />
          </div>

          <div className="mx-auto mt-6 max-w-3xl">
            <HowPayoutsWork />
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface-warm">
        <div className="container max-w-3xl py-20">
          <h2 className="mb-8 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Common questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="p1">
              <AccordionTrigger>Is there really no contract?</AccordionTrigger>
              <AccordionContent>
                Correct. Publishing is {PRICE_TEXT.monthlyPerMonth} billed monthly, or {PRICE_TEXT.annualPerYear} billed once. Cancel anytime from your billing portal, your page stays live through the end of the period you've already paid for.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="p6">
              <AccordionTrigger>How does annual billing work if I cancel?</AccordionTrigger>
              <AccordionContent>
                The annual plan is {PRICE_TEXT.annual} USD charged once, up front, for twelve months. You can cancel anytime and your page stays live through the end of that paid year, then it does not renew. We do not pro-rate or refund the unused part of a year, so if you are not sure yet, start monthly at {PRICE_TEXT.monthlyPerMonth} and switch to annual later from your billing portal.
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
              <AccordionTrigger>What exactly is free?</AccordionTrigger>
              <AccordionContent>
                Two things. Referrer accounts are always free: send leads to businesses on Revvin and get paid directly, no card required. And for businesses, the builder is free: create your account, set up your offer, page, and QR code, and preview the whole thing without paying. This is not a trial and not a limited plan. Your page cannot receive referrals until you publish it, and publishing costs $49/month.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="p5">
              <AccordionTrigger>Are all three loops included in the $49?</AccordionTrigger>
              <AccordionContent>
                Yes, on both monthly and annual. One price covers referrals, repeat work, and reviews, plus reward tracking, the ROI scoreboard, the print pack, and webhooks and the API. There are no add-on tiers and no per-send charges.
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