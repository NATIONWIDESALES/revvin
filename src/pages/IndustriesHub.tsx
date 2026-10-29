import { FREE_CTA_LABEL } from "@/config/planFeatures";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import FinalBand from "@/components/marketing/FinalBand";
import SEOHead from "@/components/SEOHead";
import { INDUSTRIES } from "@/content/industries";
import { PRICE_TEXT } from "@/config/pricing";

const BASE = "https://revvin.co";

const IndustriesHub = () => (
  <>
    <SEOHead
      title="Referral Programs by Industry | Revvin"
      description="Referral program software for roofing, HVAC, plumbing, solar, electrical, landscaping, painting and auto detailing. Free to publish. Revvin Pro is $49/month USD for the tools that ask your whole customer list for you."
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

    <section className="border-b border-line">
      <div className="mk-wrap max-w-4xl py-20">
        <h1 className="text-5xl leading-[0.98] md:text-7xl">
          Referral programs by industry
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Every trade sells differently, so the ask, the repeat work and the review timing change too.
          Pick your trade to see how the three loops run on your customer list.
        </p>
      </div>
    </section>

    <section className="border-b border-line">
      <div className="mk-wrap max-w-4xl py-12">
        <div className="divide-y divide-line border-y border-line">
          {INDUSTRIES.map((i) => (
            <article key={i.slug} className="grid gap-2 py-6 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-8">
              <h2 className="text-3xl">
                <Link to={`/referral-program/${i.slug}`} className="hover:text-primary">
                  {i.label} referral program
                </Link>
              </h2>
              <div className="min-w-0"><p className="text-base leading-relaxed text-muted-foreground">{i.intro}</p>
              <Link
                to={`/referral-program/${i.slug}`}
                className="mt-2 inline-block text-sm font-semibold text-primary underline underline-offset-4"
              >
                Read the {i.trade} guide
              </Link></div>
            </article>
          ))}
        </div>
      </div>
    </section>

    <FinalBand
      heading="Not listed? It still works."
      body={`Revvin runs on any service business with a past-customer list. Free to publish and take referrals. Pro is ${PRICE_TEXT.monthlyPerMonth} USD.`}
    />
  </>
);

export default IndustriesHub;