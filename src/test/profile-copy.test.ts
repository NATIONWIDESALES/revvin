import { describe, expect, it } from "vitest";
import { realTrade, referralSentence, tradePlace } from "@/lib/directory";
import { profileTitle } from "@/lib/profile";

describe("profile copy for trades", () => {
  it("never shows Other, empty or missing as a trade", () => {
    for (const c of ["Other", "other", "", null]) expect(realTrade(c)).toBeNull();
    expect(tradePlace({ category: "Other", city: "Austin", region: "US-TX" })).toBe("Austin, TX");
  });
  it("uses 'could use {Business}' for Other and unknown trades", () => {
    expect(referralSentence("Bachmann Floors", "Other", "$100")).toBe("Know someone who could use Bachmann Floors? Refer them and Bachmann Floors pays you $100 when the job closes.");
    expect(referralSentence("Acme", "Glass", "$50")).toBe("Know someone who could use Acme? Refer them and Acme pays you $50 when the job closes.");
  });
  it("uses the trade lookup for real trades", () => {
    expect(referralSentence("Haro Roofing", "Roofing", "$100")).toBe("Know someone who needs a roofer? Refer them and Haro Roofing pays you $100 when the job closes.");
    expect(referralSentence("Cool Co", "HVAC", "$75")).toContain("needs heating or cooling work?");
    expect(referralSentence("Sparks", "Electrical", "$75")).toContain("needs an electrician?");
    expect(referralSentence("Floorz", "Flooring", "$75")).toContain("needs new floors?");
  });
  it("titles an Other business by name and place only", () => {
    expect(profileTitle({ name: "Bachmann Floors", category: "Other", city: "Austin", state: "TX" })).toBe("Bachmann Floors in Austin, TX | Revvin");
    expect(profileTitle({ name: "Bachmann Floors", category: "Other", city: null, state: null })).toBe("Bachmann Floors | Revvin");
  });
});
