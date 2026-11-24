import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  followupDue,
  followupEligible,
  launchAudience,
  launchLink,
  launchPlanDecision,
  LAUNCH_DEFAULT_BODY,
  LAUNCH_MAX_RECIPIENTS,
  newClickToken,
  isClickToken,
  renderLaunchText,
} from "../../supabase/functions/_shared/referral-launch";
import { migrationFunctions } from "./helpers/migrationFunctions";
import { recipientBucket, safeAnalyticsMeta, analyticsEventAllowed } from "@/lib/analyticsPrivacy";

const DAY = 86_400_000;
const contact = (i: number, over: Record<string, unknown> = {}) => ({ id: `c${i}`, name: `Person ${i}`, email: `info+qa${i}@revvin.co`, status: "pending", is_mock: false, ...over });

describe("referral launch plan rule", () => {
  it("Free gets one launch, a second is refused with free_launch_used", () => {
    expect(launchPlanDecision("free", false)).toEqual({ ok: true });
    expect(launchPlanDecision("free", true)).toEqual({ ok: false, status: 403, code: "free_launch_used" });
  });
  it("Pro (including trial) is unlimited", () => {
    expect(launchPlanDecision("pro", true)).toEqual({ ok: true });
  });
  it("the server checks the claim and returns 403 with the code", () => {
    const src = readFileSync("supabase/functions/send-campaign/index.ts", "utf8");
    expect(src).toMatch(/code: decision\.code \}, 403/);
    expect(src).toMatch(/code: "free_launch_used" \}, 403/);
  });
});

describe("launch audience", () => {
  it("caps at 500 and counts the rest", async () => {
    const all = Array.from({ length: 503 }, (_, i) => contact(i));
    const { recipients, reasons } = await launchAudience(all, () => false);
    expect(LAUNCH_MAX_RECIPIENTS).toBe(500);
    expect(recipients).toHaveLength(500);
    expect(reasons.over_500_campaign_cap).toBe(3);
  });
  it("skips no email, opted out, duplicate, undeliverable, sample and suppressed", async () => {
    const { recipients, reasons } = await launchAudience([
      contact(1), contact(2, { email: null }), contact(3, { status: "opted_out" }), contact(4, { email: "INFO+qa1@revvin.co" }),
      contact(5, { email: "a@example.com" }), contact(6, { is_mock: true }), contact(7),
    ], (email) => email === "info+qa7@revvin.co");
    expect(recipients.map((r) => r.id)).toEqual(["c1"]);
    expect(reasons).toEqual({ no_email: 1, opted_out: 1, duplicate_email: 1, undeliverable_email: 1, mock_contact: 1, suppressed: 1 });
  });
  it("has no last-job-date requirement", async () => {
    const { recipients } = await launchAudience([contact(1, { last_job_at: null })], () => false);
    expect(recipients).toHaveLength(1);
  });
});

describe("launch email content", () => {
  const tokens = { first_name: "Ana", business_name: "QA Test Plumbing", reward: "$50", link: "x" };
  it("fills the reward", () => {
    expect(renderLaunchText(LAUNCH_DEFAULT_BODY, tokens)).toContain("we will send you $50 as a thank you.");
  });
  it("omits the reward sentence cleanly when no reward is set", () => {
    const text = renderLaunchText(LAUNCH_DEFAULT_BODY, { ...tokens, reward: "  " });
    expect(text).not.toMatch(/reward|thank you\.|\{|\s{3,}/);
    expect(text).toContain("If you know someone who could use us, send them your personal link below.");
    expect(text).toContain("Best,\nQA Test Plumbing");
  });
  it("each recipient gets their own personal link with an opaque click code", () => {
    const a = launchLink("https://revvin.co", "qa-test-plumbing", "tokA", "0123456789abcdef");
    const b = launchLink("https://revvin.co", "qa-test-plumbing", "tokB", "fedcba9876543210");
    expect(a).toBe("https://revvin.co/r/qa-test-plumbing?ref=tokA&c=0123456789abcdef");
    expect(a).not.toBe(b);
    expect(isClickToken(newClickToken(() => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 255])))).toBe(true);
    expect(isClickToken("not-a-token")).toBe(false);
  });
});

