import { describe, it, expect } from "vitest";
import { firstAskMessage as sharedAsk, FIRST_LEAD_TIPS, FIRST_LEAD_TIPS_TITLE } from "../../supabase/functions/_shared/lifecycle-copy";
import { firstAskMessage as dashboardAsk } from "@/components/dashboard/WelcomeLiveCard";
import { LIFECYCLE_COHORT_START, SETUP_CALL_URL, LIFECYCLE_FROM, LIFECYCLE_REPLY_TO } from "../../supabase/functions/_shared/lifecycle-config";

const NAME = "Summit Roofing";
const URL = "https://revvin.co/r/summit-roofing";

describe("lifecycle email copy", () => {
  it("uses the exact dashboard ask wording, reward included", () => {
    expect(sharedAsk(NAME, URL, "$100")).toBe(dashboardAsk(NAME, URL, "$100"));
    expect(sharedAsk(NAME, URL, "$100")).toContain("I pay $100 if it turns into a job.");
  });

  it("drops the reward sentence when no reward is set", () => {
    expect(sharedAsk(NAME, URL, null)).toBe(dashboardAsk(NAME, URL, null));
    expect(sharedAsk(NAME, URL, "  ")).not.toContain("I pay");
  });

  it("has no em dashes in any lifecycle copy", () => {
    const copy = [
      sharedAsk(NAME, URL, "$100"),
      FIRST_LEAD_TIPS_TITLE,
      ...FIRST_LEAD_TIPS,
      LIFECYCLE_FROM,
      LIFECYCLE_REPLY_TO,
    ].join(" ");
    expect(copy).not.toMatch(/[—–]/);
  });

  it("coaches speed, the referrer's name and a same-day thank you", () => {
    const tips = FIRST_LEAD_TIPS.join(" ").toLowerCase();
    expect(tips).toContain("within the hour");
    expect(tips).toContain("first sentence");
    expect(tips).toContain("same day");
  });

  it("uses the configured booking link so the no_leads_d7 email can send", () => {
    expect(SETUP_CALL_URL).toBe("https://cal.com/revvin/30min");
  });

  it("never emails businesses created before the cohort start", () => {
    expect(new Date(LIFECYCLE_COHORT_START).toISOString()).toBe("2026-09-14T00:00:00.000Z");
  });

  it("sends from Karm at Revvin with the info@revvin.co address", () => {
    expect(LIFECYCLE_FROM).toBe("Karm at Revvin <info@revvin.co>");
    expect(LIFECYCLE_REPLY_TO).toBe("info@revvin.co");
  });
});
