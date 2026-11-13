// @vitest-environment node
import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const owner = "00000000-0000-4000-8000-000000000001";
const business = "00000000-0000-4000-8000-000000000002";
const read = (name: string) => readFileSync(`drizzle/migrations/${name}`, "utf8");
describe("product migrations in isolated PostgreSQL", () => {
  it("readiness returns all five missing keys without an array parse failure", async () => {
    const db = new PGlite();
    try {
      await db.exec(`CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${owner}'::uuid $$;
        CREATE TABLE businesses(id uuid,user_id uuid,street_address text,city text,postal_code text,country text,business_email text);
        INSERT INTO businesses(id,user_id) VALUES('${business}','${owner}');`);
      await db.exec(read("0028_fix_campaign_readiness_array_append.sql"));
      expect((await db.query("SELECT * FROM fn_campaign_readiness()" )).rows).toEqual([{ ready: false, missing: ["street_address", "city", "postal_code", "country", "business_email"], business_id: business }]);
      await db.exec("UPDATE businesses SET street_address='1 Test St',city='Dallas',postal_code='75001',country='US',business_email='owner@example.test'");
      expect((await db.query<{ready: boolean}>("SELECT * FROM fn_campaign_readiness()")).rows[0].ready).toBe(true);
    } finally { await db.close(); }
  }, 30000);
  it("defaults new businesses to 2, preserves custom delays and scheduled asks, and records reversible backfill", async () => {
    const db = new PGlite();
    try {
      await db.exec(`CREATE ROLE service_role; CREATE TABLE businesses(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,trigger_delay_hours integer NOT NULL DEFAULT 24);
        CREATE TABLE referral_triggers(scheduled_send_at timestamptz);
        INSERT INTO businesses(id) VALUES('${business}'); INSERT INTO businesses(trigger_delay_hours) VALUES(6),(2);
        INSERT INTO referral_triggers VALUES('2026-11-14T23:16:00Z');`);
      await db.exec(read("0029_job_ask_delay_two_hours.sql"));
      expect((await db.query<{trigger_delay_hours: number}>("INSERT INTO businesses DEFAULT VALUES RETURNING trigger_delay_hours")).rows[0].trigger_delay_hours).toBe(2);
      expect((await db.query<{trigger_delay_hours: number}>("SELECT trigger_delay_hours FROM businesses ORDER BY trigger_delay_hours")).rows.map(r => r.trigger_delay_hours)).toEqual([2,2,2,6]);
      expect((await db.query<{scheduled_send_at: Date}>("SELECT scheduled_send_at FROM referral_triggers")).rows[0].scheduled_send_at.toISOString()).toBe("2026-11-14T23:16:00.000Z");
      await db.exec("UPDATE businesses b SET trigger_delay_hours=r.previous_delay_hours FROM job_ask_delay_rollback_20261113 r WHERE b.id=r.business_id AND b.trigger_delay_hours=2; ALTER TABLE businesses ALTER COLUMN trigger_delay_hours SET DEFAULT 24;");
      expect((await db.query<{trigger_delay_hours: number}>(`SELECT trigger_delay_hours FROM businesses WHERE id='${business}'`)).rows[0].trigger_delay_hours).toBe(24);
    } finally { await db.close(); }
  }, 30000);
});
