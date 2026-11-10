// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { MONTHLY_PRICE, ANNUAL_PRICE, CHECKOUT_PRICE_VERSION, LAUNCH_GUARANTEE } from "@/config/pricing";
import { FREE_CONTACT_LIMIT, FREE_FEATURES, PRO_FEATURES } from "@/config/planFeatures";
import { checkoutPricing, PRICE_MONTHLY_49, PRICE_ANNUAL_450, PRICE_MONTHLY_97, PRICE_ANNUAL_970 } from "../../supabase/functions/_shared/stripe-prices";
import { INVITE_PROMOTION_PAUSED, promoCouponFor } from "../../supabase/functions/_shared/promo";
import { productFromPriceId } from "../../supabase/functions/_shared/partner-rules";
import { MONTHLY_PRICE as emailMonthly, ANNUAL_PRICE as emailAnnual, PRO_FEATURE_LABELS } from "../../supabase/functions/_shared/pricing-copy";
import { migrationFunctions } from "./helpers/migrationFunctions";
import { PRERENDER_ROUTES } from "@/content/seoRoutes";
import { renderRoute } from "../../plugins/prerender";

const read = (p: string) => readFileSync(p, "utf8");
describe("approved checkout contract", () => {
  it("new monthly requests charge the displayed 97 USD price", () => {
    expect(MONTHLY_PRICE).toBe(97);
    expect(checkoutPricing("monthly", CHECKOUT_PRICE_VERSION)).toEqual({ price: PRICE_MONTHLY_97, metadata: "pro_monthly" });
  });
  it("new annual requests charge 970 USD once", () => {
    expect(ANNUAL_PRICE).toBe(970);
    expect(checkoutPricing("annual", CHECKOUT_PRICE_VERSION)).toEqual({ price: PRICE_ANNUAL_970, metadata: "pro_annual" });
  });
  it("unversioned old frontend retains both legacy prices", () => {
    expect(checkoutPricing("monthly").price).toBe(PRICE_MONTHLY_49);
    expect(checkoutPricing("annual").price).toBe(PRICE_ANNUAL_450);
  });
  it("unknown versions are refused rather than silently mispriced", () => {
    expect(() => checkoutPricing("monthly", "unknown")).toThrow("unsupported_price_version");
  });
  it("all generations still earn affiliate commissions", () => {
    expect([PRICE_MONTHLY_49, PRICE_MONTHLY_97].map(productFromPriceId)).toEqual(["pro_monthly", "pro_monthly"]);
    expect([PRICE_ANNUAL_450, PRICE_ANNUAL_970].map(productFromPriceId)).toEqual(["pro_yearly", "pro_yearly"]);
  });
  it("new invite redemptions and promotion coupons stay paused", () => {
    expect(INVITE_PROMOTION_PAUSED).toBe(true);
    expect(promoCouponFor("monthly", new Date("2026-01-01"))).toBeNull();
    expect(promoCouponFor("annual", new Date("2026-01-01"))).toBeNull();
  });
  it("email pricing and feature lists match the app", () => {
    expect(emailMonthly).toBe(97); expect(emailAnnual).toBe(970);
    expect(PRO_FEATURE_LABELS).toEqual(PRO_FEATURES.map(f => f.label));
    expect(FREE_CONTACT_LIMIT).toBe(25);
    expect(FREE_FEATURES.some(f => /automatic|API|Zapier/.test(f.label))).toBe(false);
    expect(PRO_FEATURES.some(f => f.label === "Automatic ask after each job")).toBe(true);
  });
  it("launch guarantee contains all three owner conditions", () => {
    expect(LAUNCH_GUARANTEE).toContain("60 days");
    expect(LAUNCH_GUARANTEE).toContain("50 customers");
    expect(LAUNCH_GUARANTEE).toContain("90 days of purchase");
    expect(LAUNCH_GUARANTEE).toContain("info@revvin.co");
  });
});

