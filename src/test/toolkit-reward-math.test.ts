import { describe, expect, it } from "vitest";
import { MONTHLY_PRICE, ANNUAL_PRICE } from "@/config/pricing";
import {
  MAX_REVENUE,
  MAX_JOBS_PER_MONTH,
  calculateReward,
  formatUsd,
  rewardSummaryText,
  sanitizeRewardInputs,
  type RewardInputs,
} from "@/lib/toolkit/rewardMath";

const result = (over: Partial<RewardInputs> = {}) =>
  calculateReward({ revenue: 4000, marginPct: 40, reward: 200, jobsPerMonth: 2, ...over });

describe("referral reward calculator", () => {
  it("works out gross profit before and after the reward", () => {
    const r = result();
    expect(r.grossProfit).toBe(1600);
    expect(r.profitAfterReward).toBe(1400);
  });

  it("multiplies rewards and contribution by the monthly volume", () => {
    const r = result();
    expect(r.totalRewards).toBe(400);
    expect(r.netContribution).toBe(2800);
  });

  it("uses the shared Pro prices for break-even and needs whole jobs", () => {
    const r = result({ reward: 1500 });
    expect(r.profitAfterReward).toBe(100);
    expect(r.jobsToCoverMonthlyPro).toBe(Math.ceil(MONTHLY_PRICE / 100));
    expect(r.jobsToCoverAnnualPro).toBe(Math.ceil(ANNUAL_PRICE / 100));
  });

  it("reports no break-even when the reward leaves nothing", () => {
    const r = result({ reward: 1600 });
    expect(r.profitAfterReward).toBe(0);
    expect(r.jobsToCoverMonthlyPro).toBeNull();
    expect(r.jobsToCoverAnnualPro).toBeNull();
    expect(r.rewardExceedsProfit).toBe(true);
  });

  it("flags a reward larger than the gross profit", () => {
    const r = result({ reward: 5000 });
    expect(r.rewardExceedsProfit).toBe(true);
    expect(r.profitAfterReward).toBeLessThan(0);
    expect(r.netContribution).toBeLessThan(0);
  });

  it("does not flag a reward comfortably below gross profit", () => {
    expect(result().rewardExceedsProfit).toBe(false);
  });

  it("treats zero and empty figures as zero rather than failing", () => {
    const r = result({ revenue: 0, marginPct: 0, reward: 0 });
    expect(r.grossProfit).toBe(0);
    expect(r.totalRewards).toBe(0);
    expect(r.rewardExceedsProfit).toBe(false);
    expect(Number.isFinite(r.profitAfterReward)).toBe(true);
  });

  it("clamps negative inputs to zero", () => {
    const s = sanitizeRewardInputs({ revenue: -500, marginPct: -20, reward: -50, jobsPerMonth: -3 });
    expect(s).toEqual({ revenue: 0, marginPct: 0, reward: 0, jobsPerMonth: 0 });
  });

  it("keeps decimals to cents and bounds very large figures", () => {
    const r = result({ revenue: 1250.5, marginPct: 33.5 });
    expect(r.grossProfit).toBe(418.92);
    const huge = sanitizeRewardInputs({
      revenue: 1e15,
      marginPct: 900,
      reward: 1e15,
      jobsPerMonth: 1e9,
    });
    expect(huge.revenue).toBe(MAX_REVENUE);
    expect(huge.marginPct).toBe(100);
    expect(huge.jobsPerMonth).toBe(MAX_JOBS_PER_MONTH);
  });

  it("collapses non-numeric values instead of producing NaN", () => {
    const s = sanitizeRewardInputs({
      revenue: Number.NaN,
      marginPct: Number.POSITIVE_INFINITY,
      reward: Number.NaN,
      jobsPerMonth: Number.NaN,
    });
    for (const value of Object.values(s)) expect(Number.isFinite(value)).toBe(true);
    expect(s.marginPct).toBe(0);
  });

  it("defaults to one job a month when the volume is not supplied", () => {
    expect(sanitizeRewardInputs({ revenue: 100, marginPct: 50, reward: 10 }).jobsPerMonth).toBe(1);
  });

  it("formats money as plain USD", () => {
    expect(formatUsd(1600)).toBe("$1,600");
    expect(formatUsd(0)).toBe("$0");
  });

  it("summarises with a disclaimer and no promise of results", () => {
    const text = rewardSummaryText(result());
    expect(text).toContain(formatUsd(1600));
    expect(text).toContain("Not a forecast and not accounting advice");
    expect(text.toLowerCase()).not.toContain("guarantee");
  });
});
