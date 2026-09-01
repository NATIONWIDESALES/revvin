import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { GUIDES } from "@/content/guides";
import { PRICE_TEXT } from "@/config/pricing";

const BASE = "https://revvin.co";

const GuidesHub = () => (
  <>
    <SEOHead
      title="Referral Program Guides | Revvin"
      description="Straight answers on referral programs for service businesses: how much to pay for a referral, referrals versus buying leads, how to start a program, whether they work, and how to ask."
      path="/guides"
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Referral program guides",
          url: `${BASE}/guides`,
          description:
            "Question-shaped guides to running a referral program as a service business, covering rewards, asking, and how referrals compare with buying leads.",
          hasPart: GUIDES.map((g) => ({
            "@type": "WebPage",
            name: g.question,
            url: `${BASE}/guides/${g.slug}`,
          })),
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
            { "@type": "ListItem", position: 2, name: "Guides", item: `${BASE}/guides` },
          ],
        },
      ]}
    />

    <section className="relative overflow-hidden border-b border-border hero-radial">
      <div aria-hidden className="absolute inset-0 grid-faint" />
      <div className="container relative max-w-3xl py-24">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Guides</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          Referral program guides
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Direct answers to the questions owners actually ask before they start a referral program.
          No invented benchmarks, no case studies, no numbers we cannot stand behind.
        </p>
      </div>
    </section>

    <section className="border-b border-border bg-surface-warm">
      <div className="container py-20">
        <div className="grid gap-6 md:grid-cols-2">
          {GUIDES.map((g) => (
            <article key={g.slug} className="rounded-xl border border-border bg-background p-6">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                <Link to={`/guides/${g.slug}`} className="hover:text-primary">
                  {g.question}
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{g.answer}</p>
              <Link
                to={`/guides/${g.slug}`}
                className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
              >
                Read the guide
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-ink text-white">
      <div className="container max-w-2xl py-20 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Your referral page is free.
        </h2>
        <p className="mt-4 text-lg text-white/70">
          Publish it, take referrals on it, pay your referrers directly.{" "}
          {`Pro is ${PRICE_TEXT.monthlyPerMonth} USD when you want it working your whole list.`}
        </p>
        <Button size="lg" className="mt-8 h-12 px-8 bg-primary text-primary-foreground hover:bg-primary-deep" asChild>
          <Link to="/signup">Create a free referral page</Link>
        </Button>
      </div>
    </section>
  </>
);

export default GuidesHub;
