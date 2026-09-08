import { useEffect } from "react";
import { Link } from "react-router-dom";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import PhoneMockup from "@/components/marketing/PhoneMockup";
import MockReferralPage from "@/components/marketing/MockReferralPage";
import ReferralDemo from "@/components/demo/ReferralDemo";
import { ArrowLeft, ArrowRight } from "lucide-react";

const Sample = () => {
  useEffect(() => {
    track("sample_page_viewed");
  }, []);

  return (
    <>
      <SEOHead
        title="Revvin | Try the referral loop (demo)"
        description="Walk through a Revvin referral end to end: send a referral, see the owner's lead inbox, close the job, record the reward. Nothing is saved. Publishing your own page is free. Revvin Pro is $49/month USD."
      />

      <section className="border-b border-border bg-surface-warm">
        <div className="container flex flex-col items-center gap-3 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-foreground">
            <span className="mr-2 inline-flex items-center rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-background">
              Demo
            </span>
            Nothing you type here is saved or sent. Build your real page{" "}
            <span className="font-semibold">free</span>.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Back
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup" onClick={() => track("cta_clicked", { cta: "sample_top" })}>
                Start yours
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="container py-12 md:py-16">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Interactive demo
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Try the referral loop yourself
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Four steps: a customer sends a referral, it lands in the owner's inbox, the job
              closes, the reward gets recorded. Use made-up details. This runs entirely in your
              browser, so nothing is stored, emailed or texted.
            </p>
          </div>

          <div className="mx-auto max-w-xl">
            <ReferralDemo />
          </div>

          <div className="mt-14 grid items-center gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                What your customers actually see
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                A branded page at your own link, plus a QR code you can print. Publishing is free.
                Revvin Pro, $49/month USD, adds the tools for asking your whole customer list and
                reporting on what it returned. You pay your referrers directly: Revvin never
                handles the money.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link to="/signup" onClick={() => track("cta_clicked", { cta: "sample_bottom" })}>
                    Build my referral page, free
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/how-it-works">See how it works</Link>
                </Button>
              </div>
            </div>
            <div className="flex justify-center">
              <PhoneMockup rotate={0}>
                <MockReferralPage />
              </PhoneMockup>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Sample;
