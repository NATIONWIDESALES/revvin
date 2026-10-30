import { FREE_CTA_LABEL } from "@/config/planFeatures";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import HeroYardSign from "@/components/marketing/HeroYardSign";
import FinalBand from "@/components/marketing/FinalBand";
import SEOHead from "@/components/SEOHead";
import NotFound from "@/pages/NotFound";
import { INDUSTRIES, getIndustry } from "@/content/industries";
import { PRICE_TEXT } from "@/config/pricing";
import { relatedForTrade } from "@/content/related";
import ReferralWorthCalculator from "@/components/marketing/ReferralWorthCalculator";
import { CopyBlock, RelatedLinks } from "@/components/content/ContentBlocks";
import { CONTENT_UPDATED_AT, formatContentDate } from "@/config/brand";
import {
  REWARD_FORMULA,
  SCRIPTS_NOTE,
  TRADE_WORKSHEET_EXAMPLE,
  TRADE_WORKSHEET_NOTE,
  rewardAnswer,
  rewardHeading,
  scriptsAnswer,
  scriptsHeading,
  tradeScripts,
} from "@/content/tradeExtras";

const BASE = "https://revvin.co";

const IndustryLanding = () => {
  const { industry: slug } = useParams();
  const industry = getIndustry(slug);

  if (!industry) return <NotFound />;

  const path = `/referral-program/${industry.slug}`;
  const others = INDUSTRIES.filter((i) => i.slug !== industry.slug);
  const related = relatedForTrade(industry.slug);
  const scripts = tradeScripts(industry.slug);

  return (
    <>
      <SEOHead
        title={industry.metaTitle}
        description={industry.metaDescription}
        path={path}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: industry.h1,
            serviceType: `${industry.label} referral program software`,
            description: industry.metaDescription,
            provider: { "@type": "Organization", name: "Revvin", url: BASE },
            offers: {
              "@type": "Offer",
              price: "49",
              priceCurrency: "USD",
              description:
                "Free to publish your referral page and take referrals on it. Revvin Pro is $49/month USD for the tools that ask your whole customer list for you. Cancel anytime. Businesses pay their referrers directly when deals close.",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
              { "@type": "ListItem", position: 2, name: "Referral programs by industry", item: `${BASE}/referral-programs` },
              { "@type": "ListItem", position: 3, name: industry.label, item: `${BASE}${path}` },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: industry.faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />

      <section className="surface-forest overflow-hidden">
        <div className="mk-wrap grid grid-cols-[minmax(0,1fr)] items-center gap-6 py-16 md:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link to="/" className="hover:text-foreground">Home</Link></li>
              <li aria-hidden>/</li>
              <li><Link to="/referral-programs" className="hover:text-foreground">Referral programs by industry</Link></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-foreground">{industry.label}</li>
            </ol>
          </nav>
          <h1 className="text-5xl leading-[0.98] md:text-6xl">
            {industry.label} referral program
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{industry.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="sign" className="h-auto min-h-14 max-w-full whitespace-normal py-3 text-center" asChild>
              <Link to="/signup">{FREE_CTA_LABEL}</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-border bg-transparent text-foreground hover:bg-card" asChild>
              <Link to="/how-it-works">See how it works</Link>
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            {`Free to publish · Pro is ${PRICE_TEXT.monthlyPerMonth} USD · cancel anytime`}
          </p>
        </div>
        <HeroYardSign compact example={{ biz: `Example ${industry.label} Co.`, q: `Know someone who needs ${industry.trade} work?`, url: "revvin.co/r/your-business" }} />
        </div>
      </section>

      <section aria-labelledby="trade-reward" className="border-b border-border">
        <div className="mk-wrap py-16 md:py-20">
          <div className="max-w-[720px]">
            <h2 id="trade-reward" className="text-3xl md:text-4xl">{rewardHeading(industry.trade)}</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{rewardAnswer(industry.trade)}</p>
            <p className="mt-4 rounded-[14px] border border-line bg-card px-5 py-4 font-semibold text-forest">{REWARD_FORMULA}</p>
            <p className="mt-3 text-sm text-muted-foreground">{`Last updated ${formatContentDate(CONTENT_UPDATED_AT)}. Not legal or tax advice.`}</p>
          </div>
          <div className="mt-8 min-w-0">
            <ReferralWorthCalculator defaults={TRADE_WORKSHEET_EXAMPLE} note={TRADE_WORKSHEET_NOTE} />
          </div>
          <p className="mt-5 text-base">
            <Link to="/guides/how-much-to-pay-for-a-referral" className="font-semibold text-primary underline">
              How much should you pay for a referral?
            </Link>
          </p>
        </div>
      </section>

      <section aria-labelledby="trade-scripts" className="border-b border-border">
        <div className="mx-auto w-full max-w-[720px] px-5 py-16 md:py-20">
          <h2 id="trade-scripts" className="text-3xl md:text-4xl">{scriptsHeading(industry.trade)}</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{scriptsAnswer(industry.trade)}</p>
          <div className="mt-8 space-y-4">
            {scripts.map((sc) => <CopyBlock key={sc.label} label={sc.label} text={sc.text} />)}
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{SCRIPTS_NOTE}</p>
          <p className="mt-3 text-base">
            <Link to="/guides/referral-text-templates" className="font-semibold text-primary underline">
              More referral text templates
            </Link>
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-card">
        <div className="container max-w-4xl py-20">
          <h2 className="text-3xl md:text-4xl">
            The three loops for {industry.trade}
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {industry.loops.map((l, i) => (
              <article key={l.title}>
                <p className="mb-1 font-display text-xl font-bold text-primary">Loop {i + 1}</p>
                <h3 className="text-lg font-bold tracking-tight text-foreground">{l.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{l.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container max-w-4xl py-20 grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl">
              Setting the reward
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{industry.rewardExample}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Revvin tracks each reward from pending to paid and notifies your referrer at both
              moments. You pay them directly off-platform, so Revvin never holds the money and
              never takes a cut of the reward.
            </p>
          </div>
          <div>
            <h2 className="text-3xl">
              Where to put your link and QR code
            </h2>
            <ul className="mt-4 space-y-3">
              {industry.placements.map((p) => (
                <li key={p} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              The print pack in your dashboard generates the signage and QR sheets for these.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card">
        <div className="container max-w-3xl py-20">
          <h2 className="text-3xl md:text-4xl">
            {industry.label} referral program questions
          </h2>
          <dl className="mt-10 space-y-8">
            {industry.faqs.map((f) => (
              <div key={f.q}>
                <dt className="text-base font-bold text-foreground">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container max-w-4xl py-16">
          <h2 className="text-3xl">
            Other trades
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {others.map((o) => (
              <Link
                key={o.slug}
                to={`/referral-program/${o.slug}`}
                className="rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {o.label} referral program
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container max-w-4xl pb-16">
          <RelatedLinks links={related} />
        </div>
      </section>

      <FinalBand
        heading="Start with the customers you already have."
        body={`Free to publish. Pro is ${PRICE_TEXT.monthlyPerMonth} USD when you want it working your whole list. Cancel anytime.`}
      />
    </>
  );
};

export default IndustryLanding;