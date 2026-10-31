import { PAGE_META } from "@/content/pageMeta";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/track";
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
import { PRICE_TEXT, ANNUAL_TERMS_COPY, FOUNDING_OFFER_ACTIVE, type BillingPlan } from "@/config/pricing";
import LeadCaptureForm from "@/components/marketing/LeadCaptureForm";
import HowPayoutsWork from "@/components/marketing/HowPayoutsWork";
import WorksWithJobSoftware from "@/components/marketing/WorksWithJobSoftware";
import { FREE_FEATURES, PRO_FEATURES, PLAN_SPLIT, FREE_CTA_LABEL } from "@/config/planFeatures";
import { SETUP_CALL_URL } from "@/config/setupCall";
import { APP_ID, ORG_ID, SITE_URL } from "@/config/brand";
import { MONTHLY_PRICE, ANNUAL_PRICE } from "@/config/pricing";
import PlanFeatureList from "@/components/marketing/PlanFeatureList";


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
        title={PAGE_META["/pricing"].title}
        description={PAGE_META["/pricing"].description}
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


      <section className="border-b border-border">
        <div className="container relative max-w-3xl py-20 text-center md:py-24">
          {/* Every figure reads from the pricing config so the numbers can
              never drift between pages. */}
          <h1 className="text-5xl leading-[0.98] md:text-7xl">
            Free asks your first 100 customers. Pro asks all of them.
          </h1>
          <p className="sr-only">{PLAN_SPLIT.line}</p>
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
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Free */}
            <div className="relative flex min-w-0 flex-col rounded-[18px] border border-line bg-background p-8">
              <p className="font-display text-2xl font-bold text-forest">Free</p>
              <h2 className="mt-1 text-xl">{PLAN_SPLIT.freeSubtitle}</h2>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-6xl font-extrabold text-foreground">$0</span>
                <span className="text-sm text-muted-foreground">forever</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Publish your page, share the link and QR code, and take referrals. No card required.
              </p>
              <Button variant="outline" size="lg" className="mt-6 h-auto min-h-11 w-full whitespace-normal py-2.5 text-center" asChild onClick={() => setLaunchFlag(false)}>
                <Link to="/signup">{FREE_CTA_LABEL}</Link>
              </Button>

              <PlanFeatureList features={FREE_FEATURES} />
            </div>

            {/* Pro, featured */}
            <div className="surface-forest relative flex min-w-0 flex-col rounded-[18px] p-8 md:-mt-4">
              {/* No popularity claim: we have no data to support one. The
                  badge states what the plan is for instead. */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">
                  For growing lists
                </span>
              </div>
              <p className="font-display text-2xl font-bold text-foreground">Pro</p>
              <h2 className="mt-1 text-xl">{PLAN_SPLIT.proSubtitle}</h2>

              {/* Billing period toggle */}
              <div role="group" aria-label="Billing period" className="mt-5 grid grid-cols-2 gap-1 rounded-lg [&>button]:min-w-0 border border-border bg-surface-warm p-1">
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
                <span className="font-display text-6xl font-extrabold text-foreground">
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
              <Button size="lg" className="mt-6 h-auto min-h-11 w-full whitespace-normal py-2.5 text-center " variant="sign" asChild onClick={() => setLaunchFlag(LAUNCH_PACKAGE_ENABLED && addLaunch)}>
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

            {/* Team, not built yet. Waitlist only. */}
            <div className="relative flex min-w-0 flex-col rounded-[18px] border border-dashed border-line bg-transparent p-8 md:col-span-2 lg:col-span-1">
              <p className="font-display text-2xl font-bold text-forest">Team</p>
              <h2 className="mt-1 text-xl">Coming soon</h2>
              <p className="mt-6 text-sm text-muted-foreground">
                Rep and tech links with a leaderboard, so everyone on your crew can share their own link. Not available yet.
              </p>
              <div className="mt-6">
                <LeadCaptureForm source="team_waitlist" idPrefix="team" submitLabel="Join the waitlist" />
              </div>
            </div>
          </div>

          {FOUNDING_OFFER_ACTIVE && SETUP_CALL_URL && (
            <div className="mx-auto mt-10 max-w-3xl rounded-[14px] bg-sign p-6 text-center text-forest md:p-8">
              <h2 className="text-2xl">Founding businesses: first 25 only</h2>
              <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-forest">
                Pro free for 30 days, then $29 a month locked for life, plus a done-for-you setup call. In return, we ask for a short case study once you have results.
              </p>
              <Button size="lg" variant="line" className="mt-5 h-auto min-h-11 w-full whitespace-normal py-2.5 sm:w-auto" asChild>
                <a href={SETUP_CALL_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_clicked", { cta: "pricing_founding_call" })}>
                  Claim a founding spot
                </a>
              </Button>
            </div>
          )}

          {LAUNCH_PACKAGE_ENABLED && (
            <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-2 rounded-[14px] border border-line px-5 py-4 text-center text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Checkbox id="add-launch" checked={addLaunch} onCheckedChange={(v) => toggleLaunch(v === true)} />
                <Label htmlFor="add-launch" className="cursor-pointer font-normal text-muted-foreground">
                  Want us to set it up with you? Add the Launch Package, $297 one-time.
                </Label>
              </div>
              {addLaunch && <p className="text-xs">Added. It is charged once at checkout when you start Pro.</p>}
              {SETUP_CALL_URL && (
                <a href={SETUP_CALL_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_clicked", { cta: "pricing_setup_link" })} className="text-xs underline underline-offset-4">Book a 30-minute setup call</a>
              )}
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
        <div className="container max-w-3xl py-16">
          <h2 className="text-3xl md:text-4xl">What you get for the $49</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Free works on every job from here on. Pro works on every customer you have already served: import your past customers, have Revvin email a reactivation campaign to the group you choose from your business name, with replies going to your own inbox, or work through them in batches with each ask opening in your own phone or email app. You also get ROI reporting with a monthly recap and custom page branding. The print pack of yard signs, door hangers, invoice inserts, business cards and truck magnets is in Free, not Pro. The Pro features are the same on monthly and annual. There are no per-send charges.
          </p>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container max-w-5xl py-20">
          <h2 className="text-3xl md:text-4xl">Who Revvin is for</h2>
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

      <section className="border-t border-border">
        <div className="container max-w-3xl py-20">
          <h2 className="mb-8 text-3xl md:text-4xl">Common questions</h2>
          <Accordion type="single" collapsible className="mk-accordion w-full">
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
                Your referral page. Create your account, set up your offer, publish the page, share the link and QR code, and take referrals through it without paying anything. You can also import and ask up to 100 customers. That is not a trial and it does not expire. Referrer accounts are free too: send leads to businesses on Revvin and get paid directly, no card required. Pro is what you pay for, and it is the tools that ask your whole customer list for you.
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