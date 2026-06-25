import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { ArrowRight, Check, Bell, Pencil, Smartphone, CreditCard, BarChart3, Zap, Users, Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  // Illustrative placeholders only. Do NOT use real or invented company names here.
  { id: "ex-roofing", business: "A roofing company near you", category: "Roofing", city: "Your city", state: "", payout: 500, desc: "Example offer · refer a closed roofing job", owner: "Local business owner" },
  { id: "ex-hvac", business: "An HVAC company near you", category: "HVAC", city: "Your city", state: "", payout: 300, desc: "Example offer · refer a furnace or AC install", owner: "Local business owner" },
  { id: "ex-landscape", business: "A landscaping company near you", category: "Landscaping", city: "Your city", state: "", payout: 400, desc: "Example offer · refer a full backyard project", owner: "Local business owner" },
  { id: "ex-mortgage", business: "A mortgage broker near you", category: "Mortgage", city: "Your city", state: "", payout: 250, desc: "Example offer · refer a funded mortgage", owner: "Local business owner" },
  { id: "ex-solar", business: "A solar installer near you", category: "Solar", city: "Your city", state: "", payout: 750, desc: "Example offer · refer a solar installation", owner: "Local business owner" },
  { id: "ex-auto", business: "An auto detailer near you", category: "Auto", city: "Your city", state: "", payout: 150, desc: "Example offer · refer a ceramic coating", owner: "Local business owner" },
  { id: "ex-windows", business: "A window company near you", category: "Home Services", city: "Your city", state: "", payout: 350, desc: "Example offer · refer a window replacement", owner: "Local business owner" },
  { id: "ex-realestate", business: "A real estate agent near you", category: "Real Estate", city: "Your city", state: "", payout: 1000, desc: "Example offer · refer a buyer or seller", owner: "Local business owner" },
];

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

const businessHue = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
};

