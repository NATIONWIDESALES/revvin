import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MockReview = {
  name: string;
  rating: number;
  date: string;
  body: string;
};

export type MockService = { name: string; desc: string };

export type MockListing = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  category: string;
  city: string;
  region: string;
  country: string;
  lat: number | null;
  lng: number | null;
  hero_image: string;
  gallery: string[];
  services: MockService[];
  price_min: number | null;
  price_max: number | null;
  currency: string;
  about: string | null;
  rating: number;
  review_count: number;
  reviews: MockReview[];
  referral_fee: number;
  referral_fee_unit: string;
  verified: boolean;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: Record<string, string> | null;
  is_mock: boolean;
};

const normalize = (row: any): MockListing => ({
  ...row,
  gallery: Array.isArray(row.gallery) ? row.gallery : [],
  services: Array.isArray(row.services) ? row.services : [],
  reviews: Array.isArray(row.reviews) ? row.reviews : [],
  hours: row.hours ?? null,
});

export function useMockListings() {
  return useQuery({
    queryKey: ["mock_listings"],
    queryFn: async (): Promise<MockListing[]> => {
      const { data, error } = await supabase
        .from("mock_listings")
        .select("*")
        .order("rating", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(normalize);
    },
  });
}

export function useMockListing(slug: string | undefined) {
  return useQuery({
    queryKey: ["mock_listing", slug],
    enabled: !!slug,
    queryFn: async (): Promise<MockListing | null> => {
      const { data, error } = await supabase
        .from("mock_listings")
        .select("*")
        .eq("slug", slug!)
        .limit(1);
      if (error) throw error;
      const row = data?.[0];
      return row ? normalize(row) : null;
    },
  });
}

export function formatPriceRange(min: number | null, max: number | null, currency: string) {
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n.toLocaleString()}`;
  if (min == null || max == null) return null;
  return `${fmt(min)} – ${fmt(max)} ${currency}`;
}