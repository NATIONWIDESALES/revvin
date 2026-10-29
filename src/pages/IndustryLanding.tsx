import { FREE_CTA_LABEL } from "@/config/planFeatures";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import HeroYardSign from "@/components/marketing/HeroYardSign";
import FinalBand from "@/components/marketing/FinalBand";
import SEOHead from "@/components/SEOHead";
import NotFound from "@/pages/NotFound";
import { INDUSTRIES, getIndustry } from "@/content/industries";
import { PRICE_TEXT } from "@/config/pricing";
import { REWARD_CALCULATOR_PATH, guidesForTrade } from "@/content/related";

const BASE = "https://revvin.co";

const IndustryLanding = () => {
  const { industry: slug } = useParams();
  const industry = getIndustry(slug);

  if (!industry) return <NotFound />;

  const path = `/referral-program/${industry.slug}`;
  const others = INDUSTRIES.filter((i) => i.slug !== industry.slug);
  const relatedGuides = guidesForTrade(industry.slug);

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
            Read next
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {relatedGuides.map((g) => (
              <Link
                key={g.slug}
                to={`/guides/${g.slug}`}
                className="rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {g.label}
              </Link>
            ))}
            <Link
              to={REWARD_CALCULATOR_PATH}
              className="rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Referral reward calculator
            </Link>
          </div>
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

      <FinalBand
        heading="Start with the customers you already have."
        body={`Free to publish. Pro is ${PRICE_TEXT.monthlyPerMonth} USD when you want it working your whole list. Cancel anytime.`}
      />
    </>
  );
};

export default IndustryLanding;