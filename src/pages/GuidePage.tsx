import { FREE_CTA_LABEL } from "@/config/planFeatures";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import NotFound from "@/pages/NotFound";
import { GUIDES, getGuide } from "@/content/guides";
import { PRICE_TEXT } from "@/config/pricing";
import {
  GUIDES_PUBLISHED_AT,
  GUIDES_UPDATED_AT,
  formatContentDate,
  TEAM_REF,
} from "@/config/brand";
import { relatedForGuide } from "@/content/related";
import { AuthorBox, CopyBlock, GuideTable, RelatedLinks } from "@/components/content/ContentBlocks";
import type { GuideSection } from "@/content/guides";

const SectionView = ({ s }: { s: GuideSection }) => (
  <section>
    <h2>{s.heading}</h2>
    <p>{s.body}</p>
    {s.list && (
      <ul className="list-disc space-y-2 pl-6">
        {s.list.map((li) => <li key={li}>{li}</li>)}
      </ul>
    )}
  </section>
);

const BASE = "https://revvin.co";

const GuidePage = () => {
  const { slug } = useParams();
  const guide = getGuide(slug);

  if (!guide) return <NotFound />;

  const path = `/guides/${guide.slug}`;
  const others = GUIDES.filter((g) => g.slug !== guide.slug);
  const isAskGuide = guide.slug === "how-to-ask-a-customer-for-a-referral";
  const related = relatedForGuide(guide.slug);
  const updated = guide.updatedAt ?? GUIDES_UPDATED_AT;
  const url = `${BASE}${path}`;

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
            author: TEAM_REF,
            publisher: { "@id": `${BASE}/#organization` },
            datePublished: guide.publishedAt ?? GUIDES_PUBLISHED_AT,
            dateModified: updated,
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
          ...(guide.faqs.length
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: guide.faqs.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                  })),
                },
              ]
            : []),
          ...(guide.terms?.length
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "DefinedTermSet",
                  "@id": `${url}#terms`,
                  name: guide.question,
                  hasDefinedTerm: guide.terms.map((t) => ({
                    "@type": "DefinedTerm",
                    "@id": `${url}#${t.id}`,
                    name: t.term,
                    description: t.definition,
                  })),
                },
              ]
            : []),
        ]}
      />

      <section>
        <div className="mx-auto w-full max-w-[720px] px-5 pb-4 pt-14 md:pt-20">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link to="/" className="hover:text-foreground">Home</Link></li>
              <li aria-hidden>/</li>
              <li><Link to="/guides" className="hover:text-foreground">Guides</Link></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-foreground">{guide.label}</li>
            </ol>
          </nav>
          <h1 className="text-[2.6rem] leading-[1] md:text-6xl">
            {guide.question}
          </h1>
          <p className="mt-5 border-b border-line pb-5 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">By the Revvin team</span>
            <br />
            {`Last updated ${formatContentDate(updated)}`}
          </p>
          <p className="article-body mt-6 text-[21px]">{guide.answer}</p>
        </div>
      </section>

      <article>
        <div className="mx-auto w-full max-w-[720px] px-5 pb-16">
          <div className="article-body">
            {guide.sections.map((s) => <SectionView key={s.heading} s={s} />)}
            {guide.table && (
              <section>
                <h2>{guide.table.heading}</h2>
                <p>{guide.table.intro}</p>
              </section>
            )}
          </div>
          {guide.table && <GuideTable t={guide.table} />}
          {guide.copyGroups?.map((g) => (
            <section key={g.heading} className="mt-10">
              <div className="article-body">
                <h2>{g.heading}</h2>
                <p>{g.intro}</p>
              </div>
              <div className="mt-5 space-y-4">
                {g.items.map((it) => <CopyBlock key={it.label} label={it.label} text={it.text} />)}
              </div>
            </section>
          ))}
          {guide.terms && (
            <section className="mt-10">
              <div className="article-body"><h2>Referral marketing terms, defined</h2></div>
              <dl className="mt-6 space-y-6">
                {guide.terms.map((t) => (
                  <div key={t.id} id={t.id} className="scroll-mt-20 border-b border-line pb-5">
                    <dt className="font-display text-2xl font-bold text-forest">
                      <a href={`#${t.id}`} className="hover:underline">{t.term}</a>
                    </dt>
                    <dd className="mt-2 text-[17px] leading-relaxed text-muted-foreground">{t.definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {guide.closingSections && (
            <div className="article-body mt-10">
              {guide.closingSections.map((s) => <SectionView key={s.heading} s={s} />)}
            </div>
          )}
          {guide.sources && (
            <section className="mt-14 border-t border-line pt-8">
              <h2 className="text-3xl">Sources</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-[16px]">
                {guide.sources.map((src) => (
                  <li key={src.url}>
                    <a href={src.url} rel="noopener" target="_blank" className="text-primary underline">{src.label}</a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {isAskGuide && (
            <div className="mt-14 rounded-[14px] border border-line bg-card p-6">
              <h2 className="text-lg">
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

      {guide.faqs.length > 0 && <section className="border-t border-line">
        <div className="mx-auto w-full max-w-[720px] px-5 py-16">
          <h2 className="text-4xl">
            Common questions
          </h2>
          <dl className="mt-10 space-y-8">
            {guide.faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-display text-2xl font-bold text-forest">{f.q}</dt>
                <dd className="mt-2 text-[17px] leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>}

      <section className="border-b border-border">
        <div className="container max-w-4xl py-14">
          <h2 className="text-3xl">
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

      <section>
        <div className="mx-auto w-full max-w-[720px] px-5 py-14"><div className="rounded-[18px] border border-line bg-card p-6 sm:p-8">
          <h2 className="text-3xl">Get your own referral page</h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            If you want a referral page of your own, it is free to build and publish, and you can
            take referrals on it without paying anything.{" "}
            {`Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD if you later want the tools that work your whole customer list.`}
          </p>
          <Button size="lg" className="mt-5 h-auto min-h-14 max-w-full whitespace-normal py-3 text-center" asChild>
            <Link to="/signup">{FREE_CTA_LABEL}</Link>
          </Button>
        </div>
          <RelatedLinks links={related} />
          <AuthorBox />
        </div>
      </section>
    </>
  );
};

export default GuidePage;
