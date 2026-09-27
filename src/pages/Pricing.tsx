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
import WorksWithJobSoftware from "@/components/marketing/WorksWithJobSoftware";
import { FREE_FEATURES, PRO_FEATURES, PLAN_SPLIT } from "@/config/planFeatures";
import { SETUP_CALL_URL } from "@/config/setupCall";
import { APP_ID, ORG_ID, SITE_URL } from "@/config/brand";
import { MONTHLY_PRICE, ANNUAL_PRICE } from "@/config/pricing";
import PlanFeatureList from "@/components/marketing/PlanFeatureList";

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
        description="Your referral page is free, published and collecting referrals. Revvin Pro is $49/month USD for the tools that ask your whole customer list for you. You pay your referrers directly."
        path="/pricing"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "@id": APP_ID,
          name: "Revvin",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: SITE_URL,
          publisher: { "@id": ORG_ID },
          offers: [
            {
              "@type": "Offer",
              name: "Free",
              price: "0",
              priceCurrency: "USD",
              url: `${SITE_URL}/pricing`,
              description:
                "Your referral page on your own link, QR code and print pack, unlimited referral leads, a lead inbox with status tracking, and reward tracking from owed to paid.",
            },
            {
              "@type": "Offer",
              name: "Revvin Pro, monthly",
              price: String(MONTHLY_PRICE),
              priceCurrency: "USD",
              url: `${SITE_URL}/pricing`,
              description:
                "Customer list import, the bulk referral ask from your own email app, reactivation campaigns, ROI reporting and custom page branding. Billed monthly, cancel any time.",
            },
            {
              "@type": "Offer",
              name: "Revvin Pro, annual",
              price: String(ANNUAL_PRICE),
              priceCurrency: "USD",
              url: `${SITE_URL}/pricing`,
              description:
                "The same Revvin Pro tools billed once for a year. Cancel any time; the free referral page stays live afterwards.",
            },
          ],
        }}
      />


      <section className="relative overflow-hidden border-b border-border hero-radial">
        <div aria-hidden className="absolute inset-0 grid-faint" />
        <div className="container relative max-w-3xl py-24 text-center">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Pricing</p>
          {/* Every figure reads from the pricing config so the numbers can
              never drift between pages. */}
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
            Your referral page is free.
          </h1>
          <p className="mt-5 text-xl font-semibold text-foreground">{PLAN_SPLIT.line}</p>
          <div className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Free: {PLAN_SPLIT.freeSubtitle.toLowerCase()}</p>
              <p className="mt-1 text-sm text-muted-foreground">{PLAN_SPLIT.freeDetail}</p>
            </div>
            <div className="rounded-xl border border-primary/40 bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Pro: {PLAN_SPLIT.proSubtitle.toLowerCase()}</p>
              <p className="mt-1 text-sm text-muted-foreground">{PLAN_SPLIT.proDetail}</p>
            </div>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Revvin Pro is {PRICE_TEXT.monthlyPerMonth} USD, or {PRICE_TEXT.annualPerYear} billed once, which saves {PRICE_TEXT.saving} ({PRICE_TEXT.discount} off). No contract, and no platform fees on your referral rewards.
          </p>
        </div>
      </section>

      <section>
        <div className="container max-w-6xl py-20">
          <div className="grid gap-6 md:grid-cols-2 md:max-w-3xl md:mx-auto">
            {/* Free */}
            <div className="relative flex flex-col rounded-2xl border border-border bg-card p-8 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Free</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">{PLAN_SPLIT.freeSubtitle}</h2>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-foreground">$0</span>
                <span className="text-sm text-muted-foreground">forever</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Publish your page, share the link and QR code, and take referrals. No card required.
              </p>
              <Button variant="outline" size="lg" className="mt-6 h-11 w-full" asChild onClick={() => setLaunchFlag(false)}>
                <Link to="/signup">Create free account</Link>
              </Button>

              <PlanFeatureList features={FREE_FEATURES} />
            </div>

            {/* Pro, featured */}
            <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-8 shadow-product md:-mt-4">
              {/* No popularity claim: we have no data to support one. The
                  badge states what the plan is for instead. */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                  For growing lists
                </span>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Pro</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">{PLAN_SPLIT.proSubtitle}</h2>

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
                  Cancel anytime. Your page stays free and live either way. No contract.
                </p>
              )}
              <Button size="lg" className="mt-6 h-11 w-full shadow-soft hover:bg-primary-deep" asChild onClick={() => setLaunchFlag(LAUNCH_PACKAGE_ENABLED && addLaunch)}>
                <Link to={`/signup?plan=${plan}`}>
                  {LAUNCH_PACKAGE_ENABLED && addLaunch ? "Start Pro + Launch Package" : "Start with Revvin Pro"}
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
              <p className="mt-8 flex items-start gap-2.5 border-t border-border pt-6 text-sm font-semibold text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{PLAN_SPLIT.proLead}</span>
              </p>
              <PlanFeatureList features={PRO_FEATURES} />
            </div>

          </div>

          {LAUNCH_PACKAGE_ENABLED && (
            <div className="mt-8 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Checkbox id="add-launch" checked={addLaunch} onCheckedChange={(v) => toggleLaunch(v === true)} />
                <Label htmlFor="add-launch" className="cursor-pointer font-normal text-muted-foreground">
                  Want us to set it up with you? Add the Launch Package, $297 one-time.
                </Label>
              </div>
              {addLaunch && <p className="text-xs">Added. It is charged once at checkout when you start Pro.</p>}
            </div>
          )}

          <p className="mt-10 text-center text-sm font-medium text-foreground">
            Cancel any time. Your page stays live and your referrals keep coming in. You only lose the Pro tools.
          </p>

          <p className="mt-3 text-center text-xs text-muted-foreground">
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

      <WorksWithJobSoftware />

      <section className="border-b border-border">
        <div className="container max-w-5xl py-20">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Who Revvin is for</h2>
          <div className="mt-8 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-foreground">For</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>Home-service and sales-driven businesses, built for teams of 1 to 10.</li>
                <li>Owners who want referrals without buying leads.</li>
                <li>Businesses with a list of past customers.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Not for, yet</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>Businesses that want Revvin to pay referrers for them.</li>
                <li>Industries with referral-fee rules, including US real estate, mortgage and insurance, should check their own rules first.</li>
              </ul>
            </div>
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
                Correct. Your page costs nothing and has no contract at all. Revvin Pro is {PRICE_TEXT.monthlyPerMonth} billed monthly, or {PRICE_TEXT.annualPerYear} billed once, and you can cancel anytime from your billing portal. Your page and your referrals stay live either way, you just lose the Pro tools.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="p6">
              <AccordionTrigger>How does annual billing work if I cancel?</AccordionTrigger>
              <AccordionContent>
                The annual plan is {PRICE_TEXT.annual} USD charged once, up front, for twelve months of Pro. You can cancel anytime and Pro stays on through the end of that paid year, then it does not renew. Your page stays live regardless. We do not pro-rate or refund the unused part of a year, so if you are not sure yet, start monthly at {PRICE_TEXT.monthlyPerMonth} and switch to annual later from your billing portal.
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
                Your referral page. Create your account, set up your offer, publish the page, share the link and QR code, and take referrals through it without paying anything. That is not a trial and it does not expire. Referrer accounts are free too: send leads to businesses on Revvin and get paid directly, no card required. Pro is what you pay for, and it is the tools that ask your whole customer list for you.
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