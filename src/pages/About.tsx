import SEOHead from "@/components/SEOHead";
import { ABOUT_SECTIONS, ABOUT_UPDATED_AT } from "@/content/aboutPage";
import { CANONICAL_SENTENCE, FOUNDER_PERSON, ORG_ID, SITE_URL, formatContentDate } from "@/config/brand";

const About = () => (
  <main className="container max-w-3xl py-16">
    <SEOHead
      title="About Revvin | Free referral program for home-service businesses"
      description={`${CANONICAL_SENTENCE} Pricing, how it works, what it does not do, and who built it.`}
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
    <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">About Revvin</h1>
    <p className="mt-4 text-lg text-foreground">{CANONICAL_SENTENCE}</p>
    {ABOUT_SECTIONS.map((s) => (
      <section key={s.heading} className="mt-10">
        <h2 className="text-xl font-bold text-foreground">{s.heading}</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {s.heading === "Contact" ? <>Email <a className="underline underline-offset-4" href="mailto:info@revvin.co">info@revvin.co</a>.</> : s.body}
        </p>
      </section>
    ))}
    <p className="mt-12 text-sm text-muted-foreground">Last updated {formatContentDate(ABOUT_UPDATED_AT)}</p>
  </main>
);

export default About;
