import type { Offer } from "@/types/offer";

export const categories = [
  "All", "Roofing", "Plumbing", "HVAC", "Landscaping", "Paving", "Home Inspection",
  "Insurance", "Mortgage", "Real Estate", "Energy", "Legal", "Finance",
  "SaaS", "Services", "Technology",
];

export const canadaProvinces = ["BC", "AB", "ON", "QC", "MB", "SK"];
export const usStates = ["CA", "TX", "WA", "AZ", "NY", "FL", "IL", "CO", "GA", "MA"];

export const cityJumpsCA = [
  { label: "Vancouver", lat: 49.2827, lng: -123.1207 },
  { label: "Surrey", lat: 49.1913, lng: -122.849 },
  { label: "Burnaby", lat: 49.2488, lng: -122.9805 },
  { label: "Toronto", lat: 43.6532, lng: -79.3832 },
  { label: "Calgary", lat: 51.0447, lng: -114.0719 },
  { label: "Coquitlam", lat: 49.2838, lng: -122.7932 },
];

export const cityJumpsUS = [
  { label: "Seattle", lat: 47.6062, lng: -122.3321 },
  { label: "LA", lat: 34.0522, lng: -118.2437 },
  { label: "Dallas", lat: 32.7767, lng: -96.797 },
  { label: "Phoenix", lat: 33.4484, lng: -112.074 },
  { label: "NYC", lat: 40.7128, lng: -74.006 },
  { label: "SF", lat: 37.7749, lng: -122.4194 },
];

// ===== OFFER SCORING =====
export interface OfferScore {
  total: number;
  fundSecuredScore: number;
  verificationScore: number;
  payoutCompetitiveness: number;
  payoutSpeed: number;
  closeTimeScore: number;
}

export function calculateOfferScore(offer: Offer, allOffers?: Offer[]): OfferScore {
  const peers = (allOffers ?? [offer]).filter(o => o.city === offer.city || o.category === offer.category);
  const avgPayout = peers.length > 0 ? peers.reduce((s, o) => s + o.payout, 0) / peers.length : offer.payout;

  const fundSecuredScore = offer.fundSecured ? 30 : 0;
  const verificationScore = offer.verified ? 20 : 0;
  const payoutCompetitiveness = Math.min(25, Math.round((offer.payout / Math.max(1, avgPayout)) * 15));
  const payoutSpeed = offer.payoutTimeline === "net7" ? 15 : offer.payoutTimeline === "net14" ? 10 : 5;
  const closeTimeScore = (offer.closeTimeDays ?? 30) <= 7 ? 10 : (offer.closeTimeDays ?? 30) <= 14 ? 7 : (offer.closeTimeDays ?? 30) <= 30 ? 4 : 2;

  const total = Math.min(100, fundSecuredScore + verificationScore + payoutCompetitiveness + payoutSpeed + closeTimeScore);

  return { total, fundSecuredScore, verificationScore, payoutCompetitiveness, payoutSpeed, closeTimeScore };
}

// ===== CITY SLOTS (scarcity concept) =====
export interface CitySlot {
  city: string;
  country: "CA" | "US";
  category: string;
  maxSlots: 5;
  filledSlots: number;
  offers: string[];
}

export function getCitySlots(offers: Offer[]): CitySlot[] {
  const slotMap: Record<string, CitySlot> = {};
  offers.forEach(offer => {
    if (!offer.verified) return;
    const key = `${offer.city}-${offer.category}`;
    if (!slotMap[key]) {
      slotMap[key] = { city: offer.city, country: offer.country, category: offer.category, maxSlots: 5, filledSlots: 0, offers: [] };
    }
    slotMap[key].filledSlots++;
    slotMap[key].offers.push(offer.id);
  });
  return Object.values(slotMap).sort((a, b) => b.filledSlots - a.filledSlots);
}
