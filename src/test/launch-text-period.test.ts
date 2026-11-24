import { describe, expect, it } from "vitest";
import { LAUNCH_DEFAULT_BODY, renderLaunchText } from "../../supabase/functions/_shared/referral-launch";

describe("launch text with a name ending in a period", () => {
  const out = renderLaunchText(LAUNCH_DEFAULT_BODY, { first_name: "Dana", business_name: "Northside Drain Co.", reward: "$100" });
  it("never shows a double period", () => expect(out).not.toContain(".."));
  it("keeps the name intact in the sign-off", () => expect(out.endsWith("Northside Drain Co.")).toBe(true));
  it("keeps one period after the name mid-sentence", () => expect(out).toContain("choosing Northside Drain Co. Most"));
});
