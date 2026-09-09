import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { PRICE_TEXT } from "@/config/pricing";
import { track } from "@/lib/track";
import type { ToolkitCta } from "@/lib/toolkit/analytics";

const BASE = "https://revvin.co";

interface ToolShellProps {
  path: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  /** Honest schema: a free browser tool, priced at 0. No ratings, no reviews. */
  appName: string;
  appDescription: string;
  children: ReactNode;
  ctaHeading: string;
  ctaCta: ToolkitCta;
}

/**
 * Shared frame for the three interactive tools: metadata, structured data,
 * breadcrumb back to the toolkit, page heading and the closing free-page CTA.
 * Tool pages own their own inputs and results and nothing else.
 */
const ToolShell = ({
  path,
  metaTitle,
  metaDescription,
  eyebrow,
  h1,
  intro,
  appName,
  appDescription,
  children,
  ctaHeading,
  ctaCta,
}: ToolShellProps) => (
  <>
    <SEOHead
      title={metaTitle}
      description={metaDescription}
      path={path}
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: appName,
          url: `${BASE}${path}`,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web browser",
          browserRequirements: "Runs in any modern browser. No account required.",
          description: appDescription,
          isAccessibleForFree: true,
          publisher: { "@id": `${BASE}/#organization` },
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            url: `${BASE}${path}`,
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
            { "@type": "ListItem", position: 2, name: "Free tools", item: `${BASE}/tools` },
            { "@type": "ListItem", position: 3, name: appName, item: `${BASE}${path}` },
          ],
        },
      ]}
    />

    <section className="border-b border-border">
      <div className="container max-w-3xl py-12 md:py-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
          <Link to="/tools" className="font-medium hover:text-foreground">
            Free tools
          </Link>
        </nav>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-[1.85rem] font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-4xl">
          {h1}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{intro}</p>
      </div>
    </section>

    <section className="border-b border-border bg-surface-warm">
      <div className="container max-w-3xl py-10 md:py-14">{children}</div>
    </section>

    <section className="bg-ink text-white">
      <div className="container max-w-2xl py-14 text-center md:py-16">
        <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">{ctaHeading}</h2>
        <p className="mt-4 text-base text-white/70">
          {`Publishing your referral page is free, with no card. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD when you want it working your whole customer list.`}
        </p>
        <Button
          size="lg"
          className="mt-7 h-12 px-8 bg-primary text-primary-foreground hover:bg-primary-deep"
          asChild
        >
          <Link to="/signup" onClick={() => track("cta_clicked", { cta: ctaCta })}>
            Build my referral page free
          </Link>
        </Button>
        <p className="mt-6 text-sm text-white/60">
          Want more wording?{" "}
          <Link to="/ask-kit" className="underline hover:text-white">
            Open the referral ask kit
          </Link>{" "}
          or browse{" "}
          <Link to="/tools" className="underline hover:text-white">
            all free tools
          </Link>
          .
        </p>
      </div>
    </section>
  </>
);

export default ToolShell;
