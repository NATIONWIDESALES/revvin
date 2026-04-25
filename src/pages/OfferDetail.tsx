import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, DollarSign, CheckCircle2, Clock, FileCheck, BadgeCheck, AlertTriangle, Loader2, Send, ArrowRight } from "lucide-react";
import { toSlug } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCountry } from "@/contexts/CountryContext";
import { motion } from "framer-motion";
import ShareOfferLink from "@/components/ShareOfferLink";
import ReferralWizard from "@/components/ReferralWizard";
import SEOHead from "@/components/SEOHead";
import type { Offer } from "@/types/offer";
import { sampleOffers } from "@/data/sampleOffers";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const OfferDetail = () => {
  const { id, businessSlug } = useParams();
  const navigate = useNavigate();
  const { formatPayout } = useCountry();

  const { data: offer, isLoading } = useQuery({
    queryKey: ["offer-detail", id],
    queryFn: async (): Promise<Offer | null> => {
      if (!id) return null;
      
      // First try to fetch from database
      const { data, error } = await supabase
        .from("offers")
        .select("*, businesses(name, logo_url, city, state, verified, latitude, longitude)")
        .eq("id", id)
        .single();

      if (!error && data) {
        const o: any = data;
        return {
          id: o.id, title: o.title,
          business: o.businesses?.name ?? "Business",
          businessLogo: o.businesses?.logo_url ?? "🏢",
          category: o.category,
          description: o.description ?? "",
          payout: Number(o.payout),
          payoutType: "flat" as const,
          currency: (o.currency === "CAD" ? "CAD" : "USD") as "CAD" | "USD",
          country: (o.country === "CA" ? "CA" : "US") as "CA" | "US",
          location: o.location ?? `${o.businesses?.city ?? ""}, ${o.businesses?.state ?? ""}`,
          state: o.businesses?.state ?? "", city: o.businesses?.city ?? "",
          rating: 4.5, totalReferrals: 0, successRate: 0,
          featured: o.featured ?? false,
          dealSizeMin: o.deal_size_min ? Number(o.deal_size_min) : undefined,
          dealSizeMax: o.deal_size_max ? Number(o.deal_size_max) : undefined,
          closeTimeDays: o.close_time_days ?? 30,
          remoteEligible: o.remote_eligible ?? false,
          latitude: o.businesses?.latitude ?? undefined,
          longitude: o.businesses?.longitude ?? undefined,
          qualificationRules: o.qualification_criteria ? [o.qualification_criteria] : undefined,
          verified: o.businesses?.verified ?? false,
        };
      }
      
      // If not in database, check sample offers
      const sampleOffer = sampleOffers.find(o => o.id === id);
      return sampleOffer || null;
    },
    enabled: !!id,
  });

  if (offer && !businessSlug) {
    navigate(`/offer/${toSlug(offer.business)}/${offer.id}`, { replace: true });
  }

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!offer) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">Offer not found.</p>
        <Button variant="ghost" className="mt-4" asChild><Link to="/browse">Back to Browse</Link></Button>
      </div>
    );
  }

  const isLogoUrl = offer.businessLogo.startsWith("http");
  const qualificationRules = offer.qualificationRules ?? [
    "Lead must be new (not existing customer)",
    "Customer must be reachable by phone or email",
    "Located within the business service area",
  ];
  const payoutTimelineLabel = offer.payoutTimeline === "net7" ? "Net 7" : offer.payoutTimeline === "net14" ? "Net 14" : offer.payoutTimeline === "net30" ? "Net 30" : `~${offer.closeTimeDays} days`;

  // ---- SEO helpers ----
  const offerPath = `/offer/${toSlug(offer.business)}/${offer.id}`;
  const canonicalUrl = `https://revvin.co${offerPath}`;
  const payoutText = formatPayout(offer.payout, offer.currency);

  // Title: keep under ~60 chars where possible. Format prioritises payout
  // (the value prop) + business name + brand.
  const seoTitle = `Earn ${payoutText} referring ${offer.business} | Revvin`;

  // Description: aim for 140–160 chars and never cut a word in half.
  const truncate = (s: string, max: number) => {
    const clean = s.replace(/\s+/g, " ").trim();
    if (clean.length <= max) return clean;
    const slice = clean.slice(0, max);
    const lastSpace = slice.lastIndexOf(" ");
    return `${(lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).replace(/[.,;:\s]+$/, "")}…`;
  };
  const intro = `Earn ${payoutText} per closed referral with ${offer.business} in ${offer.location || offer.city || offer.state || "North America"}.`;
  const seoDescription = truncate(
    `${intro} ${offer.description ?? ""}`.trim(),
    158,
  );

  // Use the real business logo as the OG image when available; otherwise
  // fall back to the platform default (handled inside SEOHead).
  const isLogoUrl = typeof offer.businessLogo === "string" && offer.businessLogo.startsWith("http");
  const seoOgImage = isLogoUrl ? offer.businessLogo : undefined;

  return (
    <div className="py-8">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        path={offerPath}
        ogImage={seoOgImage}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": offer.business,
            "image": isLogoUrl ? offer.businessLogo : undefined,
            "url": canonicalUrl,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": offer.city,
              "addressRegion": offer.state,
              "addressCountry": offer.country,
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "Offer",
            "name": offer.title,
            "description": offer.description,
            "url": canonicalUrl,
            "category": offer.category,
            "availability": "https://schema.org/InStock",
            "price": String(offer.payout),
            "priceCurrency": offer.currency,
            "areaServed": offer.location || offer.city || offer.state || undefined,
            "offeredBy": {
              "@type": "LocalBusiness",
              "name": offer.business,
              "url": canonicalUrl,
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Browse", "item": "https://revvin.co/browse" },
              { "@type": "ListItem", "position": 2, "name": offer.category, "item": `https://revvin.co/browse?category=${encodeURIComponent(offer.category)}` },
              { "@type": "ListItem", "position": 3, "name": offer.title, "item": canonicalUrl },
            ],
          },
        ]}
      />
      <div className="container max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" className="gap-1" asChild>
            <Link to="/browse"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <ShareOfferLink offerId={offer.id} offerTitle={offer.title} businessName={offer.business} />
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Details */}
          <motion.div initial="hidden" animate="visible" className="lg:col-span-3 space-y-8">
            {/* Header */}
            <motion.div variants={fadeUp} custom={0} className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary text-3xl shadow-sm overflow-hidden shrink-0">
                {isLogoUrl ? <img src={offer.businessLogo} alt={offer.business} className="h-full w-full object-cover" /> : offer.businessLogo}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground md:text-3xl">{offer.title}</h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-1">
                  {offer.country === "CA" ? "🇨🇦" : "🇺🇸"} {offer.business}
                  {offer.verified !== false && <BadgeCheck className="h-4 w-4 text-primary" />}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{offer.category}</Badge>
                  {offer.featured && <Badge className="bg-accent text-accent-foreground">Featured</Badge>}
                </div>
              </div>
            </motion.div>

            {/* Key stats row */}
            <motion.div variants={fadeUp} custom={1} className="flex flex-wrap gap-6 py-5 border-y border-border">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-earnings" />
                <div>
                  <p className="text-lg font-bold">{formatPayout(offer.payout, offer.currency)}</p>
                  <p className="text-xs text-muted-foreground">Per Referral</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-lg font-bold">{offer.location}</p>
                  <p className="text-xs text-muted-foreground">Location</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-lg font-bold">{payoutTimelineLabel}</p>
                  <p className="text-xs text-muted-foreground">Payout Timeline</p>
                </div>
              </div>
            </motion.div>

            {/* Description */}
            <motion.div variants={fadeUp} custom={2}>
              <h2 className="text-lg font-semibold mb-3">About This Opportunity</h2>
              <p className="text-muted-foreground leading-relaxed">{offer.description}</p>
            </motion.div>

            {/* Deal Details */}
            {(offer.dealSizeMin && offer.dealSizeMax) && (
              <motion.div variants={fadeUp} custom={3} className="py-5 border-y border-border">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Estimated Deal Size:</span>
                  <span className="font-bold">{offer.currency === "CAD" ? "CA" : ""}${offer.dealSizeMin.toLocaleString()} – ${offer.dealSizeMax.toLocaleString()} {offer.currency}</span>
                </div>
              </motion.div>
            )}

            {/* Qualification Rules */}
            <motion.div variants={fadeUp} custom={4}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" /> Qualification Rules
              </h3>
              <ul className="space-y-2.5">
                {qualificationRules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {rule}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <AlertTriangle className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                <span><strong>Duplicate Lead Policy:</strong> First submission wins, timestamped.</span>
              </div>
            </motion.div>

            {/* Payout Earnings Callout */}
            <motion.div variants={fadeUp} custom={5} className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
              <p className="text-lg font-bold text-foreground">
                You earn <span className="text-primary">{formatPayout(offer.payout, offer.currency)}</span> for every closed deal.
              </p>
              <p className="text-sm text-muted-foreground mt-1">Full payout, every time. No hidden fees.</p>
            </motion.div>

            {/* Trust Signals */}
            <motion.div variants={fadeUp} custom={5.5} className="space-y-2">
              {[
                "Business verified by REVVIN",
                "Payout terms locked when referral is accepted",
                "Platform-mediated payout — you never chase payment",
                "Dispute resolution if anything goes wrong",
              ].map((signal) => (
                <div key={signal} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {signal}
                </div>
              ))}
            </motion.div>

            {/* Payout Timeline */}
            <motion.div variants={fadeUp} custom={6}>
              <h2 className="text-lg font-semibold mb-4">How You Get Paid</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0">
                {[
                  { icon: Send, label: "Submit Referral" },
                  { icon: Clock, label: "Business Reviews (1-2 days)" },
                  { icon: CheckCircle2, label: "Deal Closes" },
                  { icon: DollarSign, label: "You Get Paid (3-5 days)" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <step.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-foreground whitespace-nowrap">{step.label}</span>
                    {i < 3 && <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground mx-2 shrink-0" />}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* How Verification Works */}
            <motion.div variants={fadeUp} custom={7}>
              <h2 className="text-lg font-semibold mb-4">How It Works</h2>
              <div className="space-y-3">
                {[
                  "You submit the referral with contact details and context",
                  `${offer.business} reviews and reaches out to your lead`,
                  "Revvin tracks the deal status and verifies the outcome",
                  "Deal closes → your payout is approved and paid",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </div>
                    <p className="text-sm text-muted-foreground pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Referral Wizard Sidebar */}
          <div className="lg:col-span-2">
            <ReferralWizard offer={offer} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferDetail;
