import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const MARKETPLACE_CATEGORIES = [
  "All categories",
  "Roofing",
  "Solar",
  "Kitchen Remodeling",
  "HVAC",
  "Landscaping",
] as const;

interface Props {
  variant?: "hero" | "inline";
  defaultLocation?: string;
  defaultCategory?: string;
}

export default function MarketplaceSearchBar({ variant = "hero", defaultLocation = "", defaultCategory = "All categories" }: Props) {
  const navigate = useNavigate();
  const [loc, setLoc] = useState(defaultLocation);
  const [cat, setCat] = useState(defaultCategory);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (loc) params.set("location", loc);
    if (cat && cat !== "All categories") params.set("category", cat);
    navigate(`/browse${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const isHero = variant === "hero";

  return (
    <form
      onSubmit={submit}
      className={
        isHero
          ? "flex flex-col gap-2 rounded-2xl bg-card/95 p-2 shadow-product backdrop-blur sm:flex-row sm:items-center"
          : "flex flex-col gap-2 rounded-xl border border-border bg-card p-2 sm:flex-row sm:items-center"
      }
    >
      <div className="relative flex-1">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          placeholder="City, ZIP, or postal code"
          aria-label="Location"
          className="h-11 border-0 bg-transparent pl-9 text-sm shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="hidden h-7 w-px bg-border sm:block" />
      <Select value={cat} onValueChange={setCat}>
        <SelectTrigger className="h-11 w-full border-0 bg-transparent text-sm shadow-none focus:ring-0 sm:w-56">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          {MARKETPLACE_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="lg" className="h-11 shrink-0 px-6 hover:bg-primary-deep">
        <Search className="mr-2 h-4 w-4" /> Search
      </Button>
    </form>
  );
}