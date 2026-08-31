import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import NotFound from "@/pages/NotFound";
import { INDUSTRIES, getIndustry } from "@/content/industries";
import { PRICE_TEXT } from "@/config/pricing";

const BASE = "https://revvin.co";

const IndustryLanding = () => {
  const { industry: slug } = useParams();
  const industry = getIndustry(slug);

  if (!industry) return <NotFound />;

  const path = `/referral-program/${industry.slug}`;
  const others = INDUSTRIES.filter((i) => i.slug !== industry.slug);

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

      <section className="relative overflow-hidden border-b border-border hero-radial">
        <div aria-hidden className="absolute inset-0 grid-faint" />
        <div className="container relative max-w-3xl py-20 md:py-24">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link to="/" className="hover:text-foreground">Home</Link></li>
              <li aria-hidden>/</li>
              <li><Link to="/referral-programs" className="hover:text-foreground">Referral programs by industry</Link></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-foreground">{industry.label}</li>
            </ol>
          </nav>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {industry.label}
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            {industry.h1}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{industry.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary-deep" asChild>
              <Link to="/signup">Build your page — free</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8" asChild>
              <Link to="/how-it-works">See how it works</Link>
            </Button>
          </div>
          <p className="mt-5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {`Free to publish · Pro is ${PRICE_TEXT.monthlyPerMonth} USD · cancel anytime`}
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-surface-warm">
        <div className="container max-w-4xl py-20">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            The three loops for {industry.trade}
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {industry.loops.map((l, i) => (
              <article key={l.title}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Loop {String(i + 1).padStart(2, "0")}
                </p>
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
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
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
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
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

      <section className="border-b border-border bg-surface-warm">
        <div className="container max-w-3xl py-20">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
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
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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

      <section className="bg-ink text-white">
        <div className="container max-w-2xl py-20 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Start with the customers you already have.
          </h2>
          <p className="mt-4 text-lg text-white/70">
            {`Free to publish. Pro is ${PRICE_TEXT.monthlyPerMonth} USD when you want it working your whole list. Cancel anytime.`}
          </p>
          <Button size="lg" className="mt-8 h-12 px-8 bg-primary text-primary-foreground hover:bg-primary-deep" asChild>
            <Link to="/signup">Build your {industry.trade} referral page — free</Link>
          </Button>
        </div>
      </section>
    </>
  );
};

export default IndustryLanding;