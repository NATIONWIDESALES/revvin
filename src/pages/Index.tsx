import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import {
  ArrowRight,
  Check,
  Bell,
  CreditCard,
  BarChart3,
  Zap,
  Users,
  Repeat,
  Star,
  Share2,
  Printer,
  Webhook,
  Wallet,
  CalendarClock,
  MessageSquare,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PhoneMockup from "@/components/marketing/PhoneMockup";
import MockReferralPage from "@/components/marketing/MockReferralPage";
import MockLeadsTable from "@/components/marketing/MockLeadsTable";
import MockQRCard from "@/components/marketing/MockQRCard";
import MockPageBuilder from "@/components/marketing/MockPageBuilder";
import TrustBar from "@/components/marketing/TrustBar";
import StatsMarquee from "@/components/marketing/StatsMarquee";
import Wordmark from "@/components/brand/Wordmark";
import RoiCalculator from "@/components/marketing/RoiCalculator";
import PlaybookEmailCapture from "@/components/marketing/PlaybookEmailCapture";
import Testimonials from "@/components/marketing/Testimonials";
import FounderNote from "@/components/marketing/FounderNote";
import RiskReversalStrip from "@/components/marketing/RiskReversalStrip";

const FEATURED_OFFERS = [
  // Illustrative placeholders only. Do NOT use real or invented company names here.
  { id: "ex-roofing", business: "A roofing company near you", category: "Roofing", city: "Denver", state: "CO", payout: 500, desc: "Example offer · refer a closed roofing job", owner: "Local business owner" },
  { id: "ex-hvac", business: "An HVAC company near you", category: "HVAC", city: "Phoenix", state: "AZ", payout: 300, desc: "Example offer · refer a furnace or AC install", owner: "Local business owner" },
  { id: "ex-landscape", business: "A landscaping company near you", category: "Landscaping", city: "Austin", state: "TX", payout: 400, desc: "Example offer · refer a full backyard project", owner: "Local business owner" },
  { id: "ex-plumbing", business: "A plumbing company near you", category: "Plumbing", city: "Charlotte", state: "NC", payout: 250, desc: "Example offer · refer a repipe or water heater job", owner: "Local business owner" },
  { id: "ex-solar", business: "A solar installer near you", category: "Solar", city: "San Diego", state: "CA", payout: 750, desc: "Example offer · refer a solar installation", owner: "Local business owner" },
  { id: "ex-auto", business: "An auto detailer near you", category: "Auto", city: "Miami", state: "FL", payout: 150, desc: "Example offer · refer a ceramic coating", owner: "Local business owner" },
  { id: "ex-windows", business: "A window company near you", category: "Home Services", city: "Chicago", state: "IL", payout: 350, desc: "Example offer · refer a window replacement", owner: "Local business owner" },
  { id: "ex-electrical", business: "An electrician near you", category: "Electrical", city: "Seattle", state: "WA", payout: 350, desc: "Example offer · refer a panel upgrade or rewire", owner: "Local business owner" },
];

// Single source of truth for FAQ — drives both the visible accordion and the FAQPage JSON-LD.
const FAQS: { question: string; answer: string }[] = [
  {
    question: "What are the three loops?",
    answer:
      "Three ways Revvin puts your existing customer list back to work. Loop one is referrals: a branded referral page, a shareable link and QR code, a lead inbox, and an auto-ask that fires a personalised request a couple of hours after a job is done. Loop two is repeat work: segment past customers by how long since their last job and send seasonal or maintenance campaigns. Loop three is reviews: request a review after a job, then follow up asking happy customers to refer someone. Same list, three revenue loops.",
  },
  {
    question: "What if I do not get any referrals?",
    answer:
      "Referrals come from making the ask, so Revvin makes the ask automatic. Mark a job done and Revvin sends a personalised request a couple of hours later, using the customer name, the technician name, and the service. Every reply lands in your lead inbox where you can text or call back in one tap. And referrals are only loop one: the same customer list also drives reactivation campaigns and review requests. It is month to month, so you can cancel anytime.",
  },
  {
    question: "Does Revvin pay the referrers for me?",
    answer:
      "No. Revvin tracks the reward from pending to paid and notifies your referrer at both moments, but you pay your referrers directly, on whatever reward and terms you choose. There are no platform fees on your rewards and no payout middleman.",
  },
  {
    question: "How does billing work?",
    answer:
      "Building your page is free. You are only charged when you publish it. Publishing costs a flat $49/month USD, billed monthly, with no contract, no setup fee, and no platform fees, and it includes all three loops. Cancel anytime from your Stripe billing portal; your page stays live until the end of the period you've already paid for.",
  },
  {
    question: "What is free and what costs money?",
    answer:
      "Creating your account and building your page, offer, and QR code is free, and you can preview it before you commit. This is not a trial and not a free plan with usage limits: your page cannot receive referrals until you publish it, and publishing costs $49/month USD. Referrers always use Revvin for free: they create an account, send leads, and get paid directly by the business.",
  },
  {
    question: "Can Revvin fire the ask from the tools I already use?",
    answer:
      "Yes. Revvin has webhooks and an API, so marking a job complete in another tool can trigger the auto-ask in Revvin, and lead, deal, and payout events can be pushed back out to your own systems or to a generic webhook step in a tool like Zapier.",
  },
  {
    question: "Do you have a marketplace where I can browse offers?",
    answer:
      "The Revvin marketplace is launching — we're onboarding founding businesses now. Every business also gets a branded referral page and shareable link or QR code that works on its own, so your program isn't dependent on the marketplace. Listing publicly is optional, and early listings are seen by every referrer who lands on the site while it's still small.",
  },
  {
    question: "What if I cancel?",
    answer:
      "You can cancel anytime from your Stripe billing portal — no contract and no cancellation fee. Your page and link stay live until the end of the billing period you've already paid for, then they're paused. Your lead and customer history isn't deleted, so if you come back later your data is still there.",
  },
  {
    question: "What kind of businesses is Revvin for?",
    answer:
      "Service businesses where one new customer is worth real money: roofers, HVAC, plumbers, electricians, landscapers, painters, solar installers, auto detailers, and other home services.",
  },
];

// The three revenue loops — the primary explainer for the page.
const LOOPS = [
  {
    n: "01",
    label: "Referrals",
    icon: Share2,
    headline: "Turn a finished job into the next one.",
    body:
      "A branded referral page on your own custom URL, with a shareable link and QR code. Mark a job done and Revvin sends a personalised ask a couple of hours later, using the customer name, the technician name, and the service. Replies land in a lead inbox where you can text or call back in one tap.",
    points: [
      "Branded referral page, custom URL, link and QR code",
      "Lead inbox with status tracking and one-tap text or call back",
      "Job done auto-ask, personalised and sent on a delay",
    ],
  },
  {
    n: "02",
    label: "Repeat work",
    icon: Repeat,
    headline: "Rebook the customers you already have.",
    body:
      "Segment your past customers by how long it has been since their last job, then send a seasonal or maintenance campaign to that segment. Start from a template, send it, and see what came back. The same list that referred you also rebooks you.",
    points: [
      "Segment by time since last job",
      "Seasonal and maintenance campaign templates",
      "Results reporting on what each campaign brought in",
    ],
  },
  {
    n: "03",
    label: "Reviews",
    icon: Star,
    headline: "Ask for the review, then ask for the referral.",
    body:
      "After a job, Revvin requests a review. Everyone gets asked, not just the happy ones. Then it follows up with the customers who told you they were happy and asks them to refer someone, which feeds straight back into loop one.",
    points: [
      "Review request after every job",
      "Follow-up referral ask for happy customers",
      "Feeds new referrals back into loop one",
    ],
  },
];

// Category → free Unsplash stock photo (public CDN URLs). Sized for card thumbnails.
const CATEGORY_IMAGE: Record<string, string> = {
  Roofing: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=800&q=60",
  HVAC: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=60",
  Landscaping: "https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=800&q=60",
  Plumbing: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=60",
  Solar: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=60",
  Auto: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=60",
  "Home Services": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=60",
  Electrical: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=60",
};
const DEFAULT_CATEGORY_IMAGE =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=60";

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

const businessHue = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
};

