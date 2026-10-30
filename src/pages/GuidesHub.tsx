import { PAGE_META } from "@/content/pageMeta";
import { FREE_CTA_LABEL } from "@/config/planFeatures";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { GUIDES, GUIDE_GROUP_LABELS } from "@/content/guides";
import { COMPARISONS, ROUNDUP } from "@/content/comparisons";
import { PRICE_TEXT } from "@/config/pricing";

const BASE = "https://revvin.co";

const Card = ({ to, title, body }: { to: string; title: string; body: string }) => (
  <article className="rounded-[14px] border border-line bg-card p-6">
    <h3 className="text-lg">
      <Link to={to} className="hover:text-primary">{title}</Link>
    </h3>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    <Link to={to} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline" aria-label={`Read the guide: ${title}`}>
      Read the guide
    </Link>
  </article>
);

const GuidesHub = () => (
  <>
    <SEOHead
      title={PAGE_META["/guides"].title}
      description={PAGE_META["/guides"].description}
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

    <section className="relative overflow-hidden border-b border-border">
      <div className="container relative max-w-3xl py-24">
        <h1 className="text-5xl leading-[0.98] md:text-6xl">
          Referral program guides
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Direct answers to the questions owners actually ask before they start a referral program.
          No invented benchmarks, no case studies, no numbers we cannot stand behind.
        </p>
      </div>
    </section>

    {(["start", "ask", "money"] as const).map((grp) => (
      <section key={grp} aria-labelledby={`grp-${grp}`} className="border-b border-border">
        <div className="container py-14">
          <h2 id={`grp-${grp}`} className="text-3xl md:text-4xl">{GUIDE_GROUP_LABELS[grp]}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {GUIDES.filter((g) => g.group === grp).map((g) => (
              <Card key={g.slug} to={`/guides/${g.slug}`} title={g.question} body={g.answer} />
            ))}
          </div>
        </div>
      </section>
    ))}

    <section aria-labelledby="grp-compare" className="border-b border-border">
      <div className="container py-14">
        <h2 id="grp-compare" className="text-3xl md:text-4xl">{GUIDE_GROUP_LABELS.compare}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card to={`/guides/${ROUNDUP.slug}`} title={ROUNDUP.h1} body={ROUNDUP.answer} />
          {COMPARISONS.map((c) => (
            <Card key={c.slug} to={`/compare/${c.slug}`} title={c.h1} body={c.metaDescription} />
          ))}
        </div>
        <Link to="/compare" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
          All comparisons
        </Link>
      </div>
    </section>

    <section className="bg-forest text-primary-foreground">
      <div className="container max-w-2xl py-20 text-center">
        <h2 className="text-3xl md:text-4xl">
          Your referral page is free.
        </h2>
        <p className="mt-4 text-lg text-primary-foreground/80">
          Publish it, take referrals on it, pay your referrers directly.{" "}
          {`Pro is ${PRICE_TEXT.monthlyPerMonth} USD when you want it working your whole list.`}
        </p>
        <Button size="lg" variant="sign" className="mt-8 h-auto min-h-12 max-w-full whitespace-normal py-3 text-center" asChild>
          <Link to="/signup">{FREE_CTA_LABEL}</Link>
        </Button>
      </div>
    </section>
  </>
);

export default GuidesHub;
