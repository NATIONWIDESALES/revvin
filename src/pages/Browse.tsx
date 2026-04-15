import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, SlidersHorizontal, Map, List, Building2, PlusCircle, X, Sparkles
} from "lucide-react";
import OfferCard from "@/components/OfferCard";
import MapView from "@/components/MapView";
import SEOHead from "@/components/SEOHead";
import { categories } from "@/lib/offerUtils";
import { useDbOffers } from "@/hooks/useDbOffers";
import { sampleOffers } from "@/data/sampleOffers";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { useCountry } from "@/contexts/CountryContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Country } from "@/types/offer";
import type { Offer } from "@/types/offer";

type SortOption = "payout" | "newest" | "fastest";

const Browse = () => {
  const { data: dbOffers = [], isLoading } = useDbOffers();
  const { country, setCountry } = useCountry();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("payout");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [payoutRange, setPayoutRange] = useState([0, 1000]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  // Merge DB offers with sample offers (real offers first)
  const allOffers: (Offer & { isSample?: boolean })[] = useMemo(() => {
    const real = dbOffers.map(o => ({ ...o, isSample: false as const }));
    // Only show samples if < 10 real offers
    if (real.length >= 10) return real;
    return [...real, ...sampleOffers];
  }, [dbOffers]);

  const availableStates = useMemo(() => {
    const countryOffers = country === "ALL" ? allOffers : allOffers.filter(o => o.country === country);
    return [...new Set(countryOffers.map(o => o.state))].sort();
  }, [country, allOffers]);

  const availableCities = useMemo(() => {
    let offers = country === "ALL" ? allOffers : allOffers.filter(o => o.country === country);
    if (stateFilter) offers = offers.filter(o => o.state === stateFilter);
    return [...new Set(offers.map(o => o.city))].sort();
  }, [country, stateFilter, allOffers]);

  const filtered = allOffers
    .filter((o) => {
      const matchesCountry = country === "ALL" || o.country === country;
      const matchesSearch =
        o.title.toLowerCase().includes(search.toLowerCase()) ||
        o.business.toLowerCase().includes(search.toLowerCase()) ||
        o.description.toLowerCase().includes(search.toLowerCase()) ||
        o.location.toLowerCase().includes(search.toLowerCase()) ||
        o.city.toLowerCase().includes(search.toLowerCase());
      const matchesCat = activeCategory === "All" || o.category === activeCategory;
      const matchesPayout = o.payout >= payoutRange[0] && o.payout <= payoutRange[1];
      const matchesVerified = !verifiedOnly || o.verified !== false;
      const matchesState = !stateFilter || o.state === stateFilter;
      const matchesCity = !cityFilter || o.city === cityFilter;
      return matchesCountry && matchesSearch && matchesCat && matchesPayout && matchesVerified && matchesState && matchesCity;
    })
    .sort((a, b) => {
      // Real offers always sort above sample offers
      if (a.isSample !== b.isSample) return a.isSample ? 1 : -1;
      if (sortBy === "payout") return b.payout - a.payout;
      if (sortBy === "fastest") return (a.closeTimeDays ?? 99) - (b.closeTimeDays ?? 99);
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });

  // Featured: top 4 highest-payout offers
  const featuredOffers = useMemo(() => {
    return [...allOffers]
      .sort((a, b) => {
        if (a.isSample !== b.isSample) return a.isSample ? 1 : -1;
        return b.payout - a.payout;
      })
      .slice(0, 4);
  }, [allOffers]);

  const clearFilters = () => {
    setSearch(""); setActiveCategory("All"); setPayoutRange([0, 1000]);
    setVerifiedOnly(false); setStateFilter(""); setCityFilter("");
  };

  // Check if offer is new (< 7 days)
  const isNewOffer = (createdAt?: string) => {
    if (!createdAt) return false;
    return Date.now() - new Date(createdAt).getTime() < 7 * 86400000;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="py-6">
      <SEOHead
        title="Browse Referral Offers — Earn Money Referring Customers on Revvin"
        description="Explore referral opportunities from verified businesses. Earn $150 to $1,500+ per closed referral. Browse by category, city, or payout amount. Solar, real estate, mortgage, fitness, childcare, and more."
        path="/browse"
        jsonLd={filtered.length > 0 ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Referral Offers on Revvin",
          "description": "Browse active referral opportunities from verified businesses",
          "itemListElement": filtered.filter(o => !o.isSample).slice(0, 20).map((offer, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "item": {
              "@type": "Offer",
              "name": `${offer.business} — ${offer.title}`,
              "description": offer.description,
              "price": String(offer.payout),
              "priceCurrency": offer.currency,
              "areaServed": offer.location,
              "offeredBy": {
                "@type": "LocalBusiness",
                "name": offer.business,
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": offer.city,
                  "addressRegion": offer.state,
                  "addressCountry": offer.country
                }
              }
            }
          }))
        } : undefined}
      />
      <div className="container">
        {/* Featured Offers */}
        {featuredOffers.length > 0 && !search && activeCategory === "All" && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Featured Offers</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredOffers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} isSample={offer.isSample} isNew={isNewOffer(offer.createdAt)} />
              ))}
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="mb-5 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by category, city, or business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5 h-12 px-5"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </Button>
          <div className="hidden sm:flex gap-1 items-center">
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-12 w-12" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "map" ? "default" : "ghost"} size="icon" className="h-12 w-12" onClick={() => setViewMode("map")}>
              <Map className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Category pill filters */}
        <div className="mb-5 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 pb-2 min-w-max">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-foreground hover:bg-muted"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters modal/drawer */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 polished-card overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">Filters</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* Country */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Country</label>
                  <div className="flex gap-1">
                    {([["ALL", "🌎 Both"], ["US", "🇺🇸 USA"], ["CA", "🇨🇦 Canada"]] as [Country | "ALL", string][]).map(([val, label]) => (
                      <Button key={val} size="sm" variant={country === val ? "default" : "outline"} onClick={() => setCountry(val)} className="flex-1 text-xs">
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
                {/* State */}
                <div>
                  <label className="text-sm font-medium mb-2 block">State / Province</label>
                  <Select value={stateFilter || "all"} onValueChange={(v) => { setStateFilter(v === "all" ? "" : v); setCityFilter(""); }}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {availableStates.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* City */}
                <div>
                  <label className="text-sm font-medium mb-2 block">City</label>
                  <Select value={cityFilter || "all"} onValueChange={(v) => setCityFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="All Cities" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {availableCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Payout range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Payout: ${payoutRange[0]} – ${payoutRange[1]}+</label>
                  <Slider value={payoutRange} onValueChange={setPayoutRange} min={0} max={1000} step={25} className="mt-3" />
                </div>
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                <Button size="sm" variant={verifiedOnly ? "default" : "outline"} onClick={() => setVerifiedOnly(!verifiedOnly)}>Verified Only</Button>
                <div className="ml-auto">
                  <Button size="sm" variant="ghost" onClick={clearFilters}>Clear All</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sort + count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filtered.length} opportunities</p>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="payout">Highest Payout</SelectItem>
              <SelectItem value="fastest">Fastest Close</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {viewMode === "map" ? (
          <MapView offers={filtered} />
        ) : filtered.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((offer) => (
              <OfferCard key={offer.id} offer={offer} isSample={offer.isSample} isNew={isNewOffer(offer.createdAt)} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Building2 className="mx-auto mb-6 h-12 w-12 text-muted-foreground/30" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              {dbOffers.length === 0 ? "The marketplace is warming up" : "No offers match your filters"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {dbOffers.length === 0
                ? "Businesses are being onboarded right now. New referral opportunities from realtors, contractors, gyms, and more will appear here soon."
                : "Try adjusting your search or filter criteria to find more opportunities."}
            </p>
            {dbOffers.length === 0 ? (
              <div className="max-w-2xl mx-auto">
                <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">Categories coming soon</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["Real Estate", "Home Services", "Automotive", "Fitness", "Financial Services", "Solar & Energy", "Contractors", "Legal"].map(cat => (
                    <span key={cat} className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-muted-foreground">
                      {cat}
                    </span>
                  ))}
                </div>
                <div className="mt-8">
                  <Button asChild>
                    <Link to="/auth?mode=signup&role=business">
                      <PlusCircle className="mr-2 h-4 w-4" /> Be the first to list
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={clearFilters}>
                Clear All Filters
              </Button>
            )}
          </div>
        )}

        {/* Invite CTA for referrers */}
        <div className="mt-8 rounded-xl border border-border bg-muted/30 p-5 text-center">
          <p className="text-sm font-semibold text-foreground mb-1">Don't see your industry?</p>
          <p className="text-sm text-muted-foreground mb-4">Invite a business you know to list their referral program on REVVIN.CO</p>
          <Button variant="outline" asChild className="gap-2">
            <Link to="/dashboard"><PlusCircle className="h-4 w-4" /> Invite a Business</Link>
          </Button>
        </div>

        {/* Business CTA */}
        <div className="mt-4 rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-l-4 border-l-primary">
          <div>
            <h3 className="text-lg font-bold">Are you a business?</h3>
            <p className="text-sm text-muted-foreground">List your referral program and start receiving qualified leads.</p>
          </div>
          <Button asChild className="gap-2 shrink-0">
            <Link to="/auth?mode=signup&role=business"><PlusCircle className="h-4 w-4" /> Create an Offer</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Browse;
