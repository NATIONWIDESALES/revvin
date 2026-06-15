import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { ArrowRight, Check, Bell, Pencil, Smartphone, CreditCard, BarChart3, Zap, Users } from "lucide-react";
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
import LiveTicker from "@/components/marketing/LiveTicker";
import StatsMarquee from "@/components/marketing/StatsMarquee";
import Wordmark from "@/components/brand/Wordmark";

const FEATURED_OFFERS = [
  { id: "apex", business: "Apex Roofing", category: "Roofing", city: "Denver", state: "CO", payout: 500, desc: "Refer a closed roofing job", owner: "Mike Doyle" },
  { id: "northair", business: "NorthAir HVAC", category: "HVAC", city: "Calgary", state: "AB", payout: 300, desc: "Refer a furnace or AC install", owner: "Sarah Lin" },
  { id: "greenscape", business: "GreenScape Landscaping", category: "Landscaping", city: "Vancouver", state: "BC", payout: 400, desc: "Refer a full backyard project", owner: "Tom Patel" },
  { id: "bcmortgage", business: "BC Mortgage Pros", category: "Mortgage", city: "Surrey", state: "BC", payout: 250, desc: "Refer a funded mortgage", owner: "Priya Shah" },
  { id: "volt", business: "Volt Solar", category: "Solar", city: "Phoenix", state: "AZ", payout: 750, desc: "Refer a solar installation", owner: "Diego Ramos" },
  { id: "proshine", business: "ProShine Detailing", category: "Auto", city: "Toronto", state: "ON", payout: 150, desc: "Refer a ceramic coating", owner: "Alex Chen" },
  { id: "clearview", business: "ClearView Windows", category: "Home Services", city: "Seattle", state: "WA", payout: 350, desc: "Refer a window replacement", owner: "Jamie Roy" },
  { id: "summit", business: "Summit Real Estate", category: "Real Estate", city: "Calgary", state: "AB", payout: 1000, desc: "Refer a buyer or seller", owner: "Erin Walsh" },
];

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
        title="Revvin — Launch a referral program in minutes"
        description="Branded referral page, shareable link and QR code, and a simple lead inbox. $49/month, cancel anytime. No contract."
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Revvin Business Referral Page",
            description: "Referral program software for service businesses.",
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
            mainEntity: [
              { "@type": "Question", name: "What if I don't get any referrals?", acceptedAnswer: { "@type": "Answer", text: "Revvin is built so you can prime the pump on day one: text your existing client list with your branded page link, drop the QR on invoices, and add it to your email signature. Your page stays live, you can edit your offer anytime, and any leads you do get cost a fraction of an ad-driven lead." } },
              { "@type": "Question", name: "Does Revvin pay the referrers for me?", acceptedAnswer: { "@type": "Answer", text: "No. Revvin is the infrastructure — your branded page, lead capture, and dashboard. You pay referrers directly when the deal closes, in whatever way works for your business." } },
              { "@type": "Question", name: "How does billing work?", acceptedAnswer: { "@type": "Answer", text: "Pro is a flat $49/month, billed monthly. No trial, no contract, no setup fee, no platform fees. Cancel anytime from your billing portal; your page stays live until the end of the period you've already paid for." } },
              { "@type": "Question", name: "Is there a free tier?", acceptedAnswer: { "@type": "Answer", text: "Referrers create a free account to send leads and get paid directly by the business. Businesses run on the flat $49/month plan with no trial and no setup fee." } },
              { "@type": "Question", name: "Do you have a marketplace where I can browse offers?", acceptedAnswer: { "@type": "Answer", text: "Yes. Listing on the public Revvin marketplace is live and optional — toggle it on in your dashboard so motivated referrers can find your offer. Your own branded referral page works either way." } },
              { "@type": "Question", name: "What if I cancel?", acceptedAnswer: { "@type": "Answer", text: "You can cancel from your Stripe customer portal anytime. Your referral page stays live until the end of the paid period." } },
              { "@type": "Question", name: "What kind of businesses is Revvin for?", acceptedAnswer: { "@type": "Answer", text: "Service businesses where one new customer is worth real money — roofers, HVAC, plumbers, real estate, mortgage, insurance, solar, home services, and more." } },
            ],
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
                Now live
              </span>
              <h1 className="mt-5 text-[2.5rem] font-extrabold tracking-tight text-foreground leading-[1.02] sm:text-5xl md:text-7xl">
                The complete{" "}
                <span className="highlight-underline text-gradient-green">referral system</span>{" "}
                for your business.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
                Get a branded referral page, QR code, and pipeline CRM to turn your customers into your sales team. Optional: get listed on the Revvin marketplace where motivated referrers can find your offer. <span className="text-foreground font-medium">$49/month flat.</span>
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="shine-on-hover h-12 w-full px-5 text-sm shadow-product transition-transform hover:-translate-y-[1px] hover:bg-primary-deep sm:w-auto sm:px-6 sm:text-base" asChild>
                  <Link to="/signup">
                    <span className="sm:hidden">Start your program — $49/mo</span>
                    <span className="hidden sm:inline">Start your referral program — $49/month</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 w-full px-6 text-base sm:w-auto" asChild>
                  <Link to="/how-it-works">See how it works</Link>
                </Button>
              </div>
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                $49/month. Cancel anytime. No contract, no setup fee.
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
                <p className="text-[10px] text-muted-foreground">Apex Roofing · paid Carlos R.</p>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-3/4 bg-gradient-to-r from-primary to-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Offers from the Revvin Marketplace */}
      <section className="border-b border-border bg-background">
        <div className="container py-16 md:py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3">
              The Revvin.co marketplace
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Your offer, seen by referrers nationwide.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              Businesses on Revvin can opt into our public marketplace, where motivated referrers browse offers and submit real customers. The cards below are example offers to show how listings appear.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_OFFERS.map((o) => {
              const hue = businessHue(o.business);
              return (
                <article
                  key={o.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-product"
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{ background: `hsl(${hue} 65% 45%)` }}
                  />
                  <div className="relative flex h-32 items-center justify-center" style={{ background: `hsl(${hue} 30% 96%)` }}>
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl text-sm font-bold text-white shadow-soft"
                      style={{ background: `hsl(${hue} 60% 40%)` }}
                    >
                      {initials(o.business)}
                    </div>
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
                      {o.city}, {o.state}
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
              <Link to="/signup">List your business here</Link>
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

      {/* What you get — bento */}
      <section className="border-b border-border">
        <div className="container py-24">
          <div className="mb-12 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3">What you get</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Everything you need to run a referral program.
            </h2>
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

            {/* Offer headline tile */}
            <div className="bento-tile md:col-span-2 flex flex-col justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Your offer</p>
              <div className="py-2">
                <p className="text-2xl font-extrabold leading-tight tracking-tight text-foreground">
                  Refer a customer,<br />earn <span className="text-primary">$500</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Set, edit, and publish in seconds.</p>
            </div>

            {/* URL tile */}
            <div className="bento-tile md:col-span-3">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Your custom URL</p>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <span className="font-mono text-sm text-foreground">apex-roofing.revvin.co</span>
                <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">COPY</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Branded. Shareable. Memorable.</p>
            </div>

            {/* Small feature tiles */}
            <div className="bento-tile md:col-span-3 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><Bell className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Email + SMS notifications</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Get pinged the second a referral comes in.</p>
              </div>
            </div>

            <div className="bento-tile md:col-span-2 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><Pencil className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Edit anytime</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Change your offer in one click.</p>
              </div>
            </div>
            <div className="bento-tile md:col-span-2 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><Smartphone className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Mobile-friendly</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Looks right on every device.</p>
              </div>
            </div>
            <div className="bento-tile md:col-span-2 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><CreditCard className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Stripe billing portal</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Cancel or update card anytime.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-b border-border bg-surface-warm">
        <div className="container py-24">
          <div className="mx-auto max-w-2xl">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-10 shadow-product md:p-12">
              <span className="absolute left-0 top-0 h-full w-[3px] bg-primary" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-4">
                Pro · Business Referral Page
              </p>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-6xl font-extrabold tracking-tight text-foreground">$49</span>
                <span className="text-base font-medium text-muted-foreground">/month</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Cancel anytime. No contract. No setup fee.</p>

              <Button size="lg" className="mt-8 h-12 w-full text-base shadow-soft hover:bg-primary-deep" asChild>
                <Link to="/signup">Start your referral program</Link>
              </Button>

              <div className="mt-8 grid grid-cols-1 gap-y-2.5 border-t border-border pt-6 sm:grid-cols-2 sm:gap-x-8">
                {[
                  "Branded referral page",
                  "Offer builder",
                  "Lead inbox & dashboard",
                  "QR code (PNG + print)",
                  "Email + SMS notifications",
                  "Stripe billing portal",
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
              <AccordionItem value="q0">
              <AccordionTrigger>What if I don't get any referrals?</AccordionTrigger>
              <AccordionContent>
                Revvin is built so you can prime the pump on day one: text your existing client list with your branded page link, drop the QR code on invoices, and add it to your email signature. Your page stays live, you can edit your offer anytime, and any leads you do get cost a fraction of an ad-driven lead.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q1">
              <AccordionTrigger>Does Revvin pay the referrers for me?</AccordionTrigger>
              <AccordionContent>
                No. Revvin is the infrastructure — your branded page, lead capture, and dashboard. You pay referrers directly when the deal closes, in whatever way works for your business.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>How does billing work?</AccordionTrigger>
              <AccordionContent>
                Pro is a flat $49/month, billed monthly. No trial, no contract, no setup fee, no platform fees. Cancel anytime from your billing portal; your page stays live until the end of the period you've already paid for.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Is there a free tier?</AccordionTrigger>
              <AccordionContent>
                Referrers create a free account to send leads and get paid directly by the business. Businesses run on the flat $49/month plan with no trial and no setup fee.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>Do you have a marketplace where I can browse offers?</AccordionTrigger>
              <AccordionContent>
                Yes — the Revvin marketplace is live. Listing your offer is optional and toggleable in your dashboard. When on, motivated referrers browsing the marketplace can find your offer and submit leads; when off, your branded referral page still works for your own network.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger>What if I cancel?</AccordionTrigger>
              <AccordionContent>
                You can cancel from your Stripe customer portal anytime. Your referral page stays live until the end of the paid period.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q6">
              <AccordionTrigger>What kind of businesses is Revvin for?</AccordionTrigger>
              <AccordionContent>
                Service businesses where one new customer is worth real money — roofers, HVAC, plumbers, real estate, mortgage, insurance, solar, home services, and more.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA — dark */}
      <LiveTicker variant="dark" />
      <section className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="aurora opacity-80" />
        <div aria-hidden className="grain opacity-[0.08]" />
        <div className="container relative py-24 text-center">
          <Wordmark size="xl" variant="white" />
          <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
            Launch your referral program <span className="shimmer-text">today.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            $49/month. Cancel anytime. No contract.
          </p>
          <Button size="lg" className="shine-on-hover mt-10 h-13 px-10 text-base bg-primary text-primary-foreground shadow-product hover:bg-primary-deep" asChild>
            <Link to="/signup">Start your referral program</Link>
          </Button>
        </div>
      </section>
    </>
  );
};

export default Index;