// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const file = () => `drizzle/migrations/${readdirSync("drizzle/migrations").find((n) => /_marketplace_earn_mode_and_reward_alerts\.sql$/.test(n))}`;

async function setup() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.biz(slug text, name text, category text, city text, lat double precision, lng double precision, reward text);
    CREATE FUNCTION public.fn_directory_regulated(c text) RETURNS boolean LANGUAGE sql AS $$ SELECT lower(coalesce(c,'')) IN ('real estate','mortgage','insurance') $$;
    CREATE FUNCTION public.fn_directory_business_rows() RETURNS TABLE(kind text, slug text, name text, category text, city text, region text, country text,
      lat double precision, lng double precision, is_pro boolean, is_verified boolean, has_reward boolean, reward_text text, logo_url text, rank int)
      LANGUAGE sql AS $$ SELECT 'business', slug, name, category, city, 'CO', 'US', lat, lng, false, false,
        (NOT public.fn_directory_regulated(category) AND reward IS NOT NULL), CASE WHEN public.fn_directory_regulated(category) THEN NULL ELSE reward END, null, 1 FROM public.biz $$;
    CREATE TABLE public.directory_listings(city text, latitude double precision, longitude double precision);
    INSERT INTO public.directory_listings VALUES ('Denver', 39.74, -104.99), ('Boulder', 40.01, -105.27);
    CREATE FUNCTION public.fn_directory_html(t text) RETURNS text LANGUAGE sql AS $$ SELECT t $$;
    CREATE FUNCTION public.fn_rate_bucket_hit(k text, w interval, m int) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE FUNCTION public.fn_request_bucket() RETURNS text LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('test.ip', true), ''), 'ip1') $$;
    CREATE TABLE public.outbox(q text, p jsonb);
    CREATE FUNCTION public.enqueue_email(q text, p jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.outbox VALUES (q, p); RETURN 1; END $$;
    INSERT INTO public.biz VALUES
      ('near-100','Near 100','Plumbing','Denver',39.74,-104.99,'$100'),
      ('far-500','Far 500','Roofing','Denver',39.90,-104.70,'$500'),
      ('mid-1000','Mid 1000','HVAC','Denver',39.80,-104.90,'1,000'),
      ('gift','Gift Co','Cleaning','Denver',39.741,-104.991,'Gift card'),
      ('realty','Realty','Real Estate','Denver',39.74,-104.99,'$9000'),
      ('none','No Reward','Plumbing','Denver',39.74,-104.99,null);`);
  await db.exec(readFileSync(file(), "utf8").replace(/--> statement-breakpoint/g, ""));
  await db.exec("GRANT USAGE ON SCHEMA public TO anon; SET ROLE anon");
  return db;
}
const rows = async (db: PGlite, sql: string, params: unknown[] = []) => (await db.query<Record<string, unknown>>(sql, params)).rows;
const alert = (db: PGlite, email: string, lat = 39.7392, lng = -104.9903) => rows(db, "SELECT public.fn_marketplace_reward_alert($1, $2, $3, 'Plumbing') r", [email, lat, lng]);

describe("earn mode search", () => {
  it("orders by highest dollar reward, non-dollar rewards after, then distance, and never includes regulated trades", async () => {
    const db = await setup();
    try {
      const r = await rows(db, "SELECT slug FROM public.fn_directory_earn_search(39, -106, 41, -104)");
      expect(r.map((x) => x.slug)).toEqual(["mid-1000", "far-500", "near-100", "gift"]);
      const near = await rows(db, "SELECT slug FROM public.fn_directory_earn_search(p_lat => 39.74, p_lng => -104.99, p_order => 'distance', p_limit => 5)");
      expect(near.map((x) => x.slug)).toEqual(["near-100", "gift", "mid-1000", "far-500"]);
    } finally { await db.close(); }
  }, 30000);
});

describe("reward alert signup", () => {
  it("is unique per email and rounded spot, case-insensitive, and stores the nearest city", async () => {
    const db = await setup();
    try {
      const [a] = await alert(db, "Me@x.co");
      expect(a.r).toMatchObject({ ok: true, city: "Denver", duplicate: false });
      const [b] = await alert(db, "me@x.co", 39.7401, -104.9899);
      expect(b.r).toMatchObject({ duplicate: true });
      await db.exec("RESET ROLE");
      expect((await rows(db, "SELECT count(*)::int n FROM public.marketplace_reward_alerts"))[0].n).toBe(1);
      expect((await rows(db, "SELECT count(*)::int n FROM public.outbox WHERE p->>'to' = 'info@revvin.co'"))[0].n).toBe(1);
      await db.exec("SET ROLE anon");
      await expect(db.query("SELECT * FROM public.marketplace_reward_alerts")).rejects.toThrow();
    } finally { await db.close(); }
  }, 30000);

  it("allows 5 signups per visitor per day and emails the admin only for the first signup in a city", async () => {
    const db = await setup();
    try {
      for (let i = 0; i < 5; i++) await alert(db, `p${i}@x.co`);
      await expect(alert(db, "p6@x.co")).rejects.toThrow(/rate_limited/);
      await db.exec("SET test.ip = 'ip2'");
      await alert(db, "other@x.co", 40.01, -105.27);
      await db.exec("RESET ROLE");
      const mail = await rows(db, "SELECT p->>'subject' s FROM public.outbox ORDER BY s");
      expect(mail.map((m) => m.s)).toEqual(["First reward alert signup: Boulder", "First reward alert signup: Denver"]);
    } finally { await db.close(); }
  }, 30000);
});
