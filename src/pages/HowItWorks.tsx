import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import MockPageBuilder from "@/components/marketing/MockPageBuilder";
import MockQRCard from "@/components/marketing/MockQRCard";
import MockLeadsTable from "@/components/marketing/MockLeadsTable";

const steps = [
  {
    n: "01",
    t: "Create your business referral page",
    d: "Add your business name, logo, service area, and offer. Pick your custom Revvin URL. Done in under 10 minutes.",
    visual: <MockPageBuilder />,
  },
  {
    n: "02",
    t: "Share it with customers, partners, and your network",
    d: "Send the link by email or text. Drop the QR code on invoices, business cards, jobsite signs, or your shop counter. Every scan goes to your referral page.",
    visual: <MockQRCard />,
  },
  {
    n: "03",
    t: "Manage leads and pay referrers directly",
    d: "Every referral lands in your dashboard with the lead's name, contact, and what they need. When a deal closes, you pay the referrer directly. Revvin doesn't touch the money. You set the terms with whoever you trust.",
    visual: <MockLeadsTable />,
  },
];

const HowItWorks = () => {
  return (
    <>
      <SEOHead
        title="How Revvin works, referral page in 3 steps"
        description="Create a branded referral page, share your link or QR code, manage every lead from a simple dashboard. Pay referrers directly when deals close."
        path="/how-it-works"
      />

      <section className="relative overflow-hidden border-b border-border hero-radial">
        <div aria-hidden className="absolute inset-0 grid-faint" />
        <div className="container relative max-w-3xl py-24">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">How it works</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
            Three steps to a referral program that runs itself.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Revvin gives your business the referral infrastructure. You handle the relationship.
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-surface-warm">
        <div className="container py-24 space-y-24">
          {steps.map((s, i) => (
            <div key={s.n} className="relative grid items-center gap-10 md:grid-cols-12">
              <span className="watermark-num pointer-events-none absolute -top-12 left-0 hidden text-[200px] md:block">
                {s.n}
              </span>
              <div className={`md:col-span-6 ${i % 2 === 1 ? "md:order-2" : ""}`}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Step {s.n}</p>
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">{s.t}</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">{s.d}</p>
              </div>
              <div className={`md:col-span-6 ${i % 2 === 1 ? "md:order-1" : ""}`}>
                <div className="mx-auto max-w-md">{s.visual}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="container max-w-2xl py-24 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">Ready in minutes.</h2>
          <p className="mt-4 text-lg text-white/70">
            $49/month. Cancel anytime. No contract.
          </p>
          <Button size="lg" className="mt-8 h-12 px-8 bg-primary text-primary-foreground hover:bg-primary-deep" asChild>
            <Link to="/signup">Start your referral program</Link>
          </Button>
        </div>
      </section>
    </>
  );
};

export default HowItWorks;