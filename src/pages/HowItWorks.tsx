import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import MockPageBuilder from "@/components/marketing/MockPageBuilder";
import MockQRCard from "@/components/marketing/MockQRCard";
import MockLeadsTable from "@/components/marketing/MockLeadsTable";
import { PRICE_TEXT } from "@/config/pricing";

const steps = [
  {
    n: "01",
    t: "Set up your page and load your customer list",
    d: "Add your business name, logo, service area, and referral offer, then pick your custom Revvin URL. Import the customers who have already paid you. That one list is what the whole engine runs on. Building and previewing is free; you publish when you are ready.",
    visual: <MockPageBuilder />,
  },
  {
    n: "02",
    t: "Mark jobs done and let the asks fire",
    d: "When a job is finished, send the review ask with a pre-written message, then follow up with the customers who said they were happy and ask them to refer someone. The referral ask is personalised with the customer name and the service, and opens in your own texting or email app, so it comes from you. Customers who have not booked in a while get a pre-written rebooking message the same way.",
    visual: <MockQRCard />,
  },
  {
    n: "03",
    t: "Work the leads and pay your referrers",
    d: "Every referral lands in your inbox with the lead's name, contact, and what they need, and you can text or call back in one tap. Move it through your statuses to closed. Revvin tracks the reward from pending to paid and notifies your referrer at both moments, but you pay them directly. Revvin never touches the money. The ROI scoreboard on your dashboard shows what the loops returned.",
    visual: <MockLeadsTable />,
  },
];

const HowItWorks = () => {
  return (
    <>
      <SEOHead
        title="Revvin | How it works"
        description={`See how Revvin turns past customers into referrals, repeat work, and reviews. Your page is free to publish; Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD for the tools that ask your whole customer list for you.`}
        path="/how-it-works"
      />

      <section className="relative overflow-hidden border-b border-border hero-radial">
        <div aria-hidden className="absolute inset-0 grid-faint" />
        <div className="container relative max-w-3xl py-24">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">How it works</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
            Three steps to an engine that runs off your jobs.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Set up your page once, then every finished job triggers the asks. Referrals, repeat work, and reviews from the customer list you already have. You handle the relationship.
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
            {`Free to publish and take referrals. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD for the tools that ask your whole customer list for you. Cancel anytime, no contract.`}
          </p>
          <Button size="lg" className="mt-8 h-12 px-8 bg-primary text-primary-foreground hover:bg-primary-deep" asChild>
            <Link to="/signup">Build your page — free</Link>
          </Button>
        </div>
      </section>
    </>
  );
};

export default HowItWorks;