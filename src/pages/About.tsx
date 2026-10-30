import { PAGE_META } from "@/content/pageMeta";
import SEOHead from "@/components/SEOHead";
import FounderSection from "@/components/marketing/FounderSection";
import { ABOUT_SECTIONS, ABOUT_UPDATED_AT } from "@/content/aboutPage";
import { CANONICAL_SENTENCE, FOUNDER_PERSON, ORG_ID, SITE_URL, formatContentDate } from "@/config/brand";

const About = () => (
  <>
  <main className="mx-auto w-full max-w-[760px] px-5 py-16 md:py-24">
    <SEOHead
      title={PAGE_META["/about"].title}
      description={PAGE_META["/about"].description}
      path="/about"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "AboutPage",
        url: `${SITE_URL}/about`,
        name: "About Revvin",
        about: { "@id": ORG_ID },
        mainEntity: { "@type": "Organization", "@id": ORG_ID, name: "Revvin", url: SITE_URL, founder: FOUNDER_PERSON },
      }}
    />
    <h1 className="text-5xl leading-[0.98] md:text-7xl">About Revvin</h1>
    <p className="mt-6 text-2xl leading-snug text-foreground md:text-[28px]">{CANONICAL_SENTENCE}</p>
    {ABOUT_SECTIONS.map((s) => (
      <section key={s.heading} className="article-body mt-12">
        <h2>{s.heading}</h2>
        <p>
          {s.heading === "Contact" ? <>Email <a className="underline underline-offset-4" href="mailto:info@revvin.co">info@revvin.co</a>.</> : s.body}
        </p>
      </section>
    ))}
    <p className="mt-12 text-sm text-muted-foreground">Last updated {formatContentDate(ABOUT_UPDATED_AT)}</p>
  </main>
  <FounderSection />
  </>
);

export default About;
