import { Link } from "react-router-dom";

/**
 * Founder/trust note rendered above the final CTA on the homepage.
 *
 * This is intentionally unsigned: it says the company is small and
 * independent and that a human answers email, without revealing any
 * personal identity.
 */
const FounderNote = () => {
  return (
    <section className="border-b border-border bg-surface-warm">
      <div className="container py-20 md:py-24">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 shadow-soft md:p-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            A note from the team
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            We built Revvin because referrals beat ads — but most businesses don't have the tooling to actually run a program.
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-muted-foreground">
            <p>
              Revvin is small and independent. There are no case studies yet —
              the product is new and we are onboarding founding businesses one
              by one. If something is not working or you have a question before
              signing up, email{" "}
              <a
                href="mailto:info@revvin.co"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                info@revvin.co
              </a>{" "}
              and a real person will get back to you.
            </p>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Questions about how it works?{" "}
            <Link
              to="/how-it-works"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              See the 3-step walkthrough
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
};

export default FounderNote;
