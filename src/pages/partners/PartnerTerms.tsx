import { PAGE_META } from "@/content/pageMeta";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { PARTNER_TERMS_DOC } from "@/content/partnerTerms";

const PartnerTerms = () => (
  <>
    <SEOHead
      title={PAGE_META["/partners/terms"].title}
      description={PAGE_META["/partners/terms"].description}
      path="/partners/terms"
    />
    <div className="mx-auto w-full max-w-[720px] px-5 py-16">
      <h1 className="text-5xl leading-[1] md:text-6xl">
        {PARTNER_TERMS_DOC.h1}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{PARTNER_TERMS_DOC.lastUpdated}</p>

      <div className="article-body mt-10">
        {PARTNER_TERMS_DOC.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
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
