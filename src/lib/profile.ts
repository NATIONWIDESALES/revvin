import { realTrade } from "@/lib/directory";
import { loadSupabase } from "@/lib/supabaseLazy";
import type { DirectoryEntry } from "@/lib/directory";

export const PHOTO_BUCKET = "business-photos";

export interface ProfileReviewStats { count: number; avg: number | null; r1: number; r2: number; r3: number; r4: number; r5: number }
export interface SocialLinks { facebook?: string; instagram?: string; linkedin?: string; youtube?: string; tiktok?: string }
export type Hours = Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", string>>;
export interface BusinessProfile {
  slug: string; name: string; category: string; description: string | null; logo_url: string | null; cover_image_url: string | null;
  service_area: string | null; website: string | null; phone: string | null; city: string | null; state: string | null; country: string | null;
  lat: number | null; lng: number | null; google_review_url: string | null; hours: Hours | null;
  services: string[] | null; founded_year: number | null; license_number: string | null; social_links: SocialLinks | null;
  is_pro: boolean; is_verified: boolean; index_approved: boolean; has_reward: boolean; reward_text: string | null;
  photos: { id: string; path: string; caption: string | null }[]; reviews: ProfileReviewStats; is_owner_preview: boolean;
}
export interface PublicReview { id: string; rating: number; body: string; reviewer_display_name: string; owner_reply: string | null; owner_replied_at: string | null; submitted_at: string }

const rpc = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => {
  const db = await loadSupabase();
  const { data, error } = await db.rpc(fn as never, args as never);
  if (error) throw new Error(error.message);
  return data as T;
};

export const loadProfile = (slug: string) => rpc<BusinessProfile | null>("fn_business_profile", { p_slug: slug });
export const loadReviews = (slug: string, offset = 0, limit = 10) => rpc<PublicReview[]>("fn_business_reviews", { p_slug: slug, p_offset: offset, p_limit: limit });
export const loadNearby = (lat: number, lng: number, category: string, exclude: string) =>
  rpc<DirectoryEntry[]>("fn_directory_nearby", { p_lat: lat, p_lng: lng, p_category: category, p_exclude: exclude });

/** The photo bucket is private; visitors get short-lived signed links for photos of live profiles. */
export async function photoUrls(paths: string[]): Promise<Record<string, string>> {
  const clean = [...new Set(paths.filter(Boolean))];
  if (clean.length === 0) return {};
  const db = await loadSupabase();
  const { data } = await db.storage.from(PHOTO_BUCKET).createSignedUrls(clean, 3600);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

export interface CardExtra { cover_url: string | null; photo_url: string | null; rating_avg: number | null; review_count: number }
/** One call for a whole page of cards. */
export async function loadCardExtras(slugs: string[]): Promise<Record<string, CardExtra>> {
  if (slugs.length === 0) return {};
  const rows = await rpc<{ slug: string; cover_url: string | null; photo_path: string | null; rating_avg: number | null; review_count: number }[]>(
    "fn_directory_card_extras", { p_slugs: slugs.slice(0, 100) });
  const urls = await photoUrls((rows ?? []).map((r) => r.photo_path ?? "")).catch(() => ({} as Record<string, string>));
  const out: Record<string, CardExtra> = {};
  for (const r of rows ?? []) out[r.slug] = {
    cover_url: r.cover_url, photo_url: r.photo_path ? urls[r.photo_path] ?? null : null,
    rating_avg: r.rating_avg === null ? null : Number(r.rating_avg), review_count: Number(r.review_count ?? 0),
  };
  return out;
}

/** Card media in order: Pro cover, first business photo, logo, else null (trade icon). */
export function cardMedia(e: Pick<DirectoryEntry, "logo_url" | "is_pro">, x?: CardExtra): { kind: "photo" | "logo"; url: string } | null {
  if (e.is_pro && x?.cover_url) return { kind: "photo", url: x.cover_url };
  if (x?.photo_url) return { kind: "photo", url: x.photo_url };
  if (e.logo_url) return { kind: "logo", url: e.logo_url };
  return null;
}

export const stateCode = (s: string | null) => (s ?? "").replace(/^(US|CA)-/i, "").trim();
export const profileTitle = (p: { name: string; category: string; city: string | null; state: string | null }) => {
  const place = [p.city, stateCode(p.state)].filter(Boolean).join(", ");
  const trade = realTrade(p.category);
  return `${p.name}${trade ? `, ${trade}` : ""}${place ? ` in ${place}` : ""} | Revvin`;
};

/** Profile completeness for the owner editor: percent and the next suggested step. */
export function profileCompleteness(b: { description?: string | null; logo_url?: string | null; phone?: string | null; website?: string | null; hours?: unknown; photos: number; reviews: number; offer_amount?: string | null }) {
  const steps: [boolean, string][] = [
    [!!b.logo_url, "Add your logo"],
    [!!b.description && b.description.trim().length >= 40, "Write a short About section"],
    [!!b.phone || !!b.website, "Add your phone or website"],
    [!!b.hours && Object.values(b.hours as object).some(Boolean), "Add your hours"],
    [b.photos > 0, "Add a photo of your work"],
    [b.reviews > 0, "Ask your customers for a review"],
  ];
  const done = steps.filter(([ok]) => ok).length;
  return { percent: Math.round((done / steps.length) * 100), next: steps.find(([ok]) => !ok)?.[1] ?? null };
}

export const REVIEW_LABEL = "Invited customer";
export const REVIEW_LABEL_TIP = "The business invited this customer to review them through Revvin.";
