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
    <div className="mx-auto w-full max-w-[720px] px-5">

      <h1 className="mb-3 text-5xl leading-[1] md:text-6xl">{doc.h1}</h1>
      <p className="mb-8 border-b border-line pb-5 text-sm text-muted-foreground">Last updated: {doc.lastUpdated}</p>

      <div className="article-body space-y-6">
        <section>
          <p>{doc.intro}</p>
        </section>

        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
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
