import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { PARTNER_TERMS_DOC } from "@/content/partnerTerms";

const PartnerTerms = () => (
  <>
    <SEOHead
      title="Revvin Partner Program Terms"
      description="The rules of the Revvin Partner Program: commission, attribution, payment timing, refunds, taxes, disclosure and prohibited promotion methods."
      path="/partners/terms"
    />
    <div className="container max-w-3xl py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {PARTNER_TERMS_DOC.h1}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{PARTNER_TERMS_DOC.lastUpdated}</p>

      <div className="mt-10 space-y-8">
        {PARTNER_TERMS_DOC.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold text-foreground">{section.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-12 text-sm">
        <Link to="/partners" className="font-medium text-primary hover:underline">
          Back to the Partner Program
        </Link>
      </p>
    </div>
  </>
);

export default PartnerTerms;
