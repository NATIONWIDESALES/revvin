import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PROFILE_LIMITS, photoLimit, profileAllows, FREE_FEATURES, PRO_FEATURES } from "@/config/planFeatures";
import { cardMedia, profileCompleteness, profileTitle, REVIEW_LABEL, REVIEW_LABEL_TIP } from "@/lib/profile";
import { entryHref } from "@/lib/directory";
import { reviewMonthlyAllowance, reviewSubject, reviewBody, validateQuote, REVIEW_REQUEST_COOLDOWN_DAYS } from "../../supabase/functions/_shared/reviews";
import { referralLine } from "@/pages/BusinessProfilePage";
import { reviewPublicLine } from "@/pages/ReviewPage";

describe("profile plan rules", () => {
  it("photo limits: Free 3, Pro 30", () => {
    expect(photoLimit(false)).toBe(3);
    expect(photoLimit(true)).toBe(30);
  });
  it("Free shows 3 reviews and sends 50 requests a month; Pro has no plan cap", () => {
    expect(PROFILE_LIMITS.free.reviewsShown).toBe(3);
    expect(reviewMonthlyAllowance(false, 48)).toBe(2);
    expect(reviewMonthlyAllowance(false, 60)).toBe(0);
    expect(reviewMonthlyAllowance(true, 1000)).toBeNull();
    expect(REVIEW_REQUEST_COOLDOWN_DAYS).toBe(90);
  });
  it("Pro-only profile features", () => {
    for (const f of ["cover_photo", "quote_requests", "services", "all_reviews", "no_competitors"] as const) {
      expect(profileAllows(false, f)).toBe(false);
      expect(profileAllows(true, f)).toBe(true);
    }
  });
  it("plan lists describe the profile truthfully", () => {
    expect(FREE_FEATURES.map((f) => f.label)).toContain("Marketplace profile with logo, 3 photos and 3 reviews shown");
    expect(PRO_FEATURES.map((f) => f.label)).toContain("Full marketplace profile: cover photo, photo gallery, all reviews with stars, quote requests, featured placement, no competitors on your page");
  });
});

describe("profile display", () => {
  it("cards open /b/ for every business", () => {
    expect(entryHref({ kind: "business", slug: "acme" })).toBe("/b/acme");
    expect(entryHref({ kind: "listing", slug: "x" })).toBe("/b/x");
  });
  it("card media order: Pro cover, photo, logo, icon", () => {
    const x = { cover_url: "c", photo_url: "p", rating_avg: null, review_count: 0 };
    expect(cardMedia({ is_pro: true, logo_url: "l" }, x)).toEqual({ kind: "photo", url: "c" });
    expect(cardMedia({ is_pro: false, logo_url: "l" }, x)).toEqual({ kind: "photo", url: "p" });
    expect(cardMedia({ is_pro: false, logo_url: "l" }, { ...x, photo_url: null })).toEqual({ kind: "logo", url: "l" });
    expect(cardMedia({ is_pro: false, logo_url: null })).toBeNull();
  });
  it("title format", () => {
    expect(profileTitle({ name: "Acme", category: "Plumbing", city: "Phoenix", state: "AZ" })).toBe("Acme, Plumbing in Phoenix, AZ | Revvin");
  });
  it("referral box hides rewards for regulated trades", () => {
    expect(referralLine({ name: "Acme", category: "Plumbing", has_reward: true, reward_text: "100" })).toBe("Know someone who needs a plumber? Refer them and Acme pays you $100 when the job closes.");
    expect(referralLine({ name: "Acme", category: "Mortgage", has_reward: true, reward_text: "100" })).toBeNull();
  });
  it("review labels and copy", () => {
    expect(REVIEW_LABEL).toBe("Invited customer");
    expect(REVIEW_LABEL_TIP).toBe("The business invited this customer to review them through Revvin.");
    expect(reviewSubject("Acme")).toBe("How did Acme do?");
    expect(reviewBody("Acme", "Sam")).toHaveLength(2);
    expect(reviewPublicLine("Acme")).toBe("Your review will be public on Acme's Revvin profile. Your email is never shown.");
  });
  it("completeness suggests the next step", () => {
    expect(profileCompleteness({ photos: 0, reviews: 0 }).next).toBe("Add your logo");
    expect(profileCompleteness({ logo_url: "l", description: "x".repeat(50), phone: "1", hours: { mon: "9-5" }, photos: 1, reviews: 1 }).percent).toBe(100);
  });
  it("no 'Verified review' wording and no em dashes in new files", () => {
    for (const f of ["src/pages/BusinessProfilePage.tsx", "src/pages/ReviewPage.tsx", "src/components/profile/ProfileParts.tsx", "src/components/dashboard/MarketplaceProfileTab.tsx", "src/pages/DirectoryListingPage.tsx", "supabase/functions/_shared/reviews.ts"]) {
      const s = readFileSync(f, "utf8");
      expect(s).not.toMatch(/Verified review/i);
      expect(s).not.toContain("\u2014");
    }
  });
});

describe("quote validation", () => {
  it("honeypot, email and length", () => {
    expect(validateQuote({ slug: "acme", name: "A", email: "a@b.co", website: "x" })).toEqual({ ok: false, error: "spam" });
    expect(validateQuote({ slug: "acme", name: "A", email: "nope" })).toEqual({ ok: false, error: "invalid_email" });
    expect(validateQuote({ slug: "acme", name: "A", email: "a@b.co", message: "x".repeat(1501) })).toEqual({ ok: false, error: "message_too_long" });
    expect(validateQuote({ slug: "acme", name: "A", email: "A@B.co" })).toMatchObject({ ok: true, value: { email: "a@b.co" } });
  });
});
