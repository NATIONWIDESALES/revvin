export type Country = "CA" | "US" | "AE";
/** Revvin prices and pays out in USD only, everywhere. */
export type Currency = "USD";

export interface Offer {
  id: string;
  title: string;
  business: string;
  businessLogo: string;
  category: string;
  description: string;
  payout: number;
  payoutType: "flat";
  currency: Currency;
  country: Country;
  location: string;
  state: string;
  city: string;
  rating?: number;
  totalReferrals?: number;
  successRate?: number;
  featured: boolean;
  dealSizeMin?: number;
  dealSizeMax?: number;
  closeTimeDays?: number;
  remoteEligible?: boolean;
  latitude?: number;
  longitude?: number;
  /** The business's own service radius in km (how far it will travel). */
  serviceRadiusKm?: number;
  qualificationRules?: string[];
  payoutTimeline?: "net7" | "net14" | "net30";
  monthlyCapacity?: number;
  verified?: boolean;
  serviceRadius?: string;
  createdAt?: string;
}

export type DisputeStatus = "submitted" | "under_review" | "resolved_paid" | "resolved_not_paid";

export interface Dispute {
  id: string;
  referralId: string;
  referrerId: string;
  businessId: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}
