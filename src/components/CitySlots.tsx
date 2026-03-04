import { MapPin, BadgeCheck, ArrowRight } from "lucide-react";
import { getCitySlots } from "@/lib/offerUtils";
import { useCountry } from "@/contexts/CountryContext";
import { useDbOffers } from "@/hooks/useDbOffers";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface CitySlotsProps {
  maxDisplay?: number;
  showApplyButton?: boolean;
}

const CitySlots = ({ maxDisplay = 6, showApplyButton = false }: CitySlotsProps) => {
  const { country } = useCountry();
  const { data: offers = [] } = useDbOffers();
  const allSlots = getCitySlots(offers);
  const filtered = country === "ALL" ? allSlots : allSlots.filter(s => s.country === country);
  const display = filtered.slice(0, maxDisplay);

  if (display.length === 0) return null;

  return (
    <div className="polished-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> Verified City Slots
        </h3>
        <span className="text-xs text-muted-foreground">5 slots per category/city</span>
      </div>
      <div className="space-y-2">
        {display.map((slot, i) => {
          const pct = (slot.filledSlots / slot.maxSlots) * 100;
          const flag = slot.country === "CA" ? "🇨🇦" : "🇺🇸";
          const isFull = slot.filledSlots >= slot.maxSlots;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2"
            >
              <span className="text-sm">{flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate">{slot.city} — {slot.category}</span>
                  <span className={`text-xs font-bold ${isFull ? "text-destructive" : pct >= 60 ? "text-accent-foreground" : "text-earnings"}`}>
                    {slot.filledSlots}/{slot.maxSlots}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${isFull ? "bg-destructive" : pct >= 60 ? "bg-accent" : "bg-earnings"}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      {showApplyButton && (
        <Button className="w-full mt-4 gap-1" asChild>
          <Link to="/auth?mode=signup&role=business">
            <BadgeCheck className="h-4 w-4" /> Apply for Verified Placement <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
};

export default CitySlots;