describe("retired Revvin offer guard, including generated route documents", () => {
  const forbidden = /\$49\b|\$450\b|\$588\b|\$138\b|\$37\.50\b|23%|100 customers|first 100|up to 100 on Free|\$29\b|founding (?:businesses|spot|offer)|locked for life/i;
  const exceptions = new Set([
    "supabase/functions/_shared/stripe-prices.ts", // legacy IDs only
    "supabase/functions/_shared/promo.ts", // paused, existing subscriber preserved
  ]);
  function files(root: string): string[] {
    return readdirSync(root, { withFileTypes: true }).flatMap(e => e.isDirectory()
      ? (e.name === "ui" ? [] : files(join(root, e.name)))
      : /\.(ts|tsx|html|txt)$/.test(e.name) ? [join(root, e.name)] : []);
  }
  it("public, admin and email source contains no retired own-offer text", () => {
    const paths = [...files("src/pages"), ...files("src/components"), ...files("src/config"), ...files("src/content"), ...files("supabase/functions"), "public/llms.txt", "index.html"];
    const violations: string[] = [];
    for (const p of paths) {
      if (exceptions.has(p)) continue;
      read(p).split("\n").forEach((line, i) => {
        // Exact competitor-only price rows, never a whole-file exemption.
        if (p === "src/content/comparisons.ts") line = line.replace(/Business (?:at )?\$49(?: a month|\/month)/g, "Business COMPETITOR_PRICE");
        if (forbidden.test(line)) violations.push(`${p}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(violations).toEqual([]);
  });
  it("prerendered public documents contain no retired own offer", () => {
    for (const route of PRERENDER_ROUTES) {
      const html = renderRoute(read("index.html"), route).replace(/Business (?:at )?\$49(?: a month|\/month)/g, "Business COMPETITOR_PRICE");
      expect(html, route.path).not.toMatch(forbidden);
    }
  });
});

describe("real pricing migration in isolated PostgreSQL", () => {
  let db: PGlite;
  const owner = "00000000-0000-4000-8000-000000000001";
  const biz = "00000000-0000-4000-8000-000000000002";
  const contact = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${owner}'::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated'::text $$;
      CREATE TABLE businesses(id uuid PRIMARY KEY,user_id uuid,plan text,is_demo boolean,pro_trial_ends_at timestamptz,google_review_url text,trigger_delay_hours int);
      CREATE TABLE referral_contacts(id uuid PRIMARY KEY,business_id uuid,created_at timestamptz);
      CREATE TABLE referral_triggers(id uuid DEFAULT gen_random_uuid(),business_id uuid,created_at timestamptz DEFAULT now(),source text,source_event_id text,customer_first_name text,customer_email text,customer_phone text,service_description text,technician_name text,amount_paid numeric,review_request_status text,referral_requires_positive_signal boolean,status text,channel text,failure_reason text,scheduled_send_at timestamptz);
      CREATE FUNCTION fn_effective_plan(uuid) RETURNS text LANGUAGE sql AS $$ SELECT CASE WHEN plan='pro' OR pro_trial_ends_at>now() THEN 'pro' ELSE 'free' END FROM businesses WHERE id=$1 $$;
      CREATE FUNCTION fn_rate_bucket_hit(text,interval,int) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
      INSERT INTO businesses VALUES('${biz}','${owner}','free',false,NULL,NULL,2);`);
    await db.exec(read("drizzle/migrations/0026_pricing_25_contacts_pro_job_asks.sql"));
    const guard = migrationFunctions().get("fn_guard_contact_ask_limit");
    if (!guard) throw new Error("Missing contact ask guard");
    await db.exec(guard);
    await db.exec(`CREATE TRIGGER cap BEFORE INSERT ON referral_contacts FOR EACH ROW EXECUTE FUNCTION fn_enforce_free_contact_limit();
      CREATE TRIGGER job_cap BEFORE INSERT ON referral_triggers FOR EACH ROW EXECUTE FUNCTION fn_job_daily_cap();
      INSERT INTO referral_contacts SELECT ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'${biz}',now()+n*interval '1 second' FROM generate_series(1,25)n;`);
  }, 30000);
  afterAll(async () => { await db.close(); });
  it("Free accepts exactly 25 and refuses the 26th import", async () => {
    await expect(db.exec(`INSERT INTO referral_contacts VALUES('${contact(26)}','${biz}',now())`)).rejects.toThrow("free_contact_limit");
    expect((await db.query<{n:number}>("SELECT count(*)::int n FROM referral_contacts")).rows[0].n).toBe(25);
  });
  it("Free refuses both Job done and direct API-style trigger insertion", async () => {
    await expect(db.exec(`SELECT fn_create_job_ask('${biz}','{"customer_first_name":"Fixture"}')`)).rejects.toThrow("pro_required_automatic_ask");
    await expect(db.exec(`INSERT INTO referral_triggers(business_id) VALUES('${biz}')`)).rejects.toThrow("pro_required_automatic_ask");
  });
  it("trial gets unlimited contacts and the first automatic ask", async () => {
    await db.exec(`UPDATE businesses SET pro_trial_ends_at=now()+interval '14 days'; INSERT INTO referral_contacts VALUES('${contact(26)}','${biz}',now()+interval '26 seconds'); SELECT fn_create_job_ask('${biz}','{"customer_first_name":"Fixture"}');`);
    expect((await db.query<{n:number}>("SELECT count(*)::int n FROM referral_triggers")).rows[0].n).toBe(1);
  });
  it("expiry retains every contact but pauses rank 26 and automatic asks", async () => {
    await db.exec("UPDATE businesses SET pro_trial_ends_at=now()-interval '1 second'");
    expect((await db.query<{n:number}>("SELECT count(*)::int n FROM referral_contacts")).rows[0].n).toBe(26);
    expect((await db.query<{ok:boolean}>(`SELECT fn_contact_ask_allowed('${biz}','${contact(25)}') ok`)).rows[0].ok).toBe(true);
    expect((await db.query<{ok:boolean}>(`SELECT fn_contact_ask_allowed('${biz}','${contact(26)}') ok`)).rows[0].ok).toBe(false);
    await expect(db.exec(`SELECT fn_create_job_ask('${biz}','{"customer_first_name":"Fixture"}')`)).rejects.toThrow("pro_required_automatic_ask");
  });
  it("ownership authorization is still enforced", async () => {
    await db.exec("CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-4000-8000-000000000099'::uuid $$");
    await expect(db.exec(`SELECT fn_contact_ask_allowed('${biz}','${contact(25)}')`)).rejects.toThrow("not_authorized");
    await expect(db.exec(`SELECT fn_create_job_ask('${biz}','{"customer_first_name":"Fixture"}')`)).rejects.toThrow("not_authorized");
  });
});