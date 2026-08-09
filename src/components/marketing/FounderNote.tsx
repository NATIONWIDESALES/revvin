import { Link } from "react-router-dom";

/**
 * Founder/trust note rendered above the final CTA on the homepage.
 *
 * Set FOUNDER_PHOTO_URL to a real headshot and it will replace the initials
 * avatar. Phone number and city are intentionally off by default; toggle the
 * flags below if Karm wants them displayed.
 */

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
const FOUNDER_PHOTO_URL: string = "";
const SHOW_FOUNDER_PHONE = false;
const SHOW_FOUNDER_CITY = false;

const FounderNote = () => {
  return (
    <section className="border-b border-border bg-surface-warm">
      <div className="container py-20 md:py-24">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 shadow-soft md:p-12">
          <div className="flex items-start gap-5">
            {FOUNDER_PHOTO_URL ? (
              <img
                src={FOUNDER_PHOTO_URL}
                alt="Karm Sandhu"
                className="h-16 w-16 flex-shrink-0 rounded-full object-cover ring-1 ring-border md:h-20 md:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary ring-1 ring-border md:h-20 md:w-20 md:text-xl">
                KS
              </div>
            )}
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                A note from the founder
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                I built Revvin because I run a service business myself and I wanted a referral tool that was actually simple.
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
            <p>
              My name is Karm Sandhu. I am the founder of Revvin, and right now
              Revvin is a one-person company. I also run{" "}
              <Link
                to="/r/karm-sandhu-real-estate"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Karm Sandhu Real Estate
              </Link>{" "}
              in Vancouver, BC. That business is the first one live on Revvin —
              you can see the page yourself at the link above.
            </p>
            <p>
              There are no case studies yet because the product is new. I am
              onboarding founding businesses one by one, and I answer every email
              to{" "}
              <a
                href="mailto:info@revvin.co"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                info@revvin.co
              </a>{" "}
              personally. If something is not working or you have a question
              before signing up, send me a note and I will get back to you.
            </p>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <p className="text-lg font-bold text-foreground">Karm Sandhu</p>
            <p className="text-sm text-muted-foreground">Founder, Revvin</p>
            {SHOW_FOUNDER_CITY && (
              <p className="text-sm text-muted-foreground">Vancouver, BC</p>
            )}
            {SHOW_FOUNDER_PHONE && (
              // TODO(karm): add phone number here if you want it public
              <p className="text-sm text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FounderNote;
