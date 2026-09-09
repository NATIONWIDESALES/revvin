/**
 * Referral Reward Calculator — pure arithmetic.
 *
 * Everything here is the visitor's own arithmetic done for them: revenue times
 * margin, minus the reward they proposed. It is not accounting advice, it does
 * not recommend a reward, and it never treats revenue as profit.
 *
 * Inputs arrive from number fields, so they are clamped rather than trusted.
 * No display strings are parsed, and there is no currency conversion: Revvin
 * prices in USD everywhere, and the figures below are USD in and USD out.
 */

import { MONTHLY_PRICE, ANNUAL_PRICE } from "@/config/pricing";

export const MAX_REVENUE = 10_000_000;
export const MAX_REWARD = 1_000_000;
export const MAX_JOBS_PER_MONTH = 500;
export const DEFAULT_JOBS_PER_MONTH = 1;

export interface RewardInputs {
  /** Average collected revenue for one job, USD. */
  revenue: number;
  /** Gross margin on that revenue, as a percentage from 0 to 100. */
  marginPct: number;
  /** The fixed reward the owner is considering, USD. */
  reward: number;
  /** Closed referred jobs the owner expects in a month. */
  jobsPerMonth: number;
}

export interface RewardResult {
  revenue: number;
  marginPct: number;
  reward: number;
  jobsPerMonth: number;
  /** revenue x margin, for one closed referred job. */
  grossProfit: number;
  /** grossProfit - reward, for one closed referred job. */
  profitAfterReward: number;
  /** reward x jobs per month. */
  totalRewards: number;
  /** profitAfterReward x jobs per month. */
  netContribution: number;
  /**
   * Closed referred jobs needed for the post-reward contribution to cover the
   * monthly Revvin Pro price. Null when the contribution is zero or negative,
   * because no number of such jobs would ever cover it.
   */
  jobsToCoverMonthlyPro: number | null;
  /** The same count measured against the annual Revvin Pro price, billed once. */
  jobsToCoverAnnualPro: number | null;
  /** True when the reward leaves nothing of the gross profit on a closed job. */
  rewardExceedsProfit: boolean;
}

const clamp = (value: number, min: number, max: number) => {
  // NaN, Infinity and empty fields all collapse to the low bound rather than
  // poisoning every figure downstream.
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
};

/** Two decimals, so money never displays as 41.999999999999996. */
const money = (value: number) => Math.round(value * 100) / 100;

export function sanitizeRewardInputs(input: Partial<RewardInputs>): RewardInputs {
  return {
    revenue: clamp(Number(input.revenue ?? 0), 0, MAX_REVENUE),
    marginPct: clamp(Number(input.marginPct ?? 0), 0, 100),
    reward: clamp(Number(input.reward ?? 0), 0, MAX_REWARD),
    jobsPerMonth: Math.floor(
      clamp(Number(input.jobsPerMonth ?? DEFAULT_JOBS_PER_MONTH), 0, MAX_JOBS_PER_MONTH),
    ),
  };
}

export function calculateReward(input: Partial<RewardInputs>): RewardResult {
  const { revenue, marginPct, reward, jobsPerMonth } = sanitizeRewardInputs(input);

  const grossProfit = money(revenue * (marginPct / 100));
  const profitAfterReward = money(grossProfit - reward);
  const totalRewards = money(reward * jobsPerMonth);
  const netContribution = money(profitAfterReward * jobsPerMonth);

  const jobsToCover = (price: number) =>
    profitAfterReward > 0 ? Math.ceil(price / profitAfterReward) : null;

  return {
    revenue,
    marginPct,
    reward,
    jobsPerMonth,
    grossProfit,
    profitAfterReward,
    totalRewards,
    netContribution,
    jobsToCoverMonthlyPro: jobsToCover(MONTHLY_PRICE),
    jobsToCoverAnnualPro: jobsToCover(ANNUAL_PRICE),
    rewardExceedsProfit: reward > 0 && reward >= grossProfit,
  };
}

export const formatUsd = (value: number) =>
  `$${money(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/**
 * Plain-text summary for the copy button. Built from the same numbers the page
 * shows, and copied locally: nothing here is sent anywhere.
 */
export function rewardSummaryText(result: RewardResult): string {
  const lines = [
    "Referral reward check (Revvin reward calculator)",
    `Average collected job revenue: ${formatUsd(result.revenue)}`,
    `Gross margin: ${result.marginPct}%`,
    `Gross profit before reward, per closed referred job: ${formatUsd(result.grossProfit)}`,
    `Proposed fixed reward: ${formatUsd(result.reward)}`,
    `Gross profit after the reward, per closed referred job: ${formatUsd(result.profitAfterReward)}`,
    `Closed referred jobs per month: ${result.jobsPerMonth}`,
    `Rewards at that volume: ${formatUsd(result.totalRewards)}`,
    `Contribution after rewards at that volume: ${formatUsd(result.netContribution)}`,
    result.jobsToCoverMonthlyPro === null
      ? "Closed referred jobs needed to cover Revvin Pro: not reachable at this reward, because the reward leaves nothing of the gross profit."
      : `Closed referred jobs needed to cover Revvin Pro at $${MONTHLY_PRICE}/month: ${result.jobsToCoverMonthlyPro}`,
    "Your own figures, your own arithmetic. Not a forecast and not accounting advice.",
  ];
  return lines.join("\n");
}
