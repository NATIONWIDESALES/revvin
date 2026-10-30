import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { FREE_CTA_LABEL } from "@/config/planFeatures";
import { PRICE_TEXT } from "@/config/pricing";
import { BIAS_DISCLOSURE, COMPARISONS, ROUNDUP } from "@/content/comparisons";
import { PAGE_META } from "@/content/pageMeta";

const BASE = "https://revvin.co";

/** Hub for the comparison pages and the roundup guide, in the guides hub style. */
const CompareHub = () => (
  <>
    <SEOHead
      title={PAGE_META["/compare"].title}
      description={PAGE_META["/compare"].description}
      path="/compare"
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Compare Revvin with other referral software",
          url: `${BASE}/compare`,
          hasPart: [
            ...COMPARISONS.map((c) => ({ "@type": "WebPage", name: c.h1, url: `${BASE}/compare/${c.slug}` })),
            { "@type": "WebPage", name: ROUNDUP.h1, url: `${BASE}/guides/${ROUNDUP.slug}` },
          ],
        },
      ]}
    />

    <section className="relative overflow-hidden border-b border-border">
      <div className="container relative max-w-3xl py-24">
        <h1 className="text-5xl leading-[0.98] md:text-6xl">Compare Revvin with other referral software</h1>
        <p className="mt-5 text-lg text-muted-foreground">{BIAS_DISCLOSURE}</p>
      </div>
    </section>

    <section className="border-b border-border bg-surface-warm">
      <div className="container py-20">
        <div className="grid gap-6 md:grid-cols-2">
          <article className="rounded-[14px] border border-line bg-card p-6">
            <h2 className="text-lg">
              <Link to={`/guides/${ROUNDUP.slug}`} className="hover:text-primary">{ROUNDUP.h1}</Link>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{ROUNDUP.answer}</p>
            <Link to={`/guides/${ROUNDUP.slug}`} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
              Read the roundup
            </Link>
          </article>
          {COMPARISONS.map((c) => (
            <article key={c.slug} className="rounded-[14px] border border-line bg-card p-6">
              <h2 className="text-lg">
                <Link to={`/compare/${c.slug}`} className="hover:text-primary">{c.h1}</Link>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.metaDescription}</p>
              <Link to={`/compare/${c.slug}`} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
                Read the comparison
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-forest text-primary-foreground">
      <div className="container max-w-2xl py-20 text-center">
        <h2 className="text-3xl md:text-4xl">Your referral page is free.</h2>
        <p className="mt-4 text-lg text-primary-foreground/80">
          {`Publish it, take referrals on it, pay your referrers directly. Pro is ${PRICE_TEXT.monthlyPerMonth} USD when you want it working your whole list.`}
        </p>
        <Button size="lg" variant="sign" className="mt-8 h-auto min-h-12 max-w-full whitespace-normal py-3 text-center" asChild>
          <Link to="/signup">{FREE_CTA_LABEL}</Link>
        </Button>
      </div>
    </section>
  </>
);

export default CompareHub;
