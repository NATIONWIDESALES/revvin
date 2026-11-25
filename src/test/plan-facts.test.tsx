// Free, Pro and trial facts from the single source (src/config/planFeatures.ts),
// asserted against every surface that repeats them. Owner-approved Nov 24 2026.
import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FREE_FEATURES, PRO_FEATURES, PLAN_SPLIT, TRIAL_LINE, TRIAL_SEND_NOTE, PRO_UPSELL_KEEP_ASKING, FREE_CONTACT_LIMIT } from "@/config/planFeatures";
import { PRO_FEATURE_LABELS, TRIAL_LINE as EMAIL_TRIAL_LINE } from "../../supabase/functions/_shared/pricing-copy";

vi.mock("@/integrations/supabase/client", () => {
  const chain: any = { select: () => chain, eq: () => chain, order: () => chain, limit: () => Promise.resolve({ data: [] }), then: (r: any) => Promise.resolve({ data: [] }).then(r) };
  return { supabase: { from: () => chain, rpc: () => Promise.resolve({ data: false }) } };
});
vi.mock("@/components/print/AssetSheet", () => ({ default: () => <div /> }));
import ReferralKitHome from "@/components/dashboard/ReferralKitHome";

const read = (p: string) => readFileSync(p, "utf8");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (/node_modules|integrations|\/test$/.test(p)) return [];
  return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|txt|html|md)$/.test(p) ? [p] : [];
});
const SOURCES = [...walk("src"), ...walk("supabase/functions"), ...walk("public"), ...walk("plugins"), "index.html"];

describe("Free", () => {
  it("lists exactly the approved Free features", () => {
    expect(FREE_FEATURES.map((f) => f.label)).toEqual([
      "Referral page on your own link", "A personal link for every customer", "QR code and print-ready kit",
      "Lead inbox and referral alerts", "Reward tracking", "Bring up to 500 customers", "One launch campaign", "Ask one at a time, any time",
      "A free marketplace profile",
    ]);
    expect(FREE_CONTACT_LIMIT).toBe(500);
    expect(FREE_FEATURES.find((f) => f.label === "One launch campaign")?.description).toMatch(/two follow-ups/);
    expect(FREE_FEATURES.find((f) => f.label === "QR code and print-ready kit")?.description).toMatch(/PDF downloads[^.]*email the kit to a print shop/);
    expect(FREE_FEATURES.find((f) => f.label === "Bring up to 500 customers")?.description).toMatch(/Upload[^.]*paste[^.]*send us your list/);
  });
});

describe("Pro", () => {
  it("lists exactly the approved Pro features, mirrored in email copy", () => {
    const labels = PRO_FEATURES.map((f) => f.label);
    expect(labels).toEqual(["Unlimited customers", "Unlimited launch campaigns", "Automatic ask after each job", "Win-back email campaigns", "ROI reporting and monthly recap", "Custom page branding", "Featured placement and Pro badge in the marketplace"]);
    expect(PRO_FEATURE_LABELS).toEqual(labels);
    expect(PLAN_SPLIT.proDetail).toMatch(/Job done, job software, API or Zapier/);
  });
  it("upsell promises only what exists", () => {
    expect(PRO_UPSELL_KEEP_ASKING).toBe("Pro keeps asking: unlimited campaigns to your whole list, and an automatic ask after every job.");
    expect(read("src/components/dashboard/ReferralLaunchSection.tsx")).toContain("body={PRO_UPSELL_KEEP_ASKING}");
  });
});

describe("Trial", () => {
  it("has one statement, shared with email and llms.txt", () => {
    expect(TRIAL_LINE).toBe("Pro is free for 14 days, starting when you send your first campaign. No card.");
    expect(TRIAL_SEND_NOTE).toBe("Sending starts 14 days of Pro, free. No card.");
    expect(EMAIL_TRIAL_LINE).toBe(TRIAL_LINE);
    expect(read("public/llms.txt")).toContain(TRIAL_LINE);
  });
  it("no surface says the trial starts at signup or repeats stale Free claims", () => {
    const stale = [/Every new account gets Pro free/i, /New accounts get a 14-day/i, /first 25\b/i, /\b25 customers/i, /with a 14-day trial, no card/i,
      /every new customer, after every job, and your whole list each quarter/i, /Open one, hit print, choose Save as PDF/i];
    const hits = SOURCES.flatMap((p) => stale.filter((re) => re.test(read(p))).map((re) => `${p}: ${re}`));
    expect(hits).toEqual([]);
  });
  it("send note shows on the kit screen only when the server says the trial is available", () => {
    const props = { biz: { name: "Ace" }, publicUrl: "https://revvin.co/r/ace", displayUrl: "revvin.co/r/ace", isLive: true, customersTotal: 3,
      onCopy: () => {}, onGo: () => {}, onPublished: () => {}, renderIntake: () => null };
    const { unmount } = render(<MemoryRouter><ReferralKitHome {...props} trialNote /></MemoryRouter>);
    expect(screen.getByTestId("kit-trial-note").textContent).toBe(TRIAL_SEND_NOTE);
    unmount();
    render(<MemoryRouter><ReferralKitHome {...props} /></MemoryRouter>);
    expect(screen.queryByTestId("kit-trial-note")).toBeNull();
  });
});

describe("Homepage", () => {
  it("hero copy and steps", async () => {
    const { HOME_SEO } = await import("@/content/homeSeo");
    expect(HOME_SEO.eyebrow).toBe("Free referral program software for contractors, home services and any business that grows by word of mouth");
    expect(HOME_SEO.sub).toBe("Give Revvin your customer list and your reward. We email every customer their own referral link, follow up twice, and hand you a print-ready kit with your QR code. You pay a reward only when a job closes.");
    expect(HOME_SEO.sub + HOME_SEO.description).not.toMatch(/city by city|locals who earn/i);
    expect(read("src/pages/Index.tsx")).not.toMatch(/opens city by city, locals who earn rewards for referrals will be able to find you/);
    const steps = read("src/components/marketing/StepTrack.tsx").match(/title: "([^"]+)"/g);
    expect(steps).toEqual(['title: "Build your referral page"', 'title: "Bring your customer list"', 'title: "Revvin asks for you"', 'title: "Referrals land, you pay"']);
  });
});
