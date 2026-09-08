import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import type { LegalDoc } from "@/content/legal";

/**
 * Renders an authoritative legal document from src/content/legal.ts. The
 * prerendered initial HTML is generated from the same data, so a crawler and a
 * visitor never see different terms.
 */
const LegalDocView = ({ doc, footer }: { doc: LegalDoc; footer?: React.ReactNode }) => (
  <div className="py-12">
    <SEOHead title={doc.metaTitle} description={doc.metaDescription} path={doc.path} />
    <div className="container max-w-3xl">
      <Button variant="ghost" size="sm" className="gap-1 mb-6" asChild>
        <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to Home</Link>
      </Button>

      <h1 className="text-3xl font-bold mb-2">{doc.h1}</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {doc.lastUpdated}</p>

      <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
        <section>
          <p>{doc.intro}</p>
        </section>

        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-bold text-foreground">{section.heading}</h2>
            {section.paragraphs?.map((para, i) => (
              <p key={i}>
                {para.lead && <strong>{para.lead}</strong>}
                {para.lead ? " " : ""}
                {para.text}
              </p>
            ))}
            {section.bullets && (
              <ul className="list-disc pl-5 space-y-1">
                {section.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {footer}
    </div>
  </div>
);

export default LegalDocView;
