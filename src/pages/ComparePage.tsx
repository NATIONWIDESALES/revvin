import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import NotFound from "@/pages/NotFound";
import { AuthorBox, RelatedLinks } from "@/components/content/ContentBlocks";
import { relatedForCompare } from "@/content/related";
import { FREE_CTA_LABEL } from "@/config/planFeatures";
import { TEAM_REF, formatContentDate } from "@/config/brand";
import {
  BIAS_DISCLOSURE,
  CHECKED_LINE,
  COMPARISONS,
  COMPARISONS_CHECKED_ON,
  ROUNDUP,
  getComparison,
  type ContentTable,
  type Source,
} from "@/content/comparisons";

const BASE = "https://revvin.co";

const DataTable = ({ t }: { t: ContentTable }) => (
  <figure className="my-8">
    <div className="overflow-x-auto rounded-[14px] border border-line bg-card" tabIndex={0} role="region" aria-label={t.caption}>
      <table className="w-full min-w-[560px] border-collapse text-left text-[15px]">
        <caption className="sr-only">{t.caption}</caption>
        <thead>
          <tr className="border-b border-line">
            {t.head.map((h, i) => (
              <th key={i} scope="col" className="p-3 font-display text-lg font-bold text-forest">{h || <span className="sr-only">Feature</span>}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r) => (
            <tr key={r[0]} className="border-b border-line last:border-0 align-top">
              <th scope="row" className="p-3 font-semibold text-foreground">{r[0]}</th>
              {r.slice(1).map((c, i) => (
                <td key={i} className="p-3 text-muted-foreground">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <figcaption className="mt-3 text-sm text-muted-foreground">{CHECKED_LINE}</figcaption>
  </figure>
);

const tableLd = (t: ContentTable) => ({
  "@type": "Table",
  about: t.caption,
});

const Sources = ({ sources }: { sources: Source[] }) => (
  <section className="mt-14 border-t border-line pt-8">
    <h2 className="text-3xl">Sources</h2>
    <ul className="mt-4 list-disc space-y-2 pl-5 text-[16px]">
      {sources.map((s) => (
        <li key={s.url}>
          <a href={s.url} rel="noopener" target="_blank" className="text-primary underline">{s.label}</a>
        </li>
      ))}
    </ul>
    <p className="mt-6 text-sm text-muted-foreground">{BIAS_DISCLOSURE}</p>
  </section>
);

const Header = ({ h1, answer, crumb }: { h1: string; answer: string; crumb: { label: string; to?: string } }) => (
  <section>
    <div className="mx-auto w-full max-w-[720px] px-5 pb-4 pt-14 md:pt-20">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link to="/" className="hover:text-foreground">Home</Link></li>
          <li aria-hidden>/</li>
          {crumb.to && (
            <>
              <li><Link to={crumb.to} className="hover:text-foreground">{crumb.label}</Link></li>
              <li aria-hidden>/</li>
            </>
          )}
          <li aria-current="page" className="text-foreground">{h1}</li>
        </ol>
      </nav>
      <h1 className="text-[2.6rem] leading-[1] md:text-6xl">{h1}</h1>
      <p className="mt-5 border-b border-line pb-5 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">By the Revvin team</span>
        <br />
        {`Last updated ${formatContentDate(COMPARISONS_CHECKED_ON)}`}
      </p>
      <p className="article-body mt-6 text-[21px]">{answer}</p>
      <p className="mt-4 text-sm text-muted-foreground">{BIAS_DISCLOSURE}</p>
    </div>
  </section>
);

const CtaCard = () => (
  <div className="mt-14 rounded-[18px] border border-line bg-card p-6 sm:p-8">
    <h2 className="text-3xl">Try Revvin free</h2>
    <p className="mt-3 text-base leading-relaxed text-muted-foreground">
      No setup fee, self-serve signup, cancel anytime.
    </p>
    <Button size="lg" className="mt-5 h-auto min-h-14 max-w-full whitespace-normal py-3 text-center" asChild>
      <Link to="/signup">{FREE_CTA_LABEL}</Link>
    </Button>
  </div>
);

const MoreCompare = ({ current }: { current: string }) => (
  <nav aria-label="More comparisons" className="mt-10">
    <h2 className="text-3xl">More comparisons</h2>
    <div className="mt-5 flex flex-wrap gap-3">
      {COMPARISONS.filter((c) => `/compare/${c.slug}` !== current).map((c) => (
        <Link key={c.slug} to={`/compare/${c.slug}`} className="rounded-full border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary">
          {c.h1}
        </Link>
      ))}
      {current !== `/guides/${ROUNDUP.slug}` && (
        <Link to={`/guides/${ROUNDUP.slug}`} className="rounded-full border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary">
          {ROUNDUP.h1}
        </Link>
      )}
    </div>
  </nav>
);

const article = (path: string, headline: string, description: string, tables: ContentTable[]) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline,
  description,
  mainEntityOfPage: `${BASE}${path}`,
  author: TEAM_REF,
  publisher: { "@id": `${BASE}/#organization` },
  datePublished: COMPARISONS_CHECKED_ON,
  dateModified: COMPARISONS_CHECKED_ON,
  hasPart: tables.map(tableLd),
});

export const RoundupPage = () => {
  const path = `/guides/${ROUNDUP.slug}`;
  return (
    <>
      <SEOHead
        title={ROUNDUP.metaTitle}
        description={ROUNDUP.metaDescription}
        path={path}
        jsonLd={[article(path, ROUNDUP.h1, ROUNDUP.metaDescription, [ROUNDUP.summary])]}
      />
      <Header h1={ROUNDUP.h1} answer={ROUNDUP.answer} crumb={{ label: "Guides", to: "/guides" }} />
      <article>
        <div className="mx-auto w-full max-w-[720px] px-5 pb-16">
          <div className="article-body">
            {ROUNDUP.tools.map((t) => (
              <section key={t.name}>
                <h2>{t.name}</h2>
                <p><strong>Best for:</strong> {t.bestFor}</p>
                <p><strong>Price:</strong> {t.price}</p>
                <p><strong>What stands out:</strong> {t.standsOut}</p>
                <p><strong>Watch out for:</strong> {t.watchOut}</p>
                {t.comparePath && (
                  <p><Link to={t.comparePath} className="text-primary underline">{`Revvin vs ${t.name}`}</Link></p>
                )}
              </section>
            ))}
            <h2>Summary</h2>
          </div>
          <DataTable t={ROUNDUP.summary} />
          <div className="article-body">
            <h2>How to choose</h2>
            <ol className="list-decimal space-y-3 pl-6">
              {ROUNDUP.howToChoose.map((h) => (
                <li key={h.q}><strong>{h.q}</strong> {h.a}</li>
              ))}
            </ol>
          </div>
          <CtaCard />
          <MoreCompare current={path} />
          <Sources sources={ROUNDUP.sources} />
          <RelatedLinks links={relatedForCompare(path)} />
          <AuthorBox />
        </div>
      </article>
    </>
  );
};

const ComparePage = () => {
  const { slug } = useParams();
  const c = getComparison(slug);
  if (!c) return <NotFound />;
  const path = `/compare/${c.slug}`;
  return (
    <>
      <SEOHead
        title={c.metaTitle}
        description={c.metaDescription}
        path={path}
        jsonLd={[
          article(path, c.h1, c.metaDescription, [c.table]),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: c.faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
      <Header h1={c.h1} answer={c.answer} crumb={{ label: "Guides", to: `/guides/${ROUNDUP.slug}` }} />
      <article>
        <div className="mx-auto w-full max-w-[720px] px-5 pb-16">
          <div className="article-body"><h2>Side by side</h2></div>
          <DataTable t={c.table} />
          <div className="article-body">
            <h2>{`Choose ${c.competitor} if`}</h2>
            <ul className="list-disc space-y-2 pl-6">{c.chooseThem.map((b) => <li key={b}>{b}</li>)}</ul>
            <h2>Choose Revvin if</h2>
            <ul className="list-disc space-y-2 pl-6">{c.chooseRevvin.map((b) => <li key={b}>{b}</li>)}</ul>
            {c.notes?.map((n) => (
              <section key={n.heading}><h2>{n.heading}</h2><p>{n.body}</p></section>
            ))}
            <h2>Common questions</h2>
          </div>
          <dl className="mt-6 space-y-8">
            {c.faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-display text-2xl font-bold text-forest">{f.q}</dt>
                <dd className="mt-2 text-[17px] leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
          <CtaCard />
          <MoreCompare current={path} />
          <Sources sources={c.sources} />
          <RelatedLinks links={relatedForCompare(path)} />
          <AuthorBox />
        </div>
      </article>
    </>
  );
};

export default ComparePage;
