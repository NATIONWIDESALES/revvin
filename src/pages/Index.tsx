import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { track } from "@/lib/track";
import FounderSection from "@/components/marketing/FounderSection";
import ReferralWorthCalculator from "@/components/marketing/ReferralWorthCalculator";
import HeroYardSign from "@/components/marketing/HeroYardSign";
import { PRICE_TEXT, MONTHLY_PRICE, FOUNDING_OFFER_ACTIVE } from "@/config/pricing";
import { FREE_FEATURES, PRO_FEATURES, PLAN_SPLIT, FREE_CTA_LABEL } from "@/config/planFeatures";
import { SETUP_CALL_URL } from "@/config/setupCall";
import { CANONICAL_SENTENCE } from "@/config/brand";
import { HOME_FAQS } from "@/content/homeFaqs";
import { HOME_SEO } from "@/content/homeSeo";

/**
 * Homepage, yard-sign design. Order: hero, how one text turns into a job,
 * referral worksheet, two ways referrals reach you, founder, pricing, questions,
 * final action. Copy rule: every line has to be true of the shipped product.
 * The only ambient motion is the yard sign swapping trades.
 */

export const homeFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HOME_FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

const STEPS = [
  {
    title: "You send the ask",
    body: "After the job, one tap opens a text with that customer's personal link already in it.",
    artifact: (
      <>
        <p className="mk-bubble">Thanks again for having us out, Dana. If anyone you know needs a roof, this link comes straight to me. I pay $250 if it turns into a job.</p>
        <p className="mt-1.5 text-right text-xs text-muted-foreground">Delivered</p>
      </>
    ),
  },
  {
    title: "They send a friend",
    body: "Dana taps her link and passes along her neighbour's name and number. It takes about 30 seconds.",
    artifact: (
      <>
        <div className="mk-mini-field"><small>Referring as</small>Dana</div>
        <div className="mk-mini-field"><small>Who needs a roof?</small>Mike, 604 555 0142</div>
        <div className="mk-mini-btn">Send referral</div>
      </>
    ),
  },
  {
    title: "The lead lands with you",
    body: "You get an email, and a phone alert if you turn them on, with who referred them and what they need.",
    artifact: (
      <>
        <div className="mk-lead"><p className="flex justify-between gap-2 font-semibold">Mike R. <span className="mk-tag">New</span></p><p className="text-muted-foreground">Roof leak over the garage. From Dana.</p></div>
        <div className="mk-lead"><p className="flex justify-between gap-2 font-semibold">Priya S. <span className="mk-tag old">Quoted</span></p><p className="text-muted-foreground">Full replacement. From Tom.</p></div>
      </>
    ),
  },
  {
    title: "You close it and pay",
    body: "Pay Dana your way, mark it paid, and she gets a thank-you note. Revvin never takes a cut.",
    artifact: (
      <div className="flex items-center gap-3">
        <span className="mk-paid">$250</span>
        <span><b className="block text-forest">Paid to Dana</b><span className="text-muted-foreground">Job closed, reward recorded</span></span>
      </div>
    ),
  },
];

