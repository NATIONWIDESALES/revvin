import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { setInviteCode, getInviteCode } from "@/lib/invite";
import { track } from "@/lib/track";
import SEOHead from "@/components/SEOHead";
import Wordmark from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import PhoneMockup from "@/components/marketing/PhoneMockup";
import MockReferralPage from "@/components/marketing/MockReferralPage";
import SignupForm from "@/components/signup/SignupForm";
import InviteBanner from "@/components/invite/InviteBanner";
import { ArrowRight, Link2, QrCode, Inbox } from "lucide-react";

/**
 * Invite landing page: revvin.co/i/LAUNCH.
 *
 * Captures the code exactly as before, then sells before it asks instead of
 * dropping people straight onto a bare form.
 */
const InviteLanding = () => {
  const { code } = useParams();
  const [stored, setStored] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const held = (code ? setInviteCode(code) : null) ?? getInviteCode();
    setStored(held);
    if (code && held) track("invite_link_opened", { invite_code: held });
    track("invite_landing_viewed", held ? { invite_code: held } : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const goToForm = () => {
    track("invite_cta_clicked", stored ? { invite_code: stored } : undefined);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      const first = formRef.current?.querySelector<HTMLInputElement>("input");
      first?.focus({ preventScroll: true });
    }, 450);
  };

  const steps = [
    { icon: Link2, text: "Publish your referral page free, with your business name and your reward." },
    { icon: QrCode, text: "Share the link or QR code with a customer after a job." },
    { icon: Inbox, text: "Referrals land in your inbox, and you pay the reward yourself when a deal closes." },
  ];

  return (
    <>
      <SEOHead title="Revvin invite | Your free referral page" description="Turn the customers you already have into your next job. Publish a free referral page with a link and QR code, and reply to referrals in one tap." path="/signup" noindex />

      <div className="px-4 pb-24 pt-6 sm:pb-16">
        <div className="mx-auto max-w-5xl">
          <Link to="/" className="mb-6 flex items-center justify-center" aria-label="Revvin home">
            <Wordmark size="md" />
          </Link>

          {/* 1. Above the fold */}
          <header className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Turn the customers you already have into your next job.
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Your own referral page with a link and a QR code, free to publish. Referrals land in an
              inbox you can reply to in one tap.
            </p>
            <div className="mt-6 flex justify-center">
              <Button size="lg" onClick={goToForm}>
                Create your free page
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            {stored && <InviteBanner code={stored} compact className="mt-5 justify-center text-left" />}
          </header>

          {/* 2. Show the product */}
          <section className="mt-14 grid items-center gap-10 md:grid-cols-2">
            <div className="flex justify-center">
              <PhoneMockup rotate={0}>
                <MockReferralPage />
              </PhoneMockup>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                This is the page your customers see
              </h2>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                An illustration, not a real business. Yours carries your name, your service area and
                the reward you choose. One link, one QR code, and a short form that sends the referral
                straight to you.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Revvin never messages your customers for you. You send the link yourself, from your own
                phone or email, whenever it makes sense.
              </p>
            </div>
          </section>

          {/* 3. Three steps */}
          <section className="mt-14">
            <ol className="grid gap-4 sm:grid-cols-3">
              {steps.map((s, i) => (
                <li key={i} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <s.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <p className="mt-3 text-sm text-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* 5. Honest expectations */}
          <section className="mx-auto mt-10 max-w-2xl rounded-xl border border-border bg-surface-warm p-5">
            <h2 className="text-sm font-semibold text-foreground">What this is, plainly</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The value here is your own page and your own customers. Our public marketplace is still
              filling up, so do not count on strangers finding you there yet. Publishing is free. Revvin
              Pro is $49/month USD and adds the customer list, bulk asks that open your own email app,
              ROI reporting and page branding. Your invite holds Revvin Pro at $17/month instead of $49, after three months free.
            </p>
          </section>

          {/* 4. The form */}
          <section ref={formRef} id="signup" className="mt-14 scroll-mt-6">
            <div className="mx-auto w-full max-w-md">
              <div className="text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Create your free account
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  No card needed. Takes about a minute.
                </p>
              </div>
              <div className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                <SignupForm formId="invite-signup-form" showStickyMobileBar={false} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default InviteLanding;