describe("follow-ups", () => {
  const start = "2026-11-01T00:00:00Z";
  const t0 = new Date(start).getTime();
  it("step 1 on day 4, step 2 on day 10, never past 2", () => {
    const c = { started_at: start, followups_enabled: true, followups_done: 0 };
    expect(followupDue(c, t0 + 3.9 * DAY)).toBeNull();
    expect(followupDue(c, t0 + 4 * DAY)).toBe(1);
    expect(followupDue({ ...c, followups_done: 1 }, t0 + 9 * DAY)).toBeNull();
    expect(followupDue({ ...c, followups_done: 1 }, t0 + 10 * DAY)).toBe(2);
    expect(followupDue({ ...c, followups_done: 2 }, t0 + 30 * DAY)).toBeNull();
  });
  it("owner can turn them off", () => {
    expect(followupDue({ started_at: start, followups_enabled: false, followups_done: 0 }, t0 + 5 * DAY)).toBeNull();
  });
  const base = { firstSendSent: true, clicked: false, referred: false, optedOut: false, suppressed: false, stepsAlreadySent: [0] };
  it("only to people who have not clicked or referred and are still reachable", () => {
    expect(followupEligible(1, base)).toBe(true);
    expect(followupEligible(1, { ...base, clicked: true })).toBe(false);
    expect(followupEligible(1, { ...base, referred: true })).toBe(false);
    expect(followupEligible(1, { ...base, optedOut: true })).toBe(false);
    expect(followupEligible(1, { ...base, suppressed: true })).toBe(false);
    expect(followupEligible(1, { ...base, firstSendSent: false })).toBe(false);
  });
  it("is idempotent: the same step is never sent twice", () => {
    expect(followupEligible(1, { ...base, stepsAlreadySent: [0, 1] })).toBe(false);
    expect(followupEligible(2, { ...base, stepsAlreadySent: [0, 1] })).toBe(true);
    const sql = readFileSync("drizzle/migrations/0040_referral_launch_campaigns.sql", "utf8");
    expect(sql).toMatch(/UNIQUE INDEX IF NOT EXISTS campaign_sends_launch_step_once ON public\.campaign_sends \(campaign_id, contact_id, step\)/);
  });
});

describe("click capture", () => {
  it("records first touch for people and ignores known bots", async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const db = new PGlite();
    const fns = migrationFunctions();
    await db.exec(`CREATE TABLE public.campaign_sends(id serial, click_token text, clicked_at timestamptz);
      INSERT INTO public.campaign_sends(click_token) VALUES ('0123456789abcdef'), ('fedcba9876543210');`);
    // Stand-in for the live classifier (which returns "declared" for these
    // agents); this test checks that the click function honors it.
    await db.exec(`CREATE FUNCTION public.fn_bot_reason(p_ua text, p_referrer text) RETURNS text LANGUAGE sql AS $$ SELECT CASE WHEN p_ua ~* '(bot|headless)' THEN 'declared' END $$;`);
    const click = fns.get("fn_campaign_click")!;
    await db.exec(click.slice(0, click.indexOf("REVOKE")) );
    const call = async (token: string, ua: string) => (await db.query<{ ok: boolean }>("SELECT public.fn_campaign_click($1, $2) ok", [token, ua])).rows[0].ok;
    expect(await call("0123456789abcdef", "Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe(false);
    expect(await call("0123456789abcdef", "Mozilla/5.0 HeadlessChrome/120.0")).toBe(false);
    expect(await call("0123456789abcdef", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")).toBe(true);
    // First touch only, and malformed codes are refused.
    expect(await call("0123456789abcdef", "Mozilla/5.0 (Windows NT 10.0) Chrome/131.0 Safari/537.36")).toBe(false);
    expect(await call("not-a-token", "Mozilla/5.0 (Windows NT 10.0) Chrome/131.0 Safari/537.36")).toBe(false);
    const rows = (await db.query<{ t: string; c: boolean }>("SELECT click_token t, clicked_at IS NOT NULL c FROM public.campaign_sends ORDER BY id")).rows;
    expect(rows).toEqual([{ t: "0123456789abcdef", c: true }, { t: "fedcba9876543210", c: false }]);
    await db.close();
  }, 30000);
});

describe("launch events", () => {
  it("launch_sent carries only a fixed recipient bucket", () => {
    expect(recipientBucket(7)).toBe("1-10");
    expect(recipientBucket(500)).toBe("201-500");
    const ctx = { traffic: "product", path: "/dashboard" } as never;
    expect(analyticsEventAllowed("launch_sent", ctx)).toBe(true);
    expect(safeAnalyticsMeta("launch_sent", ctx, { recipients: "11-50" }).recipients).toBe("11-50");
    expect(safeAnalyticsMeta("launch_sent", ctx, { recipients: "42" }).recipients).toBeUndefined();
  });
});

describe("reactivation path unchanged", () => {
  it("still requires Pro and a segment", () => {
    const src = readFileSync("supabase/functions/send-campaign/index.ts", "utf8");
    expect(src).toContain('if (plan !== "pro") return json({ error: "Reactivation campaigns require Revvin Pro" }, 403);');
    expect(src).toContain('label: "reactivation-campaign"');
    const queue = readFileSync("supabase/functions/process-email-queue/index.ts", "utf8");
    expect(queue).toContain("if (plan !== 'pro' && payload.label !== 'referral-launch')");
  });
});