const YOUR_CUSTOMERS = [
  ["A personal link for every customer", "Credit is automatic"],
  ["An ask after every finished job", "Review and referral together"],
  ["Yard signs, door hangers, invoice inserts", "Free print pack"],
];
const LOCALS = [
  ["Summit Roofing, Langley", "$250"],
  ["Cedar HVAC, Surrey", "$150"],
  ["Greenline Landscaping, Maple Ridge", "$100"],
];

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

    {/* Hero */}
    <section className="overflow-hidden pt-14">
      <div className="mk-wrap grid items-end gap-10 lg:grid-cols-[1.1fr_.9fr]">
        <div className="min-w-0 pb-0 lg:pb-[72px]">
          <h1 className="max-w-[13.5ch] font-display text-[clamp(50px,6.2vw,88px)] font-extrabold leading-[.92] text-forest">
            Your happy customers are your best salespeople.{" "}
            <span className="block text-foreground">Put them to work.</span>
          </h1>
          <p className="mt-7 max-w-[34em] text-[21px] leading-normal text-muted-foreground">
            Revvin sets up your referral program in 5 minutes.{" "}
            <strong className="font-semibold text-foreground">Every customer gets a personal link, every finished job sends an ask,</strong>{" "}
            and locals who earn rewards for referrals can find you. You pay a reward only when a job closes.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link to="/signup" onClick={() => track("cta_clicked", { cta: "hero_signup" })}>{FREE_CTA_LABEL}</Link>
            </Button>
            <Button size="lg" variant="line" className="h-auto min-h-14 w-full whitespace-normal py-3 sm:w-auto" asChild>
              <Link to="/sample" onClick={() => track("cta_clicked", { cta: "hero_sample" })}>See a real referral page</Link>
            </Button>
          </div>
          <p className="mt-[18px] text-base text-muted-foreground">
            <span>{HOME_SEO.underCta}</span>
            {SETUP_CALL_URL && (
              <>
                {" "}Or{" "}
                <a href={SETUP_CALL_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_clicked", { cta: "hero_setup_link" })} className="font-semibold text-forest underline underline-offset-4">
                  book a 30-minute setup call with Karm
                </a>
                .
              </>
            )}
          </p>
        </div>
        <div className="min-w-0">
          <HeroYardSign />
        </div>
      </div>
    </section>

    {/* Journey */}
    <section className="mk-section border-y border-line bg-card" aria-labelledby="journey-heading">
      <div className="mk-wrap">
        <h2 id="journey-heading" className="mk-h2">How one text turns into a booked job</h2>
        <p className="mk-intro">No app for your customers to download and no software to learn. Revvin writes the ask, you send it from your own phone, and every referral comes back to one inbox.</p>
        <ol className="mk-track" aria-label="Example">
          {STEPS.map((s, i) => (
            <li key={s.title} className="min-w-0">
              <span className="mk-step-n" aria-hidden="true">{i + 1}</span>
              <h3 className="mt-[22px] font-display text-[30px] font-bold leading-none text-forest">{s.title}</h3>
              <p className="mt-2.5 text-[17px] text-muted-foreground">{s.body}</p>
              <div className="mk-artifact" aria-hidden="true">{s.artifact}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>

    {/* Worksheet */}
    <section className="mk-section" aria-labelledby="worth-heading">
      <div className="mk-wrap grid items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
        <div className="min-w-0">
          <h2 id="worth-heading" className="mk-h2">What is one referral worth to you?</h2>
          <p className="mk-intro">Put in your own numbers and see what a referred job leaves you after the reward, and how many it takes to cover Pro for a year.</p>
        </div>
        <div className="min-w-0"><ReferralWorthCalculator /></div>
      </div>
    </section>

    {/* Two ways */}
    <section className="mk-section bg-forest text-primary-foreground" aria-labelledby="ways-heading">
      <div className="mk-wrap">
        <h2 id="ways-heading" className="mk-h2 text-primary-foreground">Two ways referrals reach you</h2>
        <p className="mk-intro text-primary-foreground/80">Your own customers come first. Then the Revvin network: people in your city who get paid to recommend businesses they trust.</p>
        <div className="mt-14 grid gap-0.5 overflow-hidden rounded-[18px] bg-primary-foreground/15 lg:grid-cols-2">
          <div className="min-w-0 bg-forest p-7 sm:p-10">
            <h3 className="font-display text-[38px] font-extrabold leading-none">Your customers</h3>
            <p className="mt-3 text-primary-foreground/80">Everyone you've ever worked for, asked the right way at the right time.</p>
            <ul className="mt-6">
              {YOUR_CUSTOMERS.map(([a, b]) => (
                <li key={a} className="flex flex-col justify-between gap-1 border-t border-primary-foreground/15 py-3.5 sm:flex-row sm:gap-4">
                  {a}<span className="text-primary-foreground/70">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 bg-forest p-7 sm:p-10">
            <h3 className="font-display text-[38px] font-extrabold leading-none">Locals who earn</h3>
            <p className="mt-3 text-primary-foreground/80">Referrers see every business near them that pays for referrals, and get their own link to each.</p>
            <ul className="mt-6" aria-label="Example businesses">
              {LOCALS.map(([a, b]) => (
                <li key={a} className="flex items-center justify-between gap-4 border-t border-primary-foreground/15 py-3.5">
                  {a}<b className="font-display text-[26px] font-extrabold leading-none text-sign">{b}</b>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-primary-foreground/80">
              Examples. The network opens city by city, starting in the Fraser Valley.{" "}
              <Link to="/earn" onClick={() => track("cta_clicked", { cta: "home_earn" })} className="font-semibold text-sign underline underline-offset-4">How earning works</Link>
            </p>
          </div>
        </div>
      </div>
    </section>

    <FounderSection />

    {/* Pricing */}
    <section className="mk-section border-t border-line bg-card" aria-labelledby="pricing-heading">
      <div className="mk-wrap">
        <h2 id="pricing-heading" className="mk-h2">{PLAN_SPLIT.line}</h2>
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="mk-plan min-w-0 rounded-2xl border-[1.5px] border-line bg-paper p-7 sm:p-10">
            <h3 className="font-display text-[32px] font-extrabold leading-none text-forest">Free</h3>
            <p className="mt-3.5 font-display text-[72px] font-extrabold leading-[.9] text-forest">$0</p>
            <p className="text-muted-foreground">forever, no card</p>
            <p className="mt-5 font-semibold">Everything you need to get your first referral.</p>
            <ul className="mt-4">{FREE_FEATURES.map((f) => <li key={f.label}>{f.label}</li>)}</ul>
            <Button size="lg" className="mt-8 w-full sm:w-auto" asChild>
              <Link to="/signup" onClick={() => track("cta_clicked", { cta: "plans_free" })}>{FREE_CTA_LABEL}</Link>
            </Button>
          </div>
          <div className="mk-plan pro min-w-0 rounded-2xl bg-forest p-7 text-primary-foreground sm:p-10">
            <h3 className="font-display text-[32px] font-extrabold leading-none">Pro</h3>
            <p className="mt-3.5 font-display text-[72px] font-extrabold leading-[.9]">{PRICE_TEXT.monthly}</p>
            <p className="text-primary-foreground/80">a month, or {PRICE_TEXT.annual} a year</p>
            <p className="mt-5 font-semibold">For owners with a real customer list to work.</p>
            <ul className="mt-4">
              <li>Everything in Free</li>
              {PRO_FEATURES.map((f) => <li key={f.label}>{f.label}</li>)}
              <li>Cancel anytime. Your page stays live.</li>
            </ul>
            <Button size="lg" variant="sign" className="mt-8 h-auto min-h-14 w-full whitespace-normal py-3 sm:w-auto" asChild>
              <Link to="/signup" onClick={() => track("cta_clicked", { cta: "plans_pro" })}>Start free, upgrade anytime</Link>
            </Button>
          </div>
        </div>
        {FOUNDING_OFFER_ACTIVE && SETUP_CALL_URL && (
          <div className="mt-6 flex flex-col items-start justify-between gap-6 rounded-2xl bg-sign px-7 py-7 text-forest md:flex-row md:items-center md:px-9">
            <div className="min-w-0">
              <h3 className="font-display text-[30px] font-extrabold leading-none">Founding businesses: first 25 only</h3>
              <p className="mt-2 max-w-[44em]">Pro free for 30 days, then $29 a month locked for life, plus a done-for-you setup call. In return, a short case study once you have results.</p>
            </div>
            <Button size="lg" className="h-auto min-h-14 w-full shrink-0 whitespace-normal bg-forest py-3 hover:bg-forest/90 md:w-auto" asChild>
              <a href={SETUP_CALL_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_clicked", { cta: "pricing_founding_call" })}>Claim a founding spot</a>
            </Button>
          </div>
        )}
        <p className="mt-6">
          <Link to="/pricing" onClick={() => track("cta_clicked", { cta: "plans_pro" })} className="font-semibold text-forest underline underline-offset-4">See full pricing</Link>
        </p>
      </div>
    </section>

    {/* FAQ */}
    <section className="mk-section" aria-labelledby="faq-heading">
      <div className="mk-wrap grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-14">
        <h2 id="faq-heading" className="mk-h2">Questions owners ask first</h2>
        <div className="mk-faq min-w-0">
          {HOME_FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p className="pb-6 text-lg leading-relaxed text-muted-foreground">
                {f.a}
                {f.q.startsWith("Does it work with Jobber") && (
                  <> <Link to="/docs/zapier" className="font-semibold text-forest underline underline-offset-4">Read the Zapier guide</Link>.</>
                )}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>

    {/* Final */}
    <section className="bg-forest py-24 text-primary-foreground md:py-[120px]">
      <div className="mk-wrap">
        <h2 className="max-w-[13ch] font-display text-[clamp(52px,7vw,110px)] font-extrabold leading-[.9]">Your next job is already in your customer list.</h2>
        <p className="mt-6 max-w-[34em] text-xl text-primary-foreground/80">Set up your referral program in 5 minutes. Free for your first 100 customers.</p>
        <Button size="lg" variant="sign" className="mt-9 w-full sm:w-auto" asChild>
          <Link to="/signup" onClick={() => track("cta_clicked", { cta: "footer_signup" })}>{FREE_CTA_LABEL}</Link>
        </Button>
      </div>
    </section>
  </>
);

export default Index;
