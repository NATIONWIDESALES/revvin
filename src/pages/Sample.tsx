import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import PhoneMockup from "@/components/marketing/PhoneMockup";
import MockReferralPage from "@/components/marketing/MockReferralPage";
import { ArrowLeft, ArrowRight } from "lucide-react";

const Sample = () => {
  return (
    <>
      <SEOHead
        title="Revvin | Sample referral page"
        description="Preview an example Revvin referral page. Branded referral page, shareable link, QR code, and lead inbox for service businesses. Flat $49/month USD."
      />

      <section className="border-b border-border bg-surface-warm">
        <div className="container flex flex-col items-center gap-3 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-foreground">
            <span className="mr-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              Example
            </span>
            This is a sample page — start yours for{" "}
            <span className="font-semibold">$49/month</span>.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">
                Start yours
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="container py-12 md:py-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Live preview
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              A sample Revvin referral page
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              This is an example of the branded page every business gets — share the link or
              QR code with your customers, capture pre-warmed leads, and pay your referrer
              directly when a deal closes.
            </p>
          </div>

          <div className="flex justify-center">
            <PhoneMockup rotate={0}>
              <MockReferralPage />
            </PhoneMockup>
          </div>

          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/signup">
                Start your referral program · $49/month
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/how-it-works">See how it works</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Sample;