import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { INDUSTRIES } from "@/content/industries";
import { PRICE_TEXT } from "@/config/pricing";

const BASE = "https://revvin.co";

const IndustriesHub = () => (
  <>
    <SEOHead
      title="Referral Programs by Industry | Revvin"
      description="Referral program software for roofing, HVAC, plumbing, solar, electrical, landscaping, painting and auto detailing. Free to build, $49/month USD to publish."
      path="/referral-programs"
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Referral programs by industry",
          url: `${BASE}/referral-programs`,
          description:
            "Industry guides to running a referral program on Revvin, covering referrals, repeat work and reviews for each trade.",
          hasPart: INDUSTRIES.map((i) => ({
            "@type": "WebPage",
            name: i.h1,
            url: `${BASE}/referral-program/${i.slug}`,
          })),
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
            { "@type": "ListItem", position: 2, name: "Referral programs by industry", item: `${BASE}/referral-programs` },
          ],
        },
      ]}
    />

    <section className="relative overflow-hidden border-b border-border hero-radial">
      <div aria-hidden className="absolute inset-0 grid-faint" />
      <div className="container relative max-w-3xl py-24">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">By industry</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          Referral programs by industry
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Every trade sells differently, so the ask, the repeat work and the review timing change too.
          Pick your trade to see how the three loops run on your customer list.
        </p>
      </div>
    </section>

    <section className="border-b border-border bg-surface-warm">
      <div className="container py-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((i) => (
            <article key={i.slug} className="rounded-xl border border-border bg-background p-6">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                <Link to={`/referral-program/${i.slug}`} className="hover:text-primary">
                  {i.label} referral program
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{i.intro}</p>
              <Link
                to={`/referral-program/${i.slug}`}
                className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
              >
                Read the {i.trade} guide
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-ink text-white">
      <div className="container max-w-2xl py-20 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Not listed? It still works.</h2>
        <p className="mt-4 text-lg text-white/70">
          Revvin runs on any service business with a past-customer list. Free to build and preview,{" "}
          {PRICE_TEXT.monthlyPerMonth} USD when you publish.
        </p>
        <Button size="lg" className="mt-8 h-12 px-8 bg-primary text-primary-foreground hover:bg-primary-deep" asChild>
          <Link to="/signup">Build your page — free</Link>
        </Button>
      </div>
    </section>
  </>
);

export default IndustriesHub;