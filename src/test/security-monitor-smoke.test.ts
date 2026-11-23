// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { smokeFailureConfirmed, type SmokeRun } from "../../supabase/functions/security-monitor/smoke-confirmation";
import { migrationFunctions } from "./helpers/migrationFunctions";

const run = (ok: boolean, seconds: number): SmokeRun => ({
  ok, ran_at: new Date(Date.UTC(2026, 10, 23, 15, 0, seconds)).toISOString(),
  failed_step: ok ? null : "onboarding", steps: [],
});
describe("hourly smoke confirmation", () => {
  it("does not alert on a lone failure", () => {
    expect(smokeFailureConfirmed([run(false, 30)])).toBe(false);
  });
  it("alerts after the immediate rerun also fails", () => {
    expect(smokeFailureConfirmed([run(false, 30), run(false, 29)])).toBe(true);
  });
  it("does not alert when the rerun recovers", () => {
    expect(smokeFailureConfirmed([run(true, 30), run(false, 29)])).toBe(false);
  });
  it("does not combine independent hourly failures", () => {
    expect(smokeFailureConfirmed([run(false, 3600), run(false, 0)])).toBe(false);
  });
  it("does not confirm a failure following a successful run", () => {
    expect(smokeFailureConfirmed([run(false, 30), run(true, 29)])).toBe(false);
  });
  it("runs the failure path exactly twice and rolls back simulated signup data", async () => {
    const db = new PGlite();
    try {
      await db.exec(`CREATE SCHEMA auth;
        CREATE TABLE auth.users(id uuid, instance_id uuid, aud text, role text, email text,
          raw_user_meta_data jsonb, raw_app_meta_data jsonb, created_at timestamptz, updated_at timestamptz);
        CREATE TABLE businesses(id uuid, user_id uuid, account_status text);
        CREATE TABLE smoke_test_runs(ok boolean,failed_step text,steps jsonb,duration_ms int,ran_at timestamptz DEFAULT now());`);
      const sql = migrationFunctions().get("fn_smoke_customer_journey");
      if (!sql) throw new Error("Missing current smoke function");
      await db.exec(sql);
      const { rows } = await db.query<{ result: { ok: boolean; attempts: number } }>("SELECT fn_smoke_customer_journey() result");
      expect(rows[0].result.ok).toBe(false);
      expect(rows[0].result.attempts).toBe(2);
      expect((await db.query("SELECT count(*)::int n FROM smoke_test_runs")).rows).toEqual([{ n: 2 }]);
      expect((await db.query("SELECT count(*)::int n FROM auth.users")).rows).toEqual([{ n: 0 }]);
      expect((await db.query("SELECT current_setting('revvin.smoke_retry',true) flag")).rows).toEqual([{ flag: "" }]);
      const history = await db.query<SmokeRun>("SELECT * FROM smoke_test_runs ORDER BY ran_at DESC");
      expect(smokeFailureConfirmed(history.rows)).toBe(true);
    } finally { await db.close(); }
  }, 30000);
});