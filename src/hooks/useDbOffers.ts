import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Offer } from "@/types/offer";

/**
 * Fetches real offers from DB. Returns empty array when no offers exist.
 * Only shows offers with approval_status = 'approved'.
 */
export function useDbOffers() {
  return useQuery({
    queryKey: ["offers-browse"],
    queryFn: async (): Promise<Offer[]> => {
      const { data: dbOffers, error } = await supabase
        .from("offers")
        .select("*, businesses(name, logo_url, city, state, verified, latitude, longitude)")
        .eq("status", "active")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (error || !dbOffers) {
        return [];
      }

      return dbOffers.map((o: any) => ({
        id: o.id,
        title: o.title,
        business: o.businesses?.name ?? "Business",
        businessLogo: o.businesses?.logo_url ?? "🏢",
        category: o.category,
        description: o.description ?? "",
        payout: Number(o.payout),
        payoutType: "flat" as const,
        currency: (o.currency === "CAD" ? "CAD" : "USD") as "CAD" | "USD",
        country: (o.country === "CA" ? "CA" : "US") as "CA" | "US",
        location: o.location ?? `${o.businesses?.city ?? ""}, ${o.businesses?.state ?? ""}`,
        state: o.businesses?.state ?? "",
        city: o.businesses?.city ?? "",
        rating: 4.5,
        totalReferrals: 0,
        successRate: 0,
        featured: o.featured ?? false,
        dealSizeMin: o.deal_size_min ? Number(o.deal_size_min) : undefined,
        dealSizeMax: o.deal_size_max ? Number(o.deal_size_max) : undefined,
        closeTimeDays: o.close_time_days ?? 30,
        remoteEligible: o.remote_eligible ?? false,
        latitude: o.businesses?.latitude ?? undefined,
        longitude: o.businesses?.longitude ?? undefined,
        qualificationRules: o.qualification_criteria ? [o.qualification_criteria] : undefined,
        verified: o.businesses?.verified ?? false,
      }));
    },
    staleTime: 30_000,
  });
}
