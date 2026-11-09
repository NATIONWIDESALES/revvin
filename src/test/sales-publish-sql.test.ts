// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, expect, it } from "vitest";
import { migrationFunctions } from "./helpers/migrationFunctions";

let db: PGlite;
const uid = "00000000-0000-4000-8000-000000000001";
const functions = migrationFunctions();
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    CREATE TYPE app_role AS ENUM ('admin','business','referrer','sales');
    CREATE TABLE auth.users(id uuid PRIMARY KEY, raw_user_meta_data jsonb);
    CREATE TABLE profiles(user_id uuid,full_name text,city text);
    CREATE TABLE user_roles(user_id uuid,role app_role, UNIQUE(user_id,role));
    CREATE TABLE wallet_balances(user_id uuid UNIQUE);
    CREATE TABLE business_trial_history(user_id uuid PRIMARY KEY);
    CREATE TABLE businesses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,name text,industry text,city text,phone text,
      category text,service_area text,slug text,offer_amount text,account_status text DEFAULT 'pending_approval',
      is_published boolean DEFAULT false,is_disabled boolean DEFAULT false,verified boolean DEFAULT false,is_verified boolean DEFAULT false,index_approved boolean DEFAULT false,
      subscription_status text DEFAULT 'none',stripe_customer_id text,stripe_subscription_id text,stripe_connected_account_id text,stripe_connect_status text,
      launch_package_status text,current_period_end timestamptz,updated_at timestamptz DEFAULT now(),
      pro_trial_ends_at timestamptz,published_notified_at timestamptz,acquisition jsonb,partner_id uuid,partner_attributed_at timestamptz,contact_outreach_consent_at timestamptz,plan text DEFAULT 'free');
    CREATE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=$1 AND role=$2) $$;
    CREATE FUNCTION fn_slug_rejection(text) RETURNS text LANGUAGE sql AS $$ SELECT NULL::text $$;`);
  for (const name of ["handle_new_user", "fn_new_business_acquisition_trial", "fn_guard_is_verified", "fn_guard_first_trial", "enforce_business_slug_rules", "fn_business_derive_plan", "prevent_partner_attribution_changes", "prevent_consent_timestamp_rollback", "fn_business_privileged_unchanged"]) {
    const sql = functions.get(name);
    if (!sql) throw new Error(`Missing migration function ${name}`);
    await db.exec(sql);
  }
  await db.exec(readFileSync("drizzle/migrations/0020_owner_publish_toggle_and_reward_format.sql", "utf8"));
  await db.exec(`CREATE TRIGGER signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
    CREATE TRIGGER trg_acquisition_trial_guard BEFORE INSERT OR UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION fn_new_business_acquisition_trial();
    CREATE TRIGGER trg_guard_is_verified BEFORE INSERT OR UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION fn_guard_is_verified();
    CREATE TRIGGER zzz_first_trial BEFORE INSERT ON businesses FOR EACH ROW EXECUTE FUNCTION fn_guard_first_trial();
    CREATE TRIGGER trg_enforce_business_slug_rules BEFORE INSERT OR UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION enforce_business_slug_rules();
    CREATE TRIGGER trg_prevent_business_privileged_inserts BEFORE INSERT ON businesses FOR EACH ROW EXECUTE FUNCTION prevent_business_privileged_updates();
    CREATE TRIGGER trg_prevent_business_privileged_updates BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION prevent_business_privileged_updates();
    CREATE TRIGGER trg_prevent_status_self_approval BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION prevent_status_self_approval();
    CREATE TRIGGER businesses_partner_attribution_locked BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION prevent_partner_attribution_changes();
    CREATE TRIGGER trg_prevent_consent_timestamp_rollback BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION prevent_consent_timestamp_rollback();
    CREATE TRIGGER trg_zz_business_derive_plan BEFORE INSERT OR UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION fn_business_derive_plan();
    GRANT USAGE ON SCHEMA public,auth TO authenticated; GRANT SELECT,UPDATE ON businesses TO authenticated;
    ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
    CREATE POLICY owner_read ON businesses FOR SELECT TO authenticated USING(auth.uid()=user_id);
    CREATE POLICY owner_update ON businesses FOR UPDATE TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id AND fn_business_privileged_unchanged(id,subscription_status,account_status,stripe_customer_id,stripe_subscription_id,stripe_connected_account_id,stripe_connect_status,verified,is_disabled,is_published,launch_package_status,current_period_end));
    INSERT INTO auth.users VALUES('${uid}','{"role":"business","business_name":"Fixture Roofing","preview_trade":"Roofing","preview_reward":"250"}');
    SELECT set_config('request.jwt.claim.sub','${uid}',false),set_config('request.jwt.claim.role','authenticated',false);`);
}, 30000);
afterAll(async () => { await db.close(); });

it("reproduces November 5 guard rejection with saved fields and an established owner session", async () => {
  await db.exec(readFileSync("supabase/migrations/20260819231544_0aca4ab8-4133-42f7-8fd8-11ae902700ae.sql", "utf8"));
  await db.exec(`SET ROLE authenticated; UPDATE businesses SET slug='fixture-roofing',name='Fixture Roofing',offer_amount='250' WHERE user_id='${uid}';`);
  await expect(db.query("SELECT * FROM fn_set_business_published(true)")).rejects.toThrow("Only admins or backend services can modify subscription/account/billing fields");
  await db.exec("RESET ROLE");
});

it("real 0020 migration publishes a fresh signup on the first attempt with owner RLS and trial guards", async () => {
  await db.exec(readFileSync("drizzle/migrations/0020_owner_publish_toggle_and_reward_format.sql", "utf8"));
  const fresh = "00000000-0000-4000-8000-000000000002";
  await db.exec(`SELECT set_config('request.jwt.claim.sub','',false); INSERT INTO auth.users VALUES('${fresh}','{"role":"business","business_name":"Fresh Roofing"}');
    SELECT set_config('request.jwt.claim.sub','${fresh}',false); SET ROLE authenticated;
    UPDATE businesses SET name='Fresh Roofing',slug='fresh-roofing',offer_amount='500',category='Roofing',service_area='Dallas, TX' WHERE user_id='${fresh}';`);
  expect((await db.query<{ published: boolean; slug: string }>("SELECT * FROM fn_set_business_published(true)")).rows).toEqual([{ published: true, slug: "fresh-roofing" }]);
  expect((await db.query<{ reward: string; trial: boolean; verified: boolean }>(`SELECT offer_amount reward,pro_trial_ends_at>now() trial,is_verified verified FROM businesses WHERE user_id='${fresh}'`)).rows[0]).toEqual({ reward: "$500", trial: true, verified: false });
  for (const patch of ["is_published=false", "account_status='disabled'", "is_verified=true", "pro_trial_ends_at=now()+interval '30 days'", "subscription_status='active'"]) {
    await expect(db.exec(`UPDATE businesses SET ${patch} WHERE user_id='${fresh}'`)).rejects.toThrow();
  }
  await db.exec("RESET ROLE");
});