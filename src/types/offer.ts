export type Country = "CA" | "US";
export type Currency = "CAD" | "USD";

export interface Offer {
  id: string;
  title: string;
  business: string;
  businessLogo: string;
  category: string;
  description: string;
  payout: number;
  payoutType: "flat" | "percentage";
  currency: Currency;
  country: Country;
  location: string;
  state: string;
  city: string;
  rating: number;
  totalReferrals: number;
  successRate: number;
  featured: boolean;
  dealSizeMin?: number;
  dealSizeMax?: number;
  closeTimeDays?: number;
  remoteEligible?: boolean;
  latitude?: number;
  longitude?: number;
  qualificationRules?: string[];
  payoutTimeline?: "net7" | "net14" | "net30";
  monthlyCapacity?: number;
  verified?: boolean;
  serviceRadius?: string;
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
