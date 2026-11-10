import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { FREE_CONTACT_LIMIT, FREE_LIMIT_COPY, FREE_FEATURES, PRO_FEATURES, PLAN_SPLIT, isFreeContactLimitError } from "@/config/planFeatures";
import { showVerifiedBadge } from "@/lib/verifiedBadge";

const historicalMigration = readdirSync("drizzle/migrations")
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(`drizzle/migrations/${f}`, "utf8"))
  .find((s) => s.includes("fn_enforce_free_contact_limit")) ?? "";
const migration = readFileSync("drizzle/migrations/0026_pricing_25_contacts_pro_job_asks.sql", "utf8");

describe("Free plan customer cap", () => {
  it("is 25 in the app and in the database trigger", () => {
    expect(FREE_CONTACT_LIMIT).toBe(25);
    expect(historicalMigration).toMatch(/BEFORE INSERT ON public\.referral_contacts/);
    expect(migration).toMatch(/v_count\s*>=\s*25/);
    expect(migration).toMatch(/RAISE EXCEPTION 'free_contact_limit'/);
  });
  it("skips Pro and demo businesses", () => {
    expect(migration).toMatch(/coalesce\(v_plan,\s*'free'\)='pro' OR v_demo/);
  });
  it("maps the server refusal to the owner message", () => {
    expect(isFreeContactLimitError({ message: "free_contact_limit" })).toBe(true);
    expect(isFreeContactLimitError({ message: "duplicate key" })).toBe(false);
    expect(FREE_LIMIT_COPY.error).toBe("Free includes 25 customers. Upgrade to Pro for your whole list.");
  });
  it("describes the plans consistently", () => {
    expect(FREE_FEATURES.map((f) => f.label)).toContain("Import and ask up to 25 customers");
    expect(PRO_FEATURES[0].label).toBe("Unlimited customers, imported and asked");
    expect(PLAN_SPLIT.line).toBe("Free covers your first 25 customers. Pro covers your whole list.");
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
    expect(historicalMigration).toMatch(/NEW\.is_verified := false/);
    expect(historicalMigration).toMatch(/OLD\.user_id = auth\.uid\(\)/);
  });
});
