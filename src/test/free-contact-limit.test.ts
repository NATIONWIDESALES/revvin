import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { FREE_CONTACT_LIMIT, FREE_LIMIT_COPY, FREE_FEATURES, PRO_FEATURES, PLAN_SPLIT, isFreeContactLimitError } from "@/config/planFeatures";
import { showVerifiedBadge } from "@/lib/verifiedBadge";

const migration = readdirSync("drizzle/migrations")
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(`drizzle/migrations/${f}`, "utf8"))
  .find((s) => s.includes("fn_enforce_free_contact_limit"))!;

describe("Free plan customer cap", () => {
  it("is 100 in the app and in the database trigger", () => {
    expect(FREE_CONTACT_LIMIT).toBe(100);
    expect(migration).toMatch(/BEFORE INSERT ON public\.referral_contacts/);
    expect(migration).toMatch(/v_count >= 100/);
    expect(migration).toMatch(/RAISE EXCEPTION 'free_contact_limit'/);
  });
  it("skips Pro and demo businesses", () => {
    expect(migration).toMatch(/coalesce\(v_plan, 'free'\) = 'pro' OR v_demo/);
  });
  it("maps the server refusal to the owner message", () => {
    expect(isFreeContactLimitError({ message: "free_contact_limit" })).toBe(true);
    expect(isFreeContactLimitError({ message: "duplicate key" })).toBe(false);
    expect(FREE_LIMIT_COPY.error).toBe("Free includes 100 customers. Upgrade to Pro for your whole list.");
  });
  it("describes the plans consistently", () => {
    expect(FREE_FEATURES.map((f) => f.label)).toContain("Import and ask up to 100 customers");
    expect(PRO_FEATURES[0].label).toBe("Unlimited customers, imported and asked");
    expect(PLAN_SPLIT.line).toBe("Free asks your first 100 customers. Pro asks all of them, automatically.");
  });
});

describe("Verified badge", () => {
  it("is hidden unless is_verified is true", () => {
    expect(showVerifiedBadge({ is_verified: false })).toBe(false);
    expect(showVerifiedBadge({ is_verified: null })).toBe(false);
    expect(showVerifiedBadge({})).toBe(false);
    expect(showVerifiedBadge({ verified: true } as never)).toBe(false);
    expect(showVerifiedBadge({ is_verified: true })).toBe(true);
  });
  it("cannot be set by the owner, even an admin owner", () => {
    expect(migration).toMatch(/NEW\.is_verified := false/);
    expect(migration).toMatch(/OLD\.user_id = auth\.uid\(\)/);
  });
});