const Index = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeLocation, setActiveLocation] = useState("All");

  const featuredCategories = useMemo(
    () => ["All", ...Array.from(new Set(FEATURED_OFFERS.map((o) => o.category)))],
    []
  );

  const featuredLocations = useMemo(
    () => ["All", ...Array.from(new Set(FEATURED_OFFERS.map((o) => (o.state ? `${o.city}, ${o.state}` : o.city))))],
    []
  );

  const filteredFeatured = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FEATURED_OFFERS.filter((o) => {
      const matchesCat = activeCategory === "All" || o.category === activeCategory;
      const locKey = o.state ? `${o.city}, ${o.state}` : o.city;
      const matchesLoc = activeLocation === "All" || locKey === activeLocation;
      if (!matchesCat || !matchesLoc) return false;
      if (!q) return true;
      return (
        o.business.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.state.toLowerCase().includes(q) ||
        o.desc.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory, activeLocation]);

  return (
    <>
      <SEOHead
        title="Revvin · Launch a referral program in minutes"
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
              { "@type": "Question", name: "What if I do not get any referrals?", acceptedAnswer: { "@type": "Answer", text: "Referrals come from putting your link in front of happy customers, so results depend on you making the ask. Revvin is built to make that ask easy: a ready to share page, link, and QR code you can send right after a job, plus a lead inbox so nothing slips through the cracks. It is month to month, so you can cancel anytime." } },
              { "@type": "Question", name: "Does Revvin pay the referrers for me?", acceptedAnswer: { "@type": "Answer", text: "No. Revvin gives you the referral infrastructure: a branded referral page, a shareable link, a QR code, and a lead inbox. You pay your referrers directly, on whatever reward and terms you choose. There are no platform fees on your rewards and no payout middleman." } },
              { "@type": "Question", name: "How does billing work?", acceptedAnswer: { "@type": "Answer", text: "Pro is a flat $49/month, billed monthly. No trial, no contract, no setup fee, no platform fees. Cancel anytime from your billing portal; your page stays live until the end of the period you've already paid for." } },
              { "@type": "Question", name: "Is there a free tier?", acceptedAnswer: { "@type": "Answer", text: "Referrers create a free account to send leads and get paid directly by the business. Businesses run on the flat $49/month plan with no trial and no setup fee." } },
              { "@type": "Question", name: "Do you have a marketplace where I can browse offers?", acceptedAnswer: { "@type": "Answer", text: "Yes. The Revvin marketplace is live, and every business also gets a branded referral page and shareable link or QR code that works on its own. Listing on the public marketplace is optional." } },
              { "@type": "Question", name: "What kind of businesses is Revvin for?", acceptedAnswer: { "@type": "Answer", text: "Service businesses where one new customer is worth real money: roofers, HVAC, plumbers, real estate, mortgage, insurance, solar, home services, and more." } },
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
                    <span className="sm:hidden">Start your program · $49/mo</span>
                    <span className="hidden sm:inline">Start your referral program · $49/month</span>
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
                <p className="text-[10px] text-muted-foreground">Example referral payout</p>
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
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Your offer, seen by referrers nationwide.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              The Revvin marketplace is live. The cards below are illustrative examples of how a listing appears, swapped in for real businesses on this page. Browse the live marketplace to see active offers in your area.
            </p>
          </div>

          {/* Search + category + location filter toolbar (sticky on mobile) */}
          <div className="sticky top-14 z-30 -mx-4 mb-6 border-y border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none sm:mb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search offers, businesses, cities…"
                  className="h-11 pl-9"
                  aria-label="Search featured offers"
                />
              </div>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                {featuredCategories.map((c) => {
                  const active = c === activeCategory;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setActiveCategory(c)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                {featuredLocations.map((loc) => {
                  const active = loc === activeLocation;
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setActiveLocation(loc)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {filteredFeatured.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No offers match your search. Try a different keyword or category.
            </p>
          ) : (
          <div className="-mx-4 px-4 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:snap-none sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {filteredFeatured.map((o) => {
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
          )}

          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="outline" size="lg" asChild className="h-12 px-6">
              <Link to="/browse">Browse the marketplace <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" className="h-12 px-6 shadow-product hover:bg-primary-deep" asChild>
              <Link to="/signup">List your business here</Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              asChild
              className="h-12 px-6 text-primary hover:bg-primary/10"
            >
              <Link to="/browse">Browse the marketplace</Link>
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
              Everything you need to run a referral program.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              Track leads, get instant alerts, and see your monthly ROI, all in one place.
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
                <span className="font-mono text-sm text-foreground">your-business.revvin.co</span>
                <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">COPY</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Branded. Shareable. Memorable.</p>
            </div>

            {/* Small feature tiles */}
            <div className="bento-tile md:col-span-3 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><Bell className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Email and in-app notifications</p>
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
            <div className="bento-tile md:col-span-2 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><BarChart3 className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Monthly ROI report</p>
                <p className="mt-0.5 text-xs text-muted-foreground">See the revenue your referrals bring in.</p>
              </div>
            </div>
            <div className="bento-tile md:col-span-2 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><Zap className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Instant lead alerts</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Know the moment a referral comes in.</p>
              </div>
            </div>
            <div className="bento-tile md:col-span-2 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><Users className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">1-click customer import</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Invite your past customers in minutes.</p>
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
                  "Email and in-app notifications",
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
              <AccordionTrigger className="text-left">What if I do not get any referrals?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Referrals come from putting your link in front of happy customers, so results depend on you making the ask. Revvin is built to make that ask easy: a ready to share page, link, and QR code you can send right after a job, plus a lead inbox so nothing slips through the cracks. It is month to month, so you can cancel anytime.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q1">
              <AccordionTrigger className="text-left">Does Revvin pay the referrers for me?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                No. Revvin gives you the referral infrastructure: a branded referral page, a shareable link, a QR code, and a lead inbox. You pay your referrers directly, on whatever reward and terms you choose. There are no platform fees on your rewards and no payout middleman.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger className="text-left">How does billing work?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Pro is a flat $49/month, billed monthly. No trial, no contract, no setup fee, no platform fees. Cancel anytime from your billing portal; your page stays live until the end of the period you've already paid for.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger className="text-left">Is there a free tier?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Referrers create a free account to send leads and get paid directly by the business. Businesses run on the flat $49/month plan with no trial and no setup fee.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger className="text-left">Do you have a marketplace where I can browse offers?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Yes. The Revvin marketplace is live, and every business also gets a branded referral page and shareable link or QR code that works on its own. Listing on the public marketplace is optional.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger className="text-left">What if I cancel?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {/* FOUNDER-CONFIRMED TODO: confirm exact cancellation terms and what happens to the referral page after the paid period ends. */}
                FOUNDER-CONFIRMED TODO: answer pending.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q6">
              <AccordionTrigger className="text-left">What kind of businesses is Revvin for?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Service businesses where one new customer is worth real money: roofers, HVAC, plumbers, real estate, mortgage, insurance, solar, home services, and more.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA · dark */}
      {/*
        LiveTicker hidden for launch: it rendered fabricated activity events
        and named companies. Do NOT re-enable until it is wired to real,
        consented activity data.
        <LiveTicker variant="dark" />
      */}
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