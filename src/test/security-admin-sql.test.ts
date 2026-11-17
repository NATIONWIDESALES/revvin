// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
const sql = readFileSync("drizzle/migrations/0035_security_admin_mfa_and_internal_access.sql", "utf8");
describe("admin MFA and least privilege SQL", () => {
  it("public view keeps SELECT but rejects anonymous and authenticated writes", async () => {
    const db = new PGlite();
    try {
      await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE TABLE businesses(id integer); INSERT INTO businesses VALUES(7); CREATE VIEW businesses_public AS SELECT id FROM businesses; GRANT ALL ON businesses_public TO anon,authenticated;");
      await db.exec(readFileSync("drizzle/migrations/0036_security_public_business_view_read_only.sql", "utf8"));
      for (const role of ["anon", "authenticated"]) {
        await db.exec(`SET ROLE ${role}`);
        expect((await db.query("SELECT * FROM businesses_public")).rows).toEqual([{ id: 7 }]);
        await expect(db.exec("UPDATE businesses_public SET id=8")).rejects.toThrow("permission denied");
        await db.exec("RESET ROLE");
      }
    } finally { await db.close(); }
  });
  it("live factor state gates AAL1 without locking out unenrolled admins, and trigger calls still fire", async () => {
    const db = new PGlite();
    try {
      await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$;
        CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated' $$;
        CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT current_setting('test.jwt')::jsonb $$;
        CREATE TABLE auth.mfa_factors(user_id uuid,factor_type text,status text);
        CREATE TYPE public.app_role AS ENUM ('admin','business','referrer','sales');
        CREATE TABLE public.user_roles(user_id uuid,role public.app_role);
        INSERT INTO public.user_roles VALUES(auth.uid(),'admin');
        CREATE FUNCTION public.fn_business_derive_plan() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
        CREATE TABLE public.trigger_probe(id integer);
        CREATE FUNCTION public.trigger_probe_fn() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN NEW.id=NEW.id+1; RETURN NEW; END $$;
        CREATE TRIGGER probe BEFORE INSERT ON public.trigger_probe FOR EACH ROW EXECUTE FUNCTION public.trigger_probe_fn();
        GRANT INSERT ON public.trigger_probe TO authenticated;
        SELECT set_config('test.jwt','{"aal":"aal1"}',false);`);
      const tables = ["partners", "partner_payouts", "partner_commissions", "partner_adjustments", "partner_clicks", "platform_flags", "push_send_log", "security_alerts", "security_events", "business_lifecycle_emails", "business_trial_history", "job_ask_delay_rollback_20261113", "app_failures", "failure_alerts", "notification_jobs", "referral_rate_buckets", "referral_submissions"];
      for (const table of tables) await db.exec(`CREATE TABLE public.${table}(id integer); GRANT ALL ON public.${table} TO anon,authenticated;`);
      await db.exec(sql);
      const allowed = async () => (await db.query<{ ok: boolean }>("SELECT has_role(auth.uid(),'admin') ok")).rows[0].ok;
      expect(await allowed()).toBe(true);
      await db.exec("INSERT INTO auth.mfa_factors VALUES(auth.uid(),'totp','unverified')");
      expect(await allowed()).toBe(true);
      await db.exec("UPDATE auth.mfa_factors SET status='verified'");
      expect(await allowed()).toBe(false);
      await db.exec(`SELECT set_config('test.jwt','{"aal":"aal2"}',false)`);
      expect(await allowed()).toBe(true);
      for (const role of ["anon", "authenticated"]) {
        expect((await db.query<{ ok: boolean }>("SELECT has_function_privilege($1,'public.trigger_probe_fn()','EXECUTE') ok", [role])).rows[0].ok).toBe(false);
        for (const table of tables) expect((await db.query<{ ok: boolean }>("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') ok", [role, `public.${table}`])).rows[0].ok).toBe(false);
      }
      await db.exec("SET ROLE authenticated; INSERT INTO public.trigger_probe VALUES(1); RESET ROLE;");
      expect((await db.query("SELECT id FROM public.trigger_probe")).rows).toEqual([{ id: 2 }]);
    } finally { await db.close(); }
  }, 30000);
});