import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, Map, List, Building2 } from "lucide-react";
import OfferCard from "@/components/OfferCard";
import MapView from "@/components/MapView";
import { mockOffers, categories } from "@/data/mockOffers";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

const Browse = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"payout" | "rating" | "success">("payout");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [payoutRange, setPayoutRange] = useState([0, 1000]);
  const [payoutTypeFilter, setPayoutTypeFilter] = useState<"all" | "flat" | "percentage">("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
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
      return matchesSearch && matchesCat && matchesPayout && matchesType && matchesRemote;
    })
    .sort((a, b) => {
      if (sortBy === "payout") return b.payout - a.payout;
      if (sortBy === "rating") return b.rating - a.rating;
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
              placeholder="Search by business, service, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1.5 h-11 px-4"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
            {(["payout", "rating", "success"] as const).map((s) => (
              <Button
                key={s}
                variant={sortBy === s ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy(s)}
                className="capitalize hidden sm:flex h-11"
              >
                {s === "success" ? "Success Rate" : s}
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
            <div className="grid gap-5 sm:grid-cols-3">
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
                <label className="text-sm font-medium mb-2 block">Eligibility</label>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant={remoteOnly ? "default" : "outline"}
                    onClick={() => setRemoteOnly(!remoteOnly)}
                  >
                    Remote Eligible Only
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
            <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setActiveCategory("All"); setPayoutRange([0, 1000]); setPayoutTypeFilter("all"); setRemoteOnly(false); }}>
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;
