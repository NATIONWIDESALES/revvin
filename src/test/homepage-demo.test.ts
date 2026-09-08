import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";

const home = readFileSync("src/pages/Index.tsx", "utf8");
const demo = readFileSync("src/components/demo/ReferralDemo.tsx", "utf8");

describe("homepage", () => {
  it("uses the approved hero copy", () => {
    expect(home).toContain("Referral software for service businesses.");
    expect(home).toContain("Turn past customers into your");
    expect(home).toContain("next booked job.");
    expect(home).toContain("Build my free referral page");
    expect(home).toContain("Try the demo");
  });

  it("stays concise", () => {
    expect(home.split("\n").length).toBeLessThan(500);
  });

  it("shows exactly five FAQs, and the schema is built from the same five", () => {
    const faqs = home.match(/^\s{2}\{\n\s{4}question:/gm) ?? [];
    expect(faqs).toHaveLength(5);
    expect(home).toContain("mainEntity: FAQS.map(");
  });

  it("does not repeat the retired homepage narrative", () => {
    for (const gone of [
      "Three revenue loops",
      "Percentage rewards",
      "Every reply lands",
      "wedge",
      "StatsMarquee",
      "Testimonials",
      "RoiCalculator",
    ]) {
      expect(home).not.toContain(gone);
    }
  });

  it("takes pricing from the shared config rather than hardcoding it", () => {
    expect(home).toContain('from "@/config/pricing"');
    expect(home).not.toMatch(/\$49/);
    expect(home).not.toMatch(/\$450/);
  });

  it("keeps the prerendered homepage aligned with the client headline", () => {
    const root = PRERENDER_ROUTES.find((r) => r.path === "/");
    expect(root?.h1).toBe("Turn past customers into your next booked job.");
    expect(root?.sections.length).toBeGreaterThan(0);
    for (const s of root!.sections) {
      expect(s.body).not.toMatch(/never sends email/i);
    }
  });
});

describe("referral demo", () => {
  it("arrives pre-filled so a visitor can just press send", () => {
    expect(demo).toContain("useState<string>(PREFILL.name)");
    expect(demo).toContain("useState<string>(PREFILL.lead)");
    expect(demo).toContain("useState<string>(PREFILL.need)");
  });

  it("never puts typed input into an analytics payload", () => {
    const calls = demo.match(/track\([^)]*\)/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      for (const field of ["name", "lead", "need", "jobValue"]) {
        expect(call).not.toContain(field);
      }
    }
    expect(demo).toContain('track("demo_started")');
    expect(demo).toContain('track("demo_completed")');
  });

  it("counts a run once and rearms on reset", () => {
    expect(demo).toContain("if (runStarted.current) return;");
    expect(demo).toContain("if (runCompleted.current) return;");
    expect(demo).toContain("runStarted.current = false;");
    expect(demo).toContain("runCompleted.current = false;");
  });

  it("resets every piece of state and returns focus to the first field", () => {
    for (const line of [
      "setStage(\"form\")",
      "setName(PREFILL.name)",
      "setJobValue(String(DEMO_JOB_VALUE))",
      "setMargin(DEFAULT_MARGIN)",
      "setRewardPaid(false)",
      "firstFieldRef.current?.focus()",
    ]) {
      expect(demo).toContain(line);
    }
  });

  it("applies a margin before showing contribution, and never treats revenue as profit", () => {
    expect(demo).toContain("revenue * (margin / 100)");
    expect(demo).toContain("grossProfit - DEMO_REWARD - MONTHLY_PRICE");
    expect(demo).not.toMatch(/revenue - DEMO_REWARD/);
  });

  it("separates reward owed from owner-recorded paid", () => {
    expect(demo).toContain("(recorded paid)");
    expect(demo).toContain("(owed)");
  });

  it("writes nothing and sends nothing", () => {
    for (const forbidden of ["supabase", "fetch(", "sms:", "mailto:"]) {
      expect(demo).not.toContain(forbidden);
    }
  });
});
