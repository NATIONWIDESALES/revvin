import { Link } from "react-router-dom";

/**
 * Founder/trust note rendered above the final CTA on the homepage.
 *
 * TODO(founder): replace the placeholder copy below with the real founder
 * bio + photo before launch. Do NOT invent a founder backstory — this is
 * an editable placeholder, intentionally generic, until real copy lands.
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
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            A branded page, a QR code, a lead inbox, and one flat price. No
            middleman on your payouts, no per-referral fees, no contract. If
            something's off or you need help getting set up, email us directly
            at{" "}
            <a
              href="mailto:info@revvin.co"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              info@revvin.co
            </a>{" "}
            — a human will answer.
          </p>
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