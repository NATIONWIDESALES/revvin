import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { track } from "@/lib/track";
import { ArrowRight, Check, Minus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PhoneMockup from "@/components/marketing/PhoneMockup";
import MockReferralPage from "@/components/marketing/MockReferralPage";
import MockLeadsTable from "@/components/marketing/MockLeadsTable";
import MockQRCard from "@/components/marketing/MockQRCard";
import MockPageBuilder from "@/components/marketing/MockPageBuilder";
import FounderNote from "@/components/marketing/FounderNote";
import ReferralDemo from "@/components/demo/ReferralDemo";
import Wordmark from "@/components/brand/Wordmark";
import { PRICE_TEXT } from "@/config/pricing";

/**
 * Homepage. Deliberately short: hero, a demo a visitor can actually run, three
 * steps, the Free vs Pro split, a note from the team, five questions, one final
 * action. The per-trade essays, the guides and the marketplace all still exist
 * and are reachable from the nav, footer and the links below; they are just no
 * longer duplicated here.
 *
 * Copy rule: every line has to be true of the shipped product. Referral-form
 * submissions land in the lead inbox. Replies to a personal text or email go to
 * the owner's own inbox and are not synced back. Rewards are a fixed amount.
 * Personal asks are drafted in the owner's own app; reactivation campaigns are
 * the one thing Revvin's servers send, and only on Pro.
 */

const STEPS = [
  {
    n: "01",
    title: "Create your referral page",
    body:
      "Add your business, write the offer, set the fixed reward you will pay, pick your link, and publish. Free, and no card.",
    visual: <MockPageBuilder />,
  },
  {
    n: "02",
    title: "Prepare and share the ask",
    body:
      "Share your link or QR code, or have Revvin draft a personal message that opens in your own texting or email app so it sends from you. On Pro you can import your past customers and have Revvin email a reactivation campaign to a segment of them for you.",
    visual: <MockQRCard />,
  },
  {
    n: "03",
    title: "Track referrals and record rewards",
    body:
      "Every referral submitted through your page lands in your lead inbox. Move it through to closed, then record the reward as paid once you have paid your referrer directly. They are notified when it is owed and when you mark it paid.",
    visual: <MockLeadsTable />,
  },
];

const FREE_FEATURES = [
  "Referral page on your own Revvin link, published free",
  "Shareable link, QR code and printable pack",
  "Lead inbox with statuses and one-tap call or text back",
  "Email notification when a referral comes in",
  "Fixed reward tracked from owed to paid, referrer notified at both",
  "Optional marketplace listing",
];

// Everything gated behind plan === "pro" in the app today, and nothing else.
const PRO_FEATURES = [
  "Import your past-customer list",
  "Bulk personal asks drafted for your whole list",
  "Reactivation email campaigns sent by Revvin to a segment you pick",
  "ROI reporting and a monthly email recap",
  "Custom page branding: colour, cover image, headline, testimonials",
];

// Exactly five, and the same five feed the FAQPage schema below.
const FAQS = [
  {
    question: "What is free and what costs money?",
    answer: `Creating and publishing your referral page is free, with no card and no expiry, and every referral that comes through it is free. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD, or ${PRICE_TEXT.annualPerYear} billed once, and adds importing your customer list, bulk asks, reactivation campaigns sent for you, ROI reporting and custom branding.`,
  },
  {
    question: "Where do referrals actually land?",
    answer:
      "Anything submitted through your referral page arrives in your lead inbox with the referrer's details, and you get an email about it. If someone replies to a personal text or email you sent, that reply goes to your own phone or inbox: Revvin does not read or sync it, so you add it as a lead yourself if you want it tracked.",
  },
  {
    question: "Does Revvin pay my referrers?",
    answer:
      "No. You set one fixed reward and you pay the referrer directly, on your own terms. Revvin tracks the reward from owed to paid and notifies your referrer at both moments, takes no cut, and never holds or moves the money.",
  },
  {
    question: "Does Revvin message my customers for me?",
    answer:
      "Personal asks are drafted for you and open in your own texting or email app, so you press send and it comes from you. The one thing Revvin's own servers send is a reactivation email campaign on Pro, to the customers you imported, with your business address and an unsubscribe link in every email.",
  },
  {
    question: "What happens if I cancel?",
    answer:
      "You cancel anytime from the billing portal, with no contract and no cancellation fee. Your referral page stays published and referrals keep arriving. You keep your leads and your customer list; you only lose the Pro tools.",
  },
];

const Index = () => (
  <>
    <SEOHead
      title="Revvin | Referral software for service businesses"
      description={`Turn past customers into your next booked job. Create a free referral page, prepare a personal ask, and track the leads and rewards that follow. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD.`}
      path="/"
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Revvin",
          description:
            "Referral software for service businesses. Create a referral page free, prepare a personal referral ask, and track the referrals and fixed rewards that follow. Revvin Pro adds customer list import, bulk asks, reactivation email campaigns, ROI reporting and custom page branding. Businesses pay their referrers directly.",
          brand: { "@type": "Brand", name: "Revvin" },
          offers: [
            {
              "@type": "Offer",
              name: "Referral page",
              price: "0.00",
              priceCurrency: "USD",
              url: "https://revvin.co/pricing",
            },
            {
              "@type": "Offer",
              name: "Revvin Pro",
              price: "49.00",
              priceCurrency: "USD",
              url: "https://revvin.co/pricing",
            },
          ],
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        },
      ]}
    />

    {/* 1 · Hero */}
    <section className="relative overflow-hidden border-b border-border hero-radial">
      <div aria-hidden className="absolute inset-0 grid-faint" />
      <div className="container relative py-14 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Referral software for service businesses.
            </p>
            <h1 className="mt-4 text-[2.25rem] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Turn past customers into your{" "}
              <span className="text-gradient-green">next booked job.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Create a referral page, prepare a personal ask, and track the leads and rewards that
              follow.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 w-full px-6 text-base shadow-product hover:bg-primary-deep sm:w-auto"
                asChild
              >
                <Link to="/signup" onClick={() => track("cta_clicked", { cta: "hero_signup" })}>
                  Build my free referral page
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 w-full px-6 text-base sm:w-auto" asChild>
                <Link to="/sample" onClick={() => track("cta_clicked", { cta: "hero_demo" })}>
                  Try the demo
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {`Your referral page is free and no card is needed to create it. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD when you want the list tools.`}
            </p>
          </div>

          {/* Compact, clearly labelled product example. */}
          <div className="lg:col-span-5">
            <figure className="mx-auto max-w-[300px]">
              <PhoneMockup rotate={0}>
                <MockReferralPage />
              </PhoneMockup>
              <figcaption className="mt-3 text-center text-xs text-muted-foreground">
                Example of a published referral page. Not a real business.
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>

    {/* 2 · Demo teaser with a real action */}
    <section className="border-b border-border bg-surface-warm">
      <div className="container py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Try it right here
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
              Run the whole loop in under a minute.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Send a referral, see it land in the owner's inbox, close the job and record the reward.
              It is pre-filled, so you can just press the button. Nothing is saved or sent.
            </p>
          </div>
          <div className="mt-8">
            <ReferralDemo />
          </div>
        </div>
      </div>
    </section>

    {/* 3 · Three steps */}
    <section className="border-b border-border">
      <div className="container py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Three steps, and you own every message.
          </h2>
        </div>

        <div className="mt-12 space-y-14 md:mt-16 md:space-y-20">
          {STEPS.map((s, i) => (
            <div key={s.n} className="grid items-center gap-8 md:grid-cols-12">
              <div className={`md:col-span-6 ${i % 2 === 1 ? "md:order-2" : ""}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Step {s.n}
                </p>
                <h3 className="mt-2 text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
                  {s.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
              <div className={`md:col-span-6 ${i % 2 === 1 ? "md:order-1" : ""}`}>
                <div className="mx-auto max-w-md">{s.visual}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-14 text-sm text-muted-foreground">
          Written for your trade:{" "}
          <Link
            to="/referral-programs"
            className="font-medium text-foreground underline-offset-4 hover:underline"
            onClick={() => track("cta_clicked", { cta: "home_industries" })}
          >
            referral programs by trade
          </Link>{" "}
          and{" "}
          <Link to="/guides" className="font-medium text-foreground underline-offset-4 hover:underline">
            plain-English guides
          </Link>
          .
        </p>
      </div>
    </section>

    {/* 4 · Free vs Pro */}
    <section className="border-b border-border bg-surface-warm">
      <div className="container py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Free page. Pro when you want the list tools.
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            {`Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD, or ${PRICE_TEXT.annualPerYear} billed once. No contract, and no fee on the rewards you pay.`}
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-7 shadow-soft">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Free
            </p>
            <p className="mt-2 text-4xl font-extrabold tracking-tight text-foreground">$0</p>
            <p className="mt-1 text-sm text-muted-foreground">No card. Does not expire.</p>
            <ul className="mt-6 space-y-2.5 border-t border-border pt-6">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{f}</span>
                </li>
              ))}
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Minus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="lg" className="mt-7 h-12 w-full text-base" asChild>
              <Link to="/signup" onClick={() => track("cta_clicked", { cta: "plans_free" })}>
                Build my free referral page
              </Link>
            </Button>
          </div>

          <div className="rounded-2xl border-2 border-primary bg-card p-7 shadow-product">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Revvin Pro
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
              <span className="text-4xl font-extrabold tracking-tight text-foreground">
                {PRICE_TEXT.monthly}
              </span>
              <span className="text-sm font-medium text-muted-foreground">/month USD</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {`Or ${PRICE_TEXT.annualPerYear} billed once. Cancel anytime.`}
            </p>
            <ul className="mt-6 space-y-2.5 border-t border-border pt-6">
              <li className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>Everything in Free</span>
              </li>
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" className="mt-7 h-12 w-full text-base hover:bg-primary-deep" asChild>
              <Link to="/pricing" onClick={() => track("cta_clicked", { cta: "plans_pro" })}>
                See Pro in detail
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>

    {/* 5 · Note from the team */}
    <FounderNote />

    {/* 6 · Five questions */}
    <section className="border-b border-border">
      <div className="container max-w-3xl py-16 md:py-24">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Questions people actually ask.
        </h2>
        <Accordion type="single" collapsible className="mt-8 w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.question} value={`q${i}`}>
              <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">
                {f.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>

    {/* 7 · Final action */}
    <section className="bg-ink text-white">
      <div className="container py-16 text-center md:py-24">
        <Wordmark size="xl" variant="white" />
        <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-extrabold tracking-tight md:text-5xl">
          Build the page, then make the ask.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
          {`Free to create and publish, no card. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD when you want to work your whole list.`}
        </p>
        <Button
          size="lg"
          className="mt-9 h-12 bg-primary px-8 text-base text-primary-foreground shadow-product hover:bg-primary-deep"
          asChild
        >
          <Link to="/signup" onClick={() => track("cta_clicked", { cta: "footer_signup" })}>
            Build my free referral page
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  </>
);

export default Index;
