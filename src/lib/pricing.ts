const PLATFORM_FEE_RATES: Record<string, number> = {
  free: 0.25,
  starter: 0.1,
  paid: 0.1,
  pro: 0.01,
  enterprise: 0,
};

export function getPlatformFeeRate(pricingTier?: string | null) {
  return PLATFORM_FEE_RATES[(pricingTier ?? "free").toLowerCase()] ?? PLATFORM_FEE_RATES.free;
}

export function formatPlatformFeePercent(feeRate: number) {
  return `${Math.round(feeRate * 100)}%`;
}
