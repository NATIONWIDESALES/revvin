// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const file = () => `drizzle/migrations/${readdirSync("drizzle/migrations").find((n) => /_directory_referral_interest_and_trust\.sql$/.test(n))}`;

async function setup() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.directory_listings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE, name text, city text, status text DEFAULT 'unclaimed');
    CREATE TABLE public.businesses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text, plan text, pro_trial_ends_at timestamptz, license_number text,
      account_status text, is_published boolean, is_disabled boolean, marketplace_listed boolean, is_demo boolean, is_internal boolean);
    CREATE TABLE public.business_reviews(business_id uuid, rating int, status text);
    CREATE FUNCTION public.fn_plan_is_pro(p text, t timestamptz) RETURNS boolean LANGUAGE sql AS $$ SELECT p = 'pro' $$;
    CREATE FUNCTION public.fn_page_live(a text, p boolean, d boolean) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE FUNCTION public.fn_directory_html(t text) RETURNS text LANGUAGE sql AS $$ SELECT t $$;
    CREATE FUNCTION public.fn_rate_bucket_hit(k text, w interval, m int) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE FUNCTION public.fn_request_bucket() RETURNS text LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('test.ip', true), ''), 'ip1') $$;
    CREATE TABLE public.outbox(q text, p jsonb);
    CREATE FUNCTION public.enqueue_email(q text, p jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.outbox VALUES (q, p); RETURN 1; END $$;
    INSERT INTO public.directory_listings(slug, name, city) SELECT 'shop-' || i, 'Shop ' || i, 'Denver' FROM generate_series(1, 12) i;
    INSERT INTO public.directory_listings(slug, name, status) VALUES ('taken', 'Taken Co', 'claimed');`);
  await db.exec(readFileSync(file(), "utf8").replace(/--> statement-breakpoint/g, ""));
  await db.exec("GRANT USAGE ON SCHEMA public TO anon");
  return db;
}
const one = async (db: PGlite, sql: string, params: unknown[] = []) => (await db.query<Record<string, unknown>>(sql, params)).rows[0];
const signal = (db: PGlite, slug: string, email: string | null = null) => one(db, "SELECT public.fn_directory_referral_interest($1, $2) n", [slug, email]);

describe("referral interest", () => {
  it("counts one row per listing per visitor and adds a later email to the same row", async () => {
    const db = await setup();
    try {
      await db.exec("SET ROLE anon");
      expect((await one(db, "SELECT public.fn_directory_interest_count('shop-1') n")).n).toBe(0);
      expect((await signal(db, "shop-1")).n).toBe(1);
      expect((await signal(db, "shop-1", "a@b.co")).n).toBe(1);
      await db.exec("SET test.ip = 'ip2'");
      expect((await signal(db, "shop-1")).n).toBe(2);
      expect((await one(db, "SELECT public.fn_directory_interest_count('shop-1') n")).n).toBe(2);
      await expect(db.query("SELECT * FROM public.directory_referral_interest")).rejects.toThrow();
      await db.exec("RESET ROLE");
      expect((await one(db, "SELECT count(*)::int n FROM public.directory_referral_interest WHERE email = 'a@b.co'")).n).toBe(1);
    } finally { await db.close(); }
  }, 30000);

  it("limits a visitor to 10 new listings per day", async () => {
    const db = await setup();
    try {
      await db.exec("SET ROLE anon");
      for (let i = 1; i <= 10; i++) await signal(db, `shop-${i}`);
      await expect(signal(db, "shop-11")).rejects.toThrow(/rate_limited/);
      await db.exec("SET test.ip = 'ip9'");
      expect((await signal(db, "shop-11")).n).toBe(1);
    } finally { await db.close(); }
  }, 30000);

  it("emails the admin only on the first interest row and rejects claimed listings", async () => {
    const db = await setup();
    try {
      await signal(db, "shop-3");
      await db.exec("SET test.ip = 'ip2'");
      await signal(db, "shop-3");
      const mail = await one(db, "SELECT count(*)::int n, min(p->>'to') t FROM public.outbox");
      expect(mail).toEqual({ n: 1, t: "info@revvin.co" });
      await expect(signal(db, "taken")).rejects.toThrow(/not_found/);
    } finally { await db.close(); }
  }, 30000);
});
