// Signup qualification only, never an authorization rule.
export const SIGNUP_TRADES = [
  "Roofing", "HVAC", "Plumbing", "Electrical", "Landscaping and lawn care",
  "Painting", "Remodeling or general contracting", "Concrete and paving",
  "Fencing and decks", "Pest control", "Cleaning", "Solar", "Garage doors",
  "Pool and spa", "Other home service", "Not a home-service business",
] as const;

export type SignupTrade = (typeof SIGNUP_TRADES)[number];
export function isSignupTrade(value: unknown): value is SignupTrade {
  return typeof value === "string" && SIGNUP_TRADES.some(trade => trade === value);
}
export function isHomeServiceTrade(value: unknown): value is SignupTrade {
  return isSignupTrade(value) && value !== "Not a home-service business";
}