import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import NotFound from "@/pages/NotFound";
import { GUIDES, getGuide } from "@/content/guides";
import { PRICE_TEXT } from "@/config/pricing";

const BASE = "https://revvin.co";

const GuidePage = () => {
  const { slug } = useParams();
  const guide = getGuide(slug);

  if (!guide) return <NotFound />;

  const path = `/guides/${guide.slug}`;
  const others = GUIDES.filter((g) => g.slug !== guide.slug);
  const isAskGuide = guide.slug === "how-to-ask-a-customer-for-a-referral";

  return (
    <>
      <SEOHead
        title={guide.metaTitle}
        description={guide.metaDescription}
        path={path}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: guide.question,
            description: guide.metaDescription,
            mainEntityOfPage: `${BASE}${path}`,
            author: { "@type": "Organization", name: "Revvin", url: BASE },
            publisher: { "@type": "Organization", name: "Revvin", url: BASE },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
              { "@type": "ListItem", position: 2, name: "Guides", item: `${BASE}/guides` },
              { "@type": "ListItem", position: 3, name: guide.label, item: `${BASE}${path}` },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: guide.faqs.map((f) => ({
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
              <li><Link to="/guides" className="hover:text-foreground">Guides</Link></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-foreground">{guide.label}</li>
            </ol>
          </nav>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Guide
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {guide.question}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-foreground">{guide.answer}</p>
        </div>
      </section>

      <article className="border-b border-border">
        <div className="container max-w-3xl py-16 md:py-20">
          <div className="space-y-12">
            {guide.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
                  {s.heading}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">{s.body}</p>
              </section>
            ))}
          </div>

          {isAskGuide && (
            <div className="mt-14 rounded-xl border border-border bg-surface-warm p-6">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                The copy-paste scripts live in the referral ask kit
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Six scripts for the moments above, free and public, with the placeholders marked so
                you can paste them straight into a text or an email.
              </p>
              <Button className="mt-5" asChild>
                <Link to="/ask-kit">Open the referral ask kit</Link>
              </Button>
            </div>
          )}
        </div>
      </article>

      <section className="border-b border-border bg-surface-warm">
        <div className="container max-w-3xl py-16 md:py-20">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            Common questions
          </h2>
          <dl className="mt-10 space-y-8">
            {guide.faqs.map((f) => (
              <div key={f.q}>
                <dt className="text-base font-bold text-foreground">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container max-w-4xl py-14">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            More guides
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {others.map((o) => (
              <Link
                key={o.slug}
                to={`/guides/${o.slug}`}
                className="rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {o.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container max-w-3xl py-14">
          <p className="text-sm leading-relaxed text-muted-foreground">
            If you want a referral page of your own, it is free to build and publish, and you can
            take referrals on it without paying anything.{" "}
            {`Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD if you later want the tools that work your whole customer list.`}
          </p>
          <Button variant="outline" className="mt-5" asChild>
            <Link to="/signup">Create a free referral page</Link>
          </Button>
        </div>
      </section>
    </>
  );
};

export default GuidePage;
