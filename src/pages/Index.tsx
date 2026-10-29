import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { track } from "@/lib/track";
import { ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import MockLeadsTable from "@/components/marketing/MockLeadsTable";
import MockQRCard from "@/components/marketing/MockQRCard";
import MockPageBuilder from "@/components/marketing/MockPageBuilder";
import FounderSection from "@/components/marketing/FounderSection";
import ReferralWorthCalculator from "@/components/marketing/ReferralWorthCalculator";
import PlanFeatureList from "@/components/marketing/PlanFeatureList";
import Wordmark from "@/components/brand/Wordmark";
import { PRICE_TEXT, MONTHLY_PRICE } from "@/config/pricing";
import { FREE_FEATURES, PRO_FEATURES, PLAN_SPLIT, FREE_CTA_LABEL } from "@/config/planFeatures";
import { SETUP_CALL_URL } from "@/config/setupCall";
import { CANONICAL_SENTENCE } from "@/config/brand";
import HeroPhoneScene from "@/components/marketing/HeroPhoneScene";
import ScrollReveal from "@/components/ScrollReveal";
import { HOME_FAQS } from "@/content/homeFaqs";
import { HOME_SEO } from "@/content/homeSeo";

/**
 * Homepage. Order: hero, how it works, what a referral is worth, two ways
 * referrals reach you, founder, pricing teaser, questions, final action.
 * Copy rule: every line has to be true of the shipped product.
 */

const STEPS = [
  { n: "01", title: "Set your reward", body: "Pick what a closed job is worth to you, like $100 or $250.", visual: <MockPageBuilder /> },
  { n: "02", title: "Ask your customers", body: "Import your list. Revvin writes the text, you send it from your own phone.", visual: <MockQRCard /> },
  { n: "03", title: "Get the job, pay the reward", body: "Referrals land in your inbox. Close the job, pay your referrer, mark it paid.", visual: <MockLeadsTable /> },
];

const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.16em] text-primary";
const h2 = "mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-4xl";

export const homeFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HOME_FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

