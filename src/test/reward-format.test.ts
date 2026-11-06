import { describe, it, expect } from "vitest";
import { normalizeRewardAmount, isBareAmount } from "@/lib/offerUtils";
import { missingForPublish } from "@/components/dashboard/PublishPrompt";

describe("reward formatting", () => {
  it("adds $ to digits only", () => {
    expect(normalizeRewardAmount("500")).toBe("$500");
    expect(normalizeRewardAmount("1,000.50")).toBe("$1,000.50");
  });
  it("leaves signs, percents and words", () => {
    expect(normalizeRewardAmount("5%")).toBe("5%");
    expect(normalizeRewardAmount("$1,000")).toBe("$1,000");
    expect(normalizeRewardAmount("$100 gift card")).toBe("$100 gift card");
  });
  it("hides bare amounts used as payout timing", () => {
    expect(isBareAmount("500")).toBe(true);
    expect(isBareAmount("$500")).toBe(true);
    expect(isBareAmount("When the job is paid")).toBe(false);
  });
  it("lists missing publish fields", () => {
    expect(missingForPublish({ slug: "a", name: "", offer_amount: null })).toEqual(["name", "offer_amount"]);
    expect(missingForPublish({ slug: "a", name: "b", offer_amount: "$5" })).toEqual([]);
  });
});
