import { PAGE_META } from "@/content/pageMeta";
import SEOHead from "@/components/SEOHead";
import MockPageBuilder from "@/components/marketing/MockPageBuilder";
import MockQRCard from "@/components/marketing/MockQRCard";
import MockLeadsTable from "@/components/marketing/MockLeadsTable";
import { PRICE_TEXT } from "@/config/pricing";
import StepTrack from "@/components/marketing/StepTrack";
import FinalBand from "@/components/marketing/FinalBand";

const steps = [
  {
    n: "01",
    t: "Set up your page and load your customer list",
    d: "Add your business name, logo, service area, and referral offer, then pick your custom Revvin URL. Import the customers who have already paid you. That one list is what the whole engine runs on. Building and publishing your page is free.",
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
        title={PAGE_META["/how-it-works"].title}
        description={PAGE_META["/how-it-works"].description}
        path="/how-it-works"
      />

      <section className="border-b border-line">
        <div className="mk-wrap max-w-4xl py-20 md:py-24">
          <h1 className="text-5xl leading-[0.98] md:text-7xl">
            Three steps to an engine that runs off your jobs.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Set up your page once, then send the asks yourself with pre-written messages after each finished job. Referrals, repeat work, and reviews from the customer list you already have. You handle the relationship.
          </p>
        </div>
      </section>

      <section className="mk-section border-b border-line bg-card" aria-labelledby="track-heading">
        <div className="mk-wrap">
          <h2 id="track-heading" className="mk-h2">How one text turns into a booked job</h2>
          <StepTrack />
        </div>
      </section>

      <section className="border-b border-line">
        <div className="container py-20 space-y-20">
          {steps.map((s, i) => (
            <div key={s.n} className="relative grid items-center gap-10 md:grid-cols-12">
              <div className={`md:col-span-6 ${i % 2 === 1 ? "md:order-2" : ""}`}>
                <p className="mb-2 font-display text-2xl font-bold text-primary">Step {Number(s.n)}</p>
                <h2 className="text-3xl md:text-4xl">{s.t}</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">{s.d}</p>
              </div>
              <div className={`md:col-span-6 ${i % 2 === 1 ? "md:order-1" : ""}`}>
                <div className="mx-auto max-w-md">{s.visual}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <FinalBand
        heading="Ready in minutes."
        body={`Free to publish and take referrals. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD for the tools that ask your whole customer list for you. Cancel anytime, no contract.`}
      />
    </>
  );
};

export default HowItWorks;