const Index = () => (
  <>
    <SEOHead
      title={HOME_SEO.title}
      description={HOME_SEO.description}
      path="/"
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Revvin",
          description: `${CANONICAL_SENTENCE} Free includes ${FREE_FEATURES.map((f) => f.label).join(", ")}. Revvin Pro adds ${PRO_FEATURES.map((f) => f.label).join(", ")}. Businesses pay their referrers directly.`,
          brand: { "@type": "Brand", name: "Revvin" },
          offers: [
            { "@type": "Offer", name: "Referral page", price: "0.00", priceCurrency: "USD", url: "https://revvin.co/pricing" },
            { "@type": "Offer", name: "Revvin Pro", price: MONTHLY_PRICE.toFixed(2), priceCurrency: "USD", url: "https://revvin.co/pricing" },
          ],
        },
        homeFaqJsonLd,
      ]}
    />

    {/* a · Hero */}
    <section className="hero-premium relative overflow-hidden border-b border-border">
      <div aria-hidden className="hero-aurora absolute inset-0" />
      <div aria-hidden className="absolute inset-0 grid-faint" />
      <div aria-hidden className="hero-spotlight absolute inset-y-0 left-0 w-3/5" />
      <div className="container relative py-14 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Final state at first paint: the headline never fades in. */}
          <div className="min-w-0 lg:col-span-7">
            <p className={eyebrow}>{HOME_SEO.eyebrow}</p>
            <h1 className="mt-4 text-[2.25rem] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Your happy customers are your best salespeople.{" "}
              <span className="shimmer-text">Put them to work.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{HOME_SEO.sub}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="shine-on-hover hero-primary-button group h-12 w-full px-6 text-base shadow-product hover:bg-primary-deep sm:w-auto" asChild>
                <Link to="/signup" onClick={() => track("cta_clicked", { cta: "hero_signup" })}>
                  {FREE_CTA_LABEL}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-auto min-h-12 w-full whitespace-normal px-6 py-3 text-base sm:w-auto" asChild>
                <Link to="/sample" onClick={() => track("cta_clicked", { cta: "hero_sample" })}>See a real referral page</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{HOME_SEO.underCta}</p>
            {SETUP_CALL_URL && (
              <p className="mt-2 text-sm text-muted-foreground">
                <a href={SETUP_CALL_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_clicked", { cta: "hero_setup_link" })} className="underline underline-offset-4 hover:text-foreground">
                  Book a 30-minute setup call
                </a>
              </p>
            )}
          </div>
          <div className="min-w-0 lg:col-span-5">
            <HeroPhoneScene />
          </div>
        </div>
      </div>
    </section>

    {/* b · How it works */}
    <section className="border-b border-border">
      <div className="container py-16 md:py-24">
        <ScrollReveal>
          <p className={eyebrow}>How it works</p>
          <h2 className={h2}>Three steps.</h2>
          <div className="mt-12 space-y-14 md:mt-16 md:space-y-20">
            {STEPS.map((s, i) => (
              <div key={s.n} className="grid items-center gap-8 md:grid-cols-12">
                <div className={`min-w-0 md:col-span-6 ${i % 2 === 1 ? "md:order-2" : ""}`}>
                  <p className="step-number text-[11px] font-semibold uppercase tracking-[0.16em]">Step {s.n}</p>
                  <h3 className="mt-2 text-xl font-extrabold tracking-tight text-foreground md:text-2xl">{s.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
                <div className={`min-w-0 md:col-span-6 ${i % 2 === 1 ? "md:order-1" : ""}`}>
                  <div className={`step-visual-frame mx-auto max-w-md ${i % 2 === 1 ? "step-tilt-right" : "step-tilt-left"}`}>{s.visual}</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>

    {/* c · Worth */}
    <section className="border-b border-border bg-surface-warm">
      <div className="container max-w-4xl py-16 md:py-24">
        <ScrollReveal>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">What is one referral worth to you?</h2>
          <div className="mt-8"><ReferralWorthCalculator /></div>
        </ScrollReveal>
      </div>
    </section>

    {/* d · Two ways */}
    <section className="border-b border-border">
      <div className="container max-w-5xl py-16 md:py-24">
        <ScrollReveal>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">Two ways referrals reach you</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h3 className="text-lg font-bold text-foreground">Your customers</h3>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li>A personal link for every customer, so each referral is credited automatically.</li>
                <li>The ask after every job.</li>
                <li>A QR code on every invoice and yard sign.</li>
              </ul>
            </div>
            <div className="min-w-0 rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h3 className="text-lg font-bold text-foreground">Locals who earn</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                People in your city who earn rewards by recommending businesses they trust. The Revvin network opens city by city.
              </p>
              <Link to="/earn" onClick={() => track("cta_clicked", { cta: "home_earn" })} className="mt-4 inline-flex items-center text-sm font-semibold text-primary hover:underline">
                How earning works <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>

    {/* e · Founder */}
    <ScrollReveal><FounderSection /></ScrollReveal>

    {/* f · Pricing teaser */}
    <section className="border-b border-border">
      <div className="container max-w-5xl py-16 md:py-24">
        <ScrollReveal>
          <p className={eyebrow}>Pricing</p>
          <h2 className={h2}>{PLAN_SPLIT.line}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-border bg-card p-6 shadow-soft">
              <p className="text-lg font-bold text-foreground">Free, $0</p>
              <PlanFeatureList features={FREE_FEATURES} />
            </div>
            <div className="min-w-0 rounded-2xl border-2 border-primary bg-card p-6 shadow-soft">
              <p className="text-lg font-bold text-foreground">Pro, {PRICE_TEXT.monthlyPerMonth}</p>
              <PlanFeatureList features={PRO_FEATURES} />
            </div>
          </div>
          <Button variant="outline" size="lg" className="mt-8 h-12 px-8 text-base" asChild>
            <Link to="/pricing" onClick={() => track("cta_clicked", { cta: "plans_pro" })}>See pricing</Link>
          </Button>
        </ScrollReveal>
      </div>
    </section>

    {/* g · FAQ */}
    <section className="border-b border-border">
      <div className="container max-w-3xl py-16 md:py-24">
        <ScrollReveal>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">Questions</h2>
          <Accordion type="single" collapsible className="home-lift-card mt-8 w-full rounded-lg border border-border bg-card px-5 shadow-soft">
            {HOME_FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="leading-relaxed text-muted-foreground">
                  {f.a}
                  {f.q.startsWith("Does it work with Jobber") && (
                    <> <Link to="/docs/zapier" className="font-medium text-foreground underline underline-offset-4">Read the Zapier guide</Link>.</>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollReveal>
      </div>
    </section>

    {/* h · Final action */}
    <section className="final-cta-glow relative overflow-hidden bg-ink text-white">
      <div className="container py-16 text-center md:py-24">
        <ScrollReveal>
          <Wordmark size="xl" variant="white" />
          <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-extrabold tracking-tight md:text-5xl">Your next job is already in your customer list.</h2>
          <Button size="lg" className="mt-9 h-auto min-h-12 w-full whitespace-normal bg-primary px-6 py-3 text-base text-primary-foreground shadow-product hover:bg-primary-deep sm:w-auto sm:px-8" asChild>
            <Link to="/signup" onClick={() => track("cta_clicked", { cta: "footer_signup" })}>
              {FREE_CTA_LABEL}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  </>
);

export default Index;
