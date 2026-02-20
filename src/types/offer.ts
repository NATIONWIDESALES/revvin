export interface Offer {
  id: string;
  title: string;
  business: string;
  businessLogo: string;
  category: string;
  description: string;
  payout: number;
  payoutType: "flat" | "percentage";
  location: string;
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
}
