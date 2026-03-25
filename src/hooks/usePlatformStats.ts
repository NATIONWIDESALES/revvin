import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformStats {
  totalPayoutsAvailable: number;
  activeBusinesses: number;
  totalReferrers: number;
  avgPayout: number;
  totalReferrals: number;
  activeCities: number;
}

const FALLBACK: PlatformStats = {
  totalPayoutsAvailable: 0,
  activeBusinesses: 0,
  totalReferrers: 0,
  avgPayout: 0,
  totalReferrals: 0,
  activeCities: 0,
};

export function usePlatformStats() {
  return useQuery({
    queryKey: ["platform-stats"],
    queryFn: async (): Promise<PlatformStats> => {
      const [offersRes, bizRes, referralsRes, countsRes] = await Promise.all([
        supabase.from("offers").select("payout, business_id", { count: "exact" }).eq("status", "active"),
        supabase.from("businesses").select("id, city", { count: "exact" }),
        supabase.from("referrals").select("id", { count: "exact" }),
        supabase.rpc("fn_platform_counts"),
      ]);

      const offers = offersRes.data ?? [];
      const businesses = bizRes.data ?? [];
      const referralCount = referralsRes.count ?? 0;
      const counts = countsRes.data as { businesses: number; referrers: number } | null;

      if (offers.length === 0 && businesses.length === 0) {
        return FALLBACK;
      }

      const totalPayout = offers.reduce((s, o) => s + Number(o.payout), 0);
      const avgPayout = offers.length > 0 ? Math.round(totalPayout / offers.length) : FALLBACK.avgPayout;
      const uniqueCities = new Set(businesses.map((b) => b.city).filter(Boolean));

      return {
        totalPayoutsAvailable: totalPayout || FALLBACK.totalPayoutsAvailable,
        activeBusinesses: counts?.businesses ?? businesses.length || FALLBACK.activeBusinesses,
        totalReferrers: counts?.referrers ?? FALLBACK.totalReferrers,
        avgPayout,
        totalReferrals: referralCount || FALLBACK.totalReferrals,
        activeCities: uniqueCities.size || FALLBACK.activeCities,
      };
    },
    staleTime: 60_000,
  });
}
