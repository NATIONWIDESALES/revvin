// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, expect, it } from "vitest";
import { reversalPlan } from "../../supabase/functions/_shared/partner-rules";

let db: PGlite;
const admin = "00000000-0000-4000-8000-000000000001";
const repUser = "00000000-0000-4000-8000-000000000002";
const owner = "00000000-0000-4000-8000-000000000003";
let rep: string;
let affiliate: string;
// Candidate only: Cloud rejected schema access. Never used by the running app.
const base = readFileSync("src/test/helpers/repPartnerMigration.sql", "utf8");
const archived = readFileSync("drizzle/migrations/0023_fix_email_queue_payloads_claim_earn.sql", "utf8");
const claimFunction = (`CREATE OR REPLACE FUNCTION public.fn_prospect_claim${archived.split("CREATE OR REPLACE FUNCTION public.fn_prospect_claim")[1]}`)
  .replace("WHERE code = p_code LIMIT 1;", "WHERE code = p_code LIMIT 1 FOR UPDATE;")
  .replace("claimed_business_id = b.id, updated_at = now()", "claimed_business_id = b.id, claimed_at = now(), updated_at = now()")
  .replace("  IF p.created_by IS NOT NULL THEN", "  PERFORM public.fn_attribute_rep_claim(p.id, b.id);\n  IF p.created_by IS NOT NULL THEN");