const Index = () => {
  return (
    <>
      <SEOHead
        title="Revvin · Your customer list, working for you"
        description="Turn your past customers into referrals, repeat work, and reviews. Build free, pay $49/month USD only when you publish. Cancel anytime."
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Revvin",
            description:
              "Customer retention and referral software for service businesses. Turns one past-customer list into three revenue loops: referrals with a branded referral page, link, QR code, lead inbox and job-done auto-ask; repeat work with reactivation campaigns segmented by time since last job; and review requests with a follow-up referral ask. Includes reward tracking, an ROI scoreboard, a print pack, and webhooks with an API. Building your page is free; publishing costs a flat $49/month. Businesses pay their referrers directly off-platform.",
            brand: { "@type": "Brand", name: "Revvin" },
            offers: {
              "@type": "Offer",
              price: "49.00",
              priceCurrency: "USD",
              url: "https://revvin.co/pricing",
              availability: "https://schema.org/InStock",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border hero-radial">
        <div aria-hidden className="aurora" />
        <div aria-hidden className="absolute inset-0 grid-faint" />
        <div aria-hidden className="grain" />
        <div className="container relative py-14 md:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70 shadow-soft backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Referrals · Repeat work · Reviews
              </span>
              <h1 className="mt-5 text-[2.5rem] font-extrabold tracking-tight text-foreground leading-[1.02] sm:text-5xl md:text-7xl">
                Your{" "}
                <span className="highlight-underline text-gradient-green">customer list</span>,
                working for you.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
                You already have a list of people who paid you and never heard from you again. Revvin turns that one list into three revenue loops: <span className="text-foreground font-medium">referrals, repeat work, and reviews.</span> Build it free. $49/month USD when you publish.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="shine-on-hover h-12 w-full px-5 text-sm shadow-product transition-transform hover:-translate-y-[1px] hover:bg-primary-deep sm:w-auto sm:px-6 sm:text-base" asChild>
                  <Link to="/signup">
                    <span className="sm:hidden">Build your page — free</span>
                    <span className="hidden sm:inline">Build your page — free</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 w-full px-6 text-base sm:w-auto" asChild>
                  <Link to="/how-it-works">See the three loops</Link>
                </Button>
              </div>
            <p className="mt-4 text-sm text-muted-foreground">
                Just browsing?{" "}
                <Link to="/sample" className="font-medium text-foreground underline-offset-4 hover:underline">
                  See a sample referral page
                </Link>
              </p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Free to build and preview. $49/month USD when you publish. Cancel anytime.
              </p>
            </div>

            <div className="relative lg:col-span-5">
              <PhoneMockup rotate={4}>
                <MockReferralPage />
              </PhoneMockup>
              {/* floating notification card (example) */}
              <div className="absolute -left-2 top-8 hidden w-56 rounded-xl border border-border bg-card/95 p-3 shadow-product backdrop-blur md:block animate-fade-up" style={{ transform: "rotate(-4deg)" }}>
                <span className="absolute -top-2 right-2 rounded-full bg-muted px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Example</span>
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Bell className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-foreground">New referral</p>
                    <p className="truncate text-[10px] text-muted-foreground">Jordan M. · roof replacement</p>
                    <p className="mt-0.5 text-[9px] uppercase tracking-wider text-primary">just now</p>
                  </div>
                </div>
              </div>
              {/* floating deal-closed card (example) */}
              <div className="absolute -bottom-2 -right-2 hidden w-60 rounded-xl border border-border bg-card/95 p-3 shadow-product backdrop-blur md:block animate-fade-up" style={{ transform: "rotate(5deg)", animationDelay: "0.2s" }}>
                <span className="absolute -top-2 right-2 rounded-full bg-muted px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Example</span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Deal closed</p>
                <p className="mt-1 text-xl font-extrabold tracking-tight text-foreground">+$8,400</p>
                <p className="text-[10px] text-muted-foreground">Example referral payout</p>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-3/4 bg-gradient-to-r from-primary to-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The three loops — primary explainer */}
      <section className="border-b border-border bg-background">
        <div className="container py-20 md:py-28">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              The three loops
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              One list. Three ways it pays you back.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              Every service business is sitting on the list of people who already paid them, and never touches it again. Revvin runs three loops off that one list. Referrals are the wedge, and they are loop one of three.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {LOOPS.map((loop) => (
              <article
                key={loop.n}
                className="relative flex flex-col rounded-2xl border border-border bg-card p-7 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-product"
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-primary/70" />
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <loop.icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Loop {loop.n} · <span className="text-primary">{loop.label}</span>
                  </p>
                </div>
                <h3 className="mt-5 text-xl font-bold leading-tight tracking-tight text-foreground">
                  {loop.headline}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{loop.body}</p>
                <ul className="mt-6 space-y-2.5 border-t border-border pt-5">
                  {loop.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
            All three loops are included in the one $49/month USD price. You pay your referrers directly; Revvin never handles reward money.
          </p>
        </div>
      </section>

      {/* Featured Offers from the Revvin Marketplace */}
      <section className="border-b border-border bg-background">
        <div className="container py-16 md:py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Your offer, in front of motivated referrers.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              The Revvin marketplace is launching. Build your listing free and be one of the first offers referrers see when you go live.
            </p>
            <p className="mx-auto mt-4 inline-flex max-w-fit items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Illustrative examples · not real businesses
            </p>
          </div>

          <div className="mt-8 -mx-4 px-4 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:snap-none sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {FEATURED_OFFERS.map((o) => {
              const hue = businessHue(o.business);
              return (
                <article
                  key={o.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-product snap-start shrink-0 w-[78%] sm:w-auto sm:shrink"
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{ background: `hsl(${hue} 65% 45%)` }}
                  />
                  <div
                    className="relative h-32 overflow-hidden rounded-t-2xl bg-muted"
                    style={{ backgroundColor: `hsl(${hue} 30% 92%)` }}
                  >
                    <img
                      src={CATEGORY_IMAGE[o.category] || DEFAULT_CATEGORY_IMAGE}
                      alt={`${o.category} example`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-foreground/85 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-background">
                      {o.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-2xl font-extrabold tracking-tight text-foreground">
                        ${o.payout.toLocaleString()}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        per closed deal
                      </p>
                    </div>
                    <h3 className="mt-3 text-sm font-bold leading-tight text-foreground">{o.business}</h3>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">{o.desc}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {o.state ? `${o.city}, ${o.state}` : o.city}
                    </p>
                    <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{ background: `hsl(${(hue + 60) % 360} 55% 45%)` }}
                      >
                        {initials(o.owner)}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{o.owner}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="outline" size="lg" asChild className="h-12 px-6">
              <Link to="/browse">Browse the marketplace <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" className="h-12 px-6 shadow-product hover:bg-primary-deep" asChild>
              <Link to="/signup">Build your listing — free</Link>
            </Button>
          </div>
        </div>
      </section>

      <TrustBar />

      <StatsMarquee />

      {/* How it works */}
      <section className="border-b border-border bg-surface-warm">
        <div className="container py-24">
          <div className="mb-16 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3">How it works</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              From signup to referrals in under 10 minutes.
            </h2>
          </div>

          <div className="space-y-20">
            {[
              { n: "01", t: "Build your referral page", d: "Add your logo, write your offer, and pick a custom URL. We do the rest.", visual: <MockPageBuilder /> },
              { n: "02", t: "Share your link or QR code", d: "Email it to past customers. Stick the QR on invoices, jobsites, business cards.", visual: <MockQRCard /> },
              { n: "03", t: "Receive and manage leads", d: "Every referral lands in your dashboard. Track status. Pay your referrer directly when the deal closes.", visual: <MockLeadsTable /> },
            ].map((s, i) => (
              <div key={s.n} className="relative grid items-center gap-10 md:grid-cols-12">
                <span className="watermark-num pointer-events-none absolute -top-10 left-0 hidden text-[180px] md:block">
                  {s.n}
                </span>
                <div className={`md:col-span-6 ${i % 2 === 1 ? "md:order-2" : ""}`}>
                  <div className="relative">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:hidden">
                      Step {s.n}
                    </p>
                    <h3 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                      {s.t}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-muted-foreground md:text-lg">
                      {s.d}
                    </p>
                  </div>
                </div>
                <div className={`md:col-span-6 ${i % 2 === 1 ? "md:order-1" : ""}`}>
                  <div className="mx-auto max-w-md">{s.visual}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get · bento */}
      <section className="border-b border-border">
        <div className="container py-24">
          <div className="mb-12 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3">What you get</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Everything the three loops need, in one place.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              The asks fire on their own, the leads land in one inbox, the rewards get tracked to paid, and the scoreboard tells you what it all returned.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-6 md:grid-rows-[auto_auto_auto]">
            {/* Big leads dashboard tile */}
            <div className="bento-tile md:col-span-4 md:row-span-2">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Lead inbox</p>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground">Every referral in one place</h3>
                </div>
              </div>
              <MockLeadsTable />
            </div>

            {/* QR tile */}
            <div className="bento-tile md:col-span-2">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">QR code</p>
              <MockQRCard className="border-0 p-0 shadow-none" />
            </div>

            {/* Auto-ask tile */}
            <div className="bento-tile md:col-span-2 flex flex-col justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Job done auto-ask</p>
              <div className="py-2">
                <p className="text-lg font-bold leading-snug tracking-tight text-foreground">
                  Mark the job done. The ask sends itself.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Personalised with the customer name, technician name, and service, then sent on a delay.
              </p>
            </div>

            {/* URL tile */}
            <div className="bento-tile md:col-span-3">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Your custom URL</p>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <span className="font-mono text-sm text-foreground">your-business.revvin.co</span>
                <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">COPY</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Branded. Shareable. Memorable.</p>
            </div>

            {/* Reactivation campaigns */}
            <div className="bento-tile md:col-span-3 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><CalendarClock className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Reactivation campaigns</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Segment past customers by time since their last job, send from a template, and see the results.</p>
              </div>
            </div>

            <div className="bento-tile md:col-span-3 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><MessageSquare className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Review requests</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Ask for a review after the job, then follow up asking happy customers to refer someone.</p>
              </div>
            </div>

            <div className="bento-tile md:col-span-3 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><Wallet className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Reward tracking, pending to paid</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Your referrer is notified when the deal closes and again when you mark the reward paid. You pay them directly.</p>
              </div>
            </div>

            <div className="bento-tile md:col-span-3 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><BarChart3 className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">ROI scoreboard</p>
                <p className="mt-0.5 text-xs text-muted-foreground">See what the loops returned against what you spent, right on your dashboard.</p>
              </div>
            </div>

            <div className="bento-tile md:col-span-2 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><Printer className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Print pack</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Yard signs, door hangers, invoice inserts, business cards, and truck magnets.</p>
              </div>
            </div>

            <div className="bento-tile md:col-span-2 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><Webhook className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Webhooks and API</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Job complete in another tool can fire the auto-ask in Revvin.</p>
              </div>
            </div>

            <div className="bento-tile md:col-span-2 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><Zap className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">One-tap text or call back</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Reply to a new referral from your phone the moment it lands.</p>
              </div>
            </div>

            <div className="bento-tile md:col-span-3 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><Bell className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Email and in-app notifications</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Get pinged the second a referral comes in.</p>
              </div>
            </div>

            <div className="bento-tile md:col-span-3 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><CreditCard className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Stripe billing portal</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Cancel or update your card anytime.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials / founding-customer CTA */}
      <Testimonials />

      {/* Pricing teaser */}
      <section className="border-b border-border bg-surface-warm">
        <div className="container py-24">
          <div className="mx-auto max-w-2xl">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-10 shadow-product md:p-12">
              <span className="absolute left-0 top-0 h-full w-[3px] bg-primary" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-4">
                Pro · All three loops
              </p>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-6xl font-extrabold tracking-tight text-foreground">$49</span>
                <span className="text-base font-medium text-muted-foreground">/month USD</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Free to build and preview your page. Billing starts when you publish it. Cancel anytime. No contract, no setup fee. Billed in USD.</p>

              <Button size="lg" className="mt-8 h-12 w-full text-base shadow-soft hover:bg-primary-deep" asChild>
                <Link to="/signup">Build your page free</Link>
              </Button>

              <div className="mt-8 grid grid-cols-1 gap-y-2.5 border-t border-border pt-6 sm:grid-cols-2 sm:gap-x-8">
                {[
                  "Branded referral page, link and QR code",
                  "Lead inbox with one-tap text or call back",
                  "Job done auto-ask",
                  "Reactivation campaigns",
                  "Review requests with referral follow-up",
                  "Reward tracking and ROI scoreboard",
                  "Print pack",
                  "Webhooks and API",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm text-foreground">{f}</span>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Cancel anytime &middot; <Link to="/pricing" className="underline hover:text-foreground">Full plan details</Link>
              </p>
            </div>
            <div className="mt-6">
              <RiskReversalStrip />
            </div>
          </div>
        </div>
      </section>

      {/* Old way vs Revvin */}
      <section className="border-b border-border">
        <div className="container py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              What if I don't get referrals?
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              The math is <span className="text-gradient-green">on your side.</span>
            </h2>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Old way</p>
              <h3 className="mt-1 text-xl font-bold text-foreground">Buying leads from ads</h3>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3"><span className="mt-2 h-1 w-3 shrink-0 bg-foreground/30" />Pay $400+ per lead on Google Ads</li>
                <li className="flex gap-3"><span className="mt-2 h-1 w-3 shrink-0 bg-foreground/30" />Compete with 5 other roofers for the same click</li>
                <li className="flex gap-3"><span className="mt-2 h-1 w-3 shrink-0 bg-foreground/30" />Burn $3,000 to find out which keywords work</li>
                <li className="flex gap-3"><span className="mt-2 h-1 w-3 shrink-0 bg-foreground/30" />Hope the lead picks up the phone</li>
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-primary bg-card p-8 shadow-product">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">With Revvin</p>
              <h3 className="mt-1 text-xl font-bold text-foreground">Your own referral engine</h3>
              <ul className="mt-6 space-y-3 text-sm text-foreground">
                <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />One flat price, your own referral page</li>
                <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Customers share your link with people they trust</li>
                <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Leads arrive pre-warmed and in your dashboard</li>
                <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />You decide what to pay referrers when deals close</li>
              </ul>
            </div>
          </div>

          <RoiCalculator />

          <p className="mx-auto mt-12 max-w-3xl text-center text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            Most leads cost <span className="highlight-underline">$200–$600</span>. Most referrals cost{" "}
            <span className="shimmer-text">a handshake</span>.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border bg-surface-warm">
        <div className="container max-w-3xl py-24">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Questions</p>
          <h2 className="mb-10 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Frequently asked.
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`q${i}`}>
                <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA · dark */}
      <PlaybookEmailCapture />

      <FounderNote />

      <section className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="aurora opacity-80" />
        <div aria-hidden className="grain opacity-[0.08]" />
        <div className="container relative py-24 text-center">
          <Wordmark size="xl" variant="white" />
          <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
            Launch your referral program <span className="shimmer-text">today.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Build your page free. $49/month USD when you go live. Cancel anytime.
          </p>
          <Button size="lg" className="shine-on-hover mt-10 h-13 px-10 text-base bg-primary text-primary-foreground shadow-product hover:bg-primary-deep" asChild>
            <Link to="/signup">Build your referral page — free</Link>
          </Button>
          <p className="mt-5 text-sm text-white/70">
            Not ready?{" "}
            <Link to="/sample" className="font-medium text-white underline-offset-4 hover:underline">
              See a sample referral page
            </Link>
          </p>
        </div>
      </section>
    </>
  );
};

export default Index;