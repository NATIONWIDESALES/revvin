import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal } from "lucide-react";
import OfferCard from "@/components/OfferCard";
import { mockOffers, categories } from "@/data/mockOffers";

const Browse = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"payout" | "rating" | "success">("payout");

  const filtered = mockOffers
    .filter((o) => {
      const matchesSearch =
        o.title.toLowerCase().includes(search.toLowerCase()) ||
        o.business.toLowerCase().includes(search.toLowerCase()) ||
        o.description.toLowerCase().includes(search.toLowerCase());
      const matchesCat = activeCategory === "All" || o.category === activeCategory;
      return matchesSearch && matchesCat;
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
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Browse Referral Opportunities</h1>
          <p className="mt-2 text-muted-foreground">
            Find the perfect referral program and start earning commissions
          </p>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search offers, businesses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(["payout", "rating", "success"] as const).map((s) => (
              <Button
                key={s}
                variant={sortBy === s ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy(s)}
                className="capitalize"
              >
                {s === "success" ? "Success Rate" : s}
              </Button>
            ))}
          </div>
        </div>

        {/* Category pills */}
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              className="cursor-pointer px-3 py-1.5 text-sm transition-colors"
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Results */}
        <div className="mb-4 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"} found
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card py-20 text-center">
            <SlidersHorizontal className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium text-foreground">No offers match your filters</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;
