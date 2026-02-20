import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, Map, List, Building2, ArrowRight, PlusCircle } from "lucide-react";
import OfferCard from "@/components/OfferCard";
import MapView from "@/components/MapView";
import { mockOffers, categories } from "@/data/mockOffers";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

type SortOption = "payout" | "rating" | "success" | "fastest" | "newest";
type CloseTimeFilter = "all" | "fast" | "medium" | "long";

const Browse = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("payout");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [payoutRange, setPayoutRange] = useState([0, 1000]);
  const [payoutTypeFilter, setPayoutTypeFilter] = useState<"all" | "flat" | "percentage">("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [fundSecuredOnly, setFundSecuredOnly] = useState(false);
  const [closeTimeFilter, setCloseTimeFilter] = useState<CloseTimeFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = mockOffers
    .filter((o) => {
      const matchesSearch =
        o.title.toLowerCase().includes(search.toLowerCase()) ||
        o.business.toLowerCase().includes(search.toLowerCase()) ||
        o.description.toLowerCase().includes(search.toLowerCase()) ||
        o.location.toLowerCase().includes(search.toLowerCase());
      const matchesCat = activeCategory === "All" || o.category === activeCategory;
      const matchesPayout = o.payout >= payoutRange[0] && o.payout <= payoutRange[1];
      const matchesType = payoutTypeFilter === "all" || o.payoutType === payoutTypeFilter;
      const matchesRemote = !remoteOnly || o.remoteEligible;
      const matchesVerified = !verifiedOnly || o.verified !== false;
      const matchesFundSecured = !fundSecuredOnly || o.fundSecured === true;
      const matchesCloseTime = closeTimeFilter === "all" || (() => {
        const days = o.closeTimeDays ?? 30;
        if (closeTimeFilter === "fast") return days <= 14;
        if (closeTimeFilter === "medium") return days > 14 && days <= 45;
        return days > 45;
      })();
      return matchesSearch && matchesCat && matchesPayout && matchesType && matchesRemote && matchesVerified && matchesFundSecured && matchesCloseTime;
    })
    .sort((a, b) => {
      if (sortBy === "payout") return b.payout - a.payout;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "fastest") return (a.closeTimeDays ?? 99) - (b.closeTimeDays ?? 99);
      if (sortBy === "newest") return parseInt(b.id) - parseInt(a.id);
      return b.successRate - a.successRate;
    });

  return (
    <div className="py-8">
      <div className="container">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Browse Opportunities</h1>
            <p className="mt-2 text-muted-foreground">
              {filtered.length} referral programs available • Find your next earning opportunity
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="gap-1.5"
            >
              <List className="h-4 w-4" /> List
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="gap-1.5"
            >
              <Map className="h-4 w-4" /> Map
            </Button>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by category, city, or business name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1.5 h-11 px-4"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
            {(["payout", "fastest", "newest", "success"] as SortOption[]).map((s) => (
              <Button
                key={s}
                variant={sortBy === s ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy(s)}
                className="capitalize hidden sm:flex h-11"
              >
                {s === "success" ? "Success Rate" : s === "fastest" ? "Fastest Close" : s === "newest" ? "Newest" : "Highest Payout"}
              </Button>
            ))}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm"
          >
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Payout Range: ${payoutRange[0]} – ${payoutRange[1]}+
                </label>
                <Slider value={payoutRange} onValueChange={setPayoutRange} min={0} max={1000} step={25} className="mt-3" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Commission Type</label>
                <div className="flex gap-2 mt-2">
                  {(["all", "flat", "percentage"] as const).map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={payoutTypeFilter === t ? "default" : "outline"}
                      onClick={() => setPayoutTypeFilter(t)}
                      className="capitalize flex-1"
                    >
                      {t === "all" ? "All" : t === "flat" ? "$ Flat" : "% Pct"}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Close Time</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {([["all", "Any"], ["fast", "Fast (0–14d)"], ["medium", "Med (15–45d)"], ["long", "Long (45d+)"]] as [CloseTimeFilter, string][]).map(([key, label]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={closeTimeFilter === key ? "default" : "outline"}
                      onClick={() => setCloseTimeFilter(key)}
                      className="text-xs"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Options</label>
                <div className="mt-2 flex flex-col gap-2">
                  <Button size="sm" variant={remoteOnly ? "default" : "outline"} onClick={() => setRemoteOnly(!remoteOnly)}>
                    Remote Eligible Only
                  </Button>
                  <Button size="sm" variant={verifiedOnly ? "default" : "outline"} onClick={() => setVerifiedOnly(!verifiedOnly)}>
                    Verified Only
                  </Button>
                  <Button size="sm" variant={fundSecuredOnly ? "default" : "outline"} onClick={() => setFundSecuredOnly(!fundSecuredOnly)}>
                    🛡️ Funds Secured Only
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Category Pills */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              className="cursor-pointer px-3.5 py-1.5 text-sm transition-all hover:shadow-sm"
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Content */}
        {viewMode === "map" ? (
          <MapView offers={filtered} />
        ) : filtered.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card py-20 text-center">
            <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-display text-lg font-semibold text-foreground">No offers match your filters</p>
            <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search, category, or filter criteria</p>
            <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setActiveCategory("All"); setPayoutRange([0, 1000]); setPayoutTypeFilter("all"); setRemoteOnly(false); setVerifiedOnly(false); setFundSecuredOnly(false); setCloseTimeFilter("all"); }}>
              Clear All Filters
            </Button>
          </div>
        )}

        {/* Business CTA strip */}
        <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-bold">Are you a business?</h3>
            <p className="text-sm text-muted-foreground">List your referral program and start receiving qualified leads today.</p>
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
