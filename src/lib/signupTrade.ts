import { previewCategory } from "./instantPreview";
import { isSignupTrade, type SignupTrade } from "../../supabase/functions/_shared/signup-trade";
export { SIGNUP_TRADES, isSignupTrade, isHomeServiceTrade } from "../../supabase/functions/_shared/signup-trade";

// Keep the existing preview category vocabulary for corresponding trades.
const previewTrades: Partial<Record<SignupTrade, string>> = {
  Roofing: "roofing", HVAC: "hvac", Plumbing: "plumbing", Electrical: "electrical",
  "Landscaping and lawn care": "landscaping", Painting: "painting",
  "Remodeling or general contracting": "remodeling", "Fencing and decks": "fencing",
  "Pest control": "pest-control", Cleaning: "house-cleaning", Solar: "solar",
  "Garage doors": "garage-door", "Pool and spa": "pool-service",
};
export function signupCategory(trade: SignupTrade): string {
  const previewTrade = previewTrades[trade];
  if (previewTrade) return previewCategory(previewTrade);
  if (trade === "Other home service") return "Home Services";
  if (trade === "Not a home-service business") return "Other";
  return trade;
}
export function signupTradeFromPreview(trade: string): SignupTrade | "" {
  const category = previewCategory(trade);
  const match = Object.entries(previewTrades).find(([, slug]) => slug && previewCategory(slug) === category)?.[0];
  if (isSignupTrade(match)) return match;
  if (trade === "auto-detailing") return "Not a home-service business";
  if (["flooring", "window-replacement", "tree-service", "pressure-washing", "carpet-cleaning", "handyman"].includes(trade)) {
    return trade === "carpet-cleaning" || trade === "pressure-washing" ? "Cleaning" : "Other home service";
  }
  // A generic preview does not establish home-service eligibility.
  return "";
}