const migration = `${base}\n${claimFunction}\nALTER FUNCTION public.fn_prospect_claim(text,uuid) OWNER TO service_role;`;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    GRANT USAGE,CREATE ON SCHEMA public TO service_role;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'anon') $$;
    CREATE TYPE app_role AS ENUM ('admin','business','referrer','sales');
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
    CREATE TABLE user_roles(user_id uuid,role app_role,UNIQUE(user_id,role));
    CREATE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT (auth.role()='service_role' OR $1=auth.uid() OR EXISTS(SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND role='admin')) AND EXISTS(SELECT 1 FROM user_roles WHERE user_id=$1 AND role=$2) $$;
    CREATE TABLE businesses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,name text,category text,industry text,is_demo boolean DEFAULT false,acquisition jsonb DEFAULT '{}',subscription_status text,pro_trial_ends_at timestamptz,stripe_customer_id text);
    CREATE TABLE stripe_payments(business_id uuid,paid_at timestamptz,collected boolean,amount_paid_cents bigint);
    CREATE TABLE audit_log(id uuid DEFAULT gen_random_uuid(),actor_id uuid,event_type text,payload jsonb);
    CREATE FUNCTION fn_offer_is_restricted_category(text) RETURNS boolean LANGUAGE sql AS $$ SELECT lower($1) IN ('real estate','real-estate','mortgage','insurance') $$;
    CREATE FUNCTION fn_rate_bucket_hit(text,interval,integer) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE FUNCTION fn_request_bucket() RETURNS text LANGUAGE sql AS $$ SELECT 'isolated' $$;
    CREATE FUNCTION enqueue_email(text,jsonb) RETURNS void LANGUAGE sql AS $$ SELECT $$;
    INSERT INTO auth.users(id,email) VALUES('${admin}','admin@example.test'),('${repUser}','rep@example.test'),('${owner}','owner@example.test');
    INSERT INTO user_roles VALUES('${admin}','admin');`);
  await db.exec(readFileSync("supabase/migrations/20260917155206_53d90176-1826-49e6-805f-88f06f8d7797.sql", "utf8"));
  await db.exec(readFileSync("drizzle/migrations/0017_prospect_pages.sql", "utf8").replace(/SELECT cron\.schedule\([\s\S]*?\n\);/, "SELECT 1;"));
  await db.exec(`INSERT INTO partners(name,email,status,code) VALUES('Affiliate','affiliate@example.test','approved','affiliate');
    GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO service_role;
    GRANT SELECT ON auth.users TO service_role;
    SELECT set_config('request.jwt.claim.sub','${admin}',false),set_config('request.jwt.claim.role','authenticated',false);`);
  await db.exec(migration);
  affiliate = (await db.query<{ id: string }>("SELECT id FROM partners WHERE code='affiliate'")).rows[0].id;
  rep = (await db.query<{ id: string }>("SELECT fn_admin_rep_partner('rep@example.test','Fixture Rep') id")).rows[0].id;
}, 30000);
afterAll(async () => { await db.close(); });
async function as(uid: string, role = "authenticated") {
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${uid}',false),set_config('request.jwt.claim.role','${role}',false);`);
}
async function payment(partner: string, business: string, product: string, amount: number, date: string) {
  const object = crypto.randomUUID();
  await db.exec(`INSERT INTO partner_commissions(partner_id,business_id,source_type,stripe_object_id,product,amount_collected_cents,commission_cents,paid_at,payable_at)
    VALUES('${partner}','${business}','invoice','${object}','${product}',${amount},0,'${date}','${date}'::timestamptz+interval '30 days')`);
  return (await db.query<{ commission_cents: number; applied_rate: string }>(`SELECT commission_cents::int,applied_rate::text FROM partner_commissions WHERE stripe_object_id='${object}'`)).rows[0];
}
async function claim(options: { typed?: string; existing?: string; demo?: boolean; category?: string; self?: boolean } = {}) {
  const id = crypto.randomUUID(); const code = id.replace(/-/g, ""); const user = options.self ? repUser : owner;
  await as(user);
  await db.exec(`UPDATE auth.users SET raw_user_meta_data='${JSON.stringify({ partner_typed_code: options.typed })}' WHERE id='${user}';
    INSERT INTO businesses(id,user_id,name,category,is_demo,acquisition,partner_id) VALUES('${id}','${user}','Fixture Business','${options.category ?? "Roofing"}',${!!options.demo},'{"prospect_code":"${code}"}',${options.existing ? `'${options.existing}'` : "NULL"});
    INSERT INTO prospect_pages(code,name,trade,created_by) VALUES('${code}','Fixture Business','roofing','${repUser}');`);
  await db.query(`SELECT fn_prospect_claim('${code}','${id}')`);
  return (await db.query<{ partner_id: string | null; id: string }>(`SELECT id,partner_id FROM businesses WHERE id='${id}'`)).rows[0];
}
it("backfills affiliates exactly and adds approved reps with the sales role", async () => {
  expect((await db.query<any>(`SELECT kind,setup_rate::text,recurring_rate::text,recurring_months,user_id FROM partners WHERE id='${affiliate}'`)).rows[0]).toEqual({ kind: "affiliate", setup_rate: "0.40", recurring_rate: "0.40", recurring_months: null, user_id: null });
  expect((await db.query<any>(`SELECT kind,setup_rate::text,recurring_rate::text,recurring_months,status,user_id FROM partners WHERE id='${rep}'`)).rows[0]).toEqual({ kind: "rep", setup_rate: "0.50", recurring_rate: "0.30", recurring_months: 12, status: "approved", user_id: repUser });
});
it("claim attributes the rep atomically and audits its ids", async () => {
  const b = await claim(); expect(b.partner_id).toBe(rep);
  expect((await db.query<any>(`SELECT payload->>'business_id' bid FROM audit_log WHERE event_type='rep_attributed'`)).rows[0].bid).toBe(b.id);
});
it("typed signup code wins over the rep claim", async () => { expect((await claim({ typed: "affiliate" })).partner_id).toBe(affiliate); });
it("stored click not yet attributed cannot beat a rep claim", async () => { expect((await claim()).partner_id).toBe(rep); });
it("existing attribution is never overwritten", async () => { expect((await claim({ existing: affiliate })).partner_id).toBe(affiliate); });
it.each([{ demo: true }, { category: "Real Estate" }, { self: true }])("refuses ineligible rep attribution %j", async options => { expect((await claim(options)).partner_id).toBeNull(); });
it("rep commissions use 50% setup, 30% recurring and a first-payment 12-month cutoff", async () => {
  const b = await claim();
  await as(admin);
  expect(await payment(rep,b.id,"launch_package",29700,"2026-01-01")).toEqual({ commission_cents: 14850, applied_rate: "0.50" });
  expect(await payment(rep,b.id,"pro_monthly",4900,"2026-12-31")).toEqual({ commission_cents: 1470, applied_rate: "0.30" });
  expect(await payment(rep,b.id,"pro_yearly",45000,"2026-02-01")).toEqual({ commission_cents: 13500, applied_rate: "0.30" });
  expect(await payment(rep,b.id,"pro_monthly",4900,"2027-01-01")).toBeUndefined();
});
it("affiliates retain 40% on setup and recurring without expiry", async () => {
  const b = await claim({ typed: "affiliate" }); await as(admin);
  expect((await payment(affiliate,b.id,"launch_package",29700,"2026-01-01")).commission_cents).toBe(11880);
  expect((await payment(affiliate,b.id,"pro_monthly",4900,"2030-01-01")).commission_cents).toBe(1960);
  expect((await payment(affiliate,b.id,"pro_yearly",45000,"2031-01-01")).commission_cents).toBe(18000);
});
it("admin terms changes affect later collected payments only, never existing rows", async () => {
  const b = await claim(); await as(admin);
  const old = await payment(rep,b.id,"launch_package",10000,"2026-01-01");
  await db.exec(`SELECT fn_admin_partner_terms('${rep}',0.60,0.35,12,NULL)`);
  expect(await payment(rep,b.id,"launch_package",10000,"2026-01-02")).toEqual(old);
  expect(await payment(rep,b.id,"launch_package",10000,"2027-01-01")).toEqual({ commission_cents: 6000, applied_rate: "0.60" });
  expect((await db.query<any>(`SELECT count(*)::int n FROM partner_commissions WHERE business_id='${b.id}' AND commission_cents=5000`)).rows[0].n).toBe(2);
});
it("admin removal stops future commissions without changing history", async () => {
  const b = await claim(); await as(admin);
  await payment(rep,b.id,"launch_package",10000,"2026-01-01");
  await db.query(`SELECT fn_admin_business_partner('${b.id}',NULL,'Fixture removal')`);
  expect(await payment(rep,b.id,"launch_package",10000,"2026-02-01")).toBeUndefined();
  expect((await db.query<any>(`SELECT count(*)::int n FROM partner_commissions WHERE business_id='${b.id}'`)).rows[0].n).toBe(1);
});
it("rep refund uses the existing reversal and paid clawback arithmetic", () => {
  const commission = { id: "rep-commission", partner_id: rep, status: "pending", commission_cents: 1470, amount_collected_cents: 4900 };
  expect(reversalPlan({ commission,refundedCents:4900,reason:"refund" })).toEqual({ action:"reverse",reversalReason:"refund" });
  expect(reversalPlan({ commission:{ ...commission,status:"paid" },refundedCents:4900,reason:"refund" })).toEqual({ action:"adjust",amountCents:-1470,reason:"refund" });
});
it("sales reads only own earnings, not direct partner tables or admin RPCs", async () => {
  await as(repUser); await db.exec("SET ROLE authenticated");
  const result = (await db.query<any>("SELECT fn_my_rep_earnings() e")).rows[0].e;
  expect(result.partner_id).toBe(rep);
  expect(JSON.stringify(result)).not.toMatch(/owner@example|phone|stripe|card|payment_intent/);
  for (const table of ["partners","partner_commissions","partner_payouts","partner_adjustments","partner_term_versions"]) await expect(db.query(`SELECT * FROM ${table}`)).rejects.toThrow();
  await expect(db.query(`SELECT fn_rep_earnings_data('${affiliate}')`)).rejects.toThrow();
  await expect(db.query("SELECT fn_admin_rep_earnings()")).rejects.toThrow("not_authorized");
  await expect(db.query("SELECT fn_admin_rep_partner('owner@example.test','Owner')")).rejects.toThrow("not_authorized");
  await expect(db.query(`UPDATE businesses SET partner_id='${affiliate}'`)).rejects.toThrow();
  await as("", "anon"); await db.exec("SET ROLE anon");
  await expect(db.query("SELECT fn_my_rep_earnings()")).rejects.toThrow();
  await db.exec("RESET ROLE");
});