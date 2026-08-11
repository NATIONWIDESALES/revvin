import type { Country, Offer } from "@/types/offer";

export const categories = [
  "All", "Roofing", "Plumbing", "HVAC", "Landscaping", "Paving", "Home Inspection",
  "Insurance", "Mortgage", "Real Estate", "Energy", "Legal", "Finance",
  "SaaS", "Services", "Technology",
];

/**
 * Business categories offered in onboarding. This describes the business
 * itself, not a marketplace offer, so it is intentionally a shorter
 * trade-oriented list than `categories` above (which drives offer and
 * marketplace filtering). Single source of truth for the onboarding picker.
 */
export const BUSINESS_CATEGORIES = [
  "Roofing", "HVAC", "Plumbing", "Electrical", "Landscaping", "Painting",
  "Auto", "Solar", "Real Estate", "Home Services", "Other",
];

// Note: cityJumpsCA / cityJumpsUS are retained for backward compatibility
// but MapView now derives city chips dynamically from the filtered offers.

// Categories whose PUBLIC MARKETPLACE listings are reviewed before they appear.
// This is a listing review, not a restriction on using Revvin: a business in
// one of these categories can still build and use its own branded referral
// page privately.
//
// Keep this list and the normalisation below in sync with the database
// function fn_offer_is_restricted_category, which is the actual enforcement
// point. This copy exists only so the UI can show the review notice early.
export const RESTRICTED_CATEGORIES = ["Finance", "Insurance", "Legal", "Mortgage", "Real Estate"];

const normalizeCategory = (category: string | null | undefined) =>
  (category ?? "").toLowerCase().replace(/[^a-z]/g, "");

const RESTRICTED_NORMALIZED = new Set(RESTRICTED_CATEGORIES.map(normalizeCategory));

/**
 * True when offers in this category need review before appearing on the public
 * marketplace. Matches case-insensitively and ignores spacing and punctuation,
 * so "Real Estate", "real-estate" and "realestate" all match.
 */
export const isRestrictedCategory = (category: string | null | undefined) =>
  RESTRICTED_NORMALIZED.has(normalizeCategory(category));

export const canadaProvinces = ["BC", "AB", "ON", "QC", "MB", "SK"];
export const usStates = ["CA", "TX", "WA", "AZ", "NY", "FL", "IL", "CO", "GA", "MA"];
/** UAE emirates, used in place of states for AE listings. */
export const uaeEmirates = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"];

/** Countries Revvin operates in. Currency is always USD, everywhere. */
export const SUPPORTED_COUNTRIES: { value: Country; label: string; flag: string }[] = [
  { value: "US", label: "USA", flag: "🇺🇸" },
  { value: "CA", label: "Canada", flag: "🇨🇦" },
  { value: "AE", label: "UAE", flag: "🇦🇪" },
];

/** Maps a raw DB country value onto a supported country, defaulting to US. */
export const normalizeCountry = (raw: string | null | undefined): Country => {
  const v = (raw ?? "").trim().toUpperCase();
  if (v === "CA" || v === "CANADA") return "CA";
  if (v === "AE" || v === "UAE" || v === "UNITED ARAB EMIRATES") return "AE";
  return "US";
};

export const countryFlag = (country: Country | null | undefined) =>
  country === "CA" ? "🇨🇦" : country === "AE" ? "🇦🇪" : "🇺🇸";

export const countryLabel = (country: Country | null | undefined) =>
  country === "CA" ? "Canada" : country === "AE" ? "United Arab Emirates" : "United States";

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

export const cityJumpsAE = [
  { label: "Dubai", lat: 25.2048, lng: 55.2708 },
  { label: "Deira", lat: 25.2697, lng: 55.3095 },
  { label: "Jumeirah", lat: 25.2048, lng: 55.2404 },
  { label: "Business Bay", lat: 25.1857, lng: 55.2766 },
  { label: "Abu Dhabi", lat: 24.4539, lng: 54.3773 },
  { label: "Sharjah", lat: 25.3463, lng: 55.4209 },
];

// ===== OFFER SCORING =====
export interface OfferScore {
  total: number;
  verificationScore: number;
  payoutCompetitiveness: number;
  payoutSpeed: number;
  closeTimeScore: number;
}

export function calculateOfferScore(offer: Offer, allOffers?: Offer[]): OfferScore {
  const peers = (allOffers ?? [offer]).filter(o => o.city === offer.city || o.category === offer.category);
  const avgPayout = peers.length > 0 ? peers.reduce((s, o) => s + o.payout, 0) / peers.length : offer.payout;

  const verificationScore = offer.verified ? 30 : 0;
  const payoutCompetitiveness = Math.min(30, Math.round((offer.payout / Math.max(1, avgPayout)) * 20));
  const payoutSpeed = offer.payoutTimeline === "net7" ? 25 : offer.payoutTimeline === "net14" ? 17 : 8;
  const closeTimeScore = (offer.closeTimeDays ?? 30) <= 7 ? 15 : (offer.closeTimeDays ?? 30) <= 14 ? 10 : (offer.closeTimeDays ?? 30) <= 30 ? 6 : 3;

  const total = Math.min(100, verificationScore + payoutCompetitiveness + payoutSpeed + closeTimeScore);

  return { total, verificationScore, payoutCompetitiveness, payoutSpeed, closeTimeScore };
}

// ===== CITY SLOTS (scarcity concept) =====
export interface CitySlot {
  city: string;
  country: Country;
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
