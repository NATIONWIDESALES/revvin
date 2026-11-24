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
    t: "Build your referral page",
    d: "Add your business name, logo, service area, and referral reward, then pick your custom Revvin URL. Your QR code and print-ready kit come with it. Building and publishing your page is free.",
    visual: <MockPageBuilder />,
  },
  {
    n: "02",
    t: "Bring your customer list",
    d: "Upload a CSV or Excel file, paste a list, or send it to us and we load it. Free covers up to 500 customers. Every customer gets their own personal referral link.",
    visual: <MockQRCard />,
  },
  {
    n: "03",
    t: "Revvin asks every customer for you and follows up",
    d: "Revvin emails every customer their own referral link from your business name, then follows up twice. You can also ask any customer one at a time from your own phone or email app.",
    visual: null,
  },
  {
    n: "04",
    t: "Referrals land in your inbox and you pay when the job closes",
    d: "Every referral lands in your inbox with the lead's name, contact, and what they need, and you can text or call back in one tap. Revvin tracks the reward from pending to paid and notifies your referrer at both moments, but you pay them directly. Revvin never touches the money.",
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
            How Revvin turns finished jobs into referrals.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Set up your page once, bring your customer list, and Revvin emails every customer their own referral link and follows up. Referrals, repeat work, and reviews from the customer list you already have. You handle the relationship.
          </p>
        </div>
      </section>

      <section className="mk-section border-b border-line bg-card" aria-labelledby="track-heading">
        <div className="mk-wrap">
          <h2 id="track-heading" className="mk-h2">How your customer list turns into booked jobs</h2>
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
              {s.visual && (
                <div className={`md:col-span-6 ${i % 2 === 1 ? "md:order-1" : ""}`}>
                  <div className="mx-auto max-w-md">{s.visual}</div>
                </div>
              )}
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