import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";

const steps = [
  {
    n: "01",
    t: "Create your business referral page",
    d: "Add your logo, write a one-line description, and pick your referral offer (e.g. $500 per closed roofing job, or 10% of a signed contract). You get a branded page at your own custom URL.",
  },
  {
    n: "02",
    t: "Share it with customers, partners, and your network",
    d: "Send the link by email or text. Drop the QR code on invoices, business cards, jobsite signs, or your shop counter. Every scan goes to your referral page.",
  },
  {
    n: "03",
    t: "Manage leads and pay referrers directly",
    d: "Every referral lands in your dashboard with the lead's name, contact, and what they need. You update status, close the deal, and pay the referrer however works for you — Revvin stays out of the way.",
  },
];

const HowItWorks = () => {
  return (
    <>
      <SEOHead
        title="How Revvin works — referral page in 3 steps"
        description="Create a branded referral page, share your link or QR code, manage every lead from a simple dashboard. Pay referrers directly when deals close."
        path="/how-it-works"
      />

      <section className="border-b border-border">
        <div className="container py-20 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">How it works</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            Three steps to a referral program that runs itself.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Revvin gives your business the referral infrastructure. You handle the relationship.
          </p>
        </div>
      </section>

      <section>
        <div className="container py-16 max-w-3xl space-y-10">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-8 md:p-10">
              <div className="text-xs font-mono text-muted-foreground mb-3">{s.n}</div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{s.t}</h2>
              <p className="mt-3 text-base text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="container py-20 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Ready in minutes.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            $147 for the first 3 months, then $49/month. Cancel anytime.
          </p>
          <Button size="lg" className="h-12 px-8 mt-8" asChild>
            <Link to="/signup">Start your referral program</Link>
          </Button>
        </div>
      </section>
    </>
  );
};

export default HowItWorks;