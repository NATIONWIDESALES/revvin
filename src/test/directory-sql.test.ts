// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const OWNER = "11111111-1111-1111-1111-111111111111";
const migrationFile = () => {
  const f = readdirSync("drizzle/migrations").find((n) => /_marketplace_directory\.sql$/.test(n));
  return f ? `drizzle/migrations/${f}` : process.env.DIRECTORY_SQL ?? "/tmp/mig/dir.sql";
};

async function setup() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.role', true),'') $$;
    CREATE TABLE public.businesses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, name text, slug text UNIQUE, category text,
      city text, state text, country text, service_area text, latitude double precision, longitude double precision,
      plan text DEFAULT 'free', pro_trial_ends_at timestamptz, is_verified boolean DEFAULT false, offer_amount text, logo_url text,
      account_status text DEFAULT 'approved', is_published boolean DEFAULT true, is_disabled boolean DEFAULT false,
      marketplace_listed boolean DEFAULT true, is_demo boolean DEFAULT false, acquisition jsonb DEFAULT '{}',
      business_email text, stripe_customer_id text, phone text);
    CREATE FUNCTION public.fn_page_live(a text, p boolean, d boolean) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce(p,false) AND NOT coalesce(d,true) AND coalesce(a,'')='approved' $$;
    CREATE TABLE public.hits(k text PRIMARY KEY, n int);
    CREATE FUNCTION public.fn_rate_bucket_hit(pk text, w interval, m int) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
      DECLARE c int; BEGIN INSERT INTO public.hits VALUES (pk,1) ON CONFLICT (k) DO UPDATE SET n = hits.n + 1 RETURNING n INTO c; RETURN c <= m; END $$;
    CREATE FUNCTION public.fn_request_bucket() RETURNS text LANGUAGE sql AS $$ SELECT 'ip1' $$;
    CREATE TABLE public.outbox(q text, p jsonb);
    CREATE FUNCTION public.enqueue_email(q text, p jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.outbox VALUES (q,p); RETURN 1; END $$;
    INSERT INTO public.businesses(name, slug, category, city, state, country, latitude, longitude, plan, offer_amount, is_verified, user_id, business_email, stripe_customer_id) VALUES
      ('Zed Pro Roofing','zed-pro','Roofing','Denver','CO','US',39.7,-104.9,'pro','$250',true,'${OWNER}','owner@x.com','cus_1'),
      ('Alpha Plumbing','alpha','Plumbing','Denver','CO','US',39.8,-104.8,'free','$100',false,'${OWNER}',null,null),
      ('Home Realty','realty','Real Estate','Vancouver','BC','CA',49.2,-123.1,'free','$500',false,'${OWNER}',null,null),
      ('Demo Co','demo','Roofing','Denver','CO','US',39.7,-104.9,'free','$100',false,'${OWNER}',null,null),
      ('QA Test Plumbing','qa','Plumbing','Denver','CO','US',39.7,-104.9,'free','$100',false,'${OWNER}',null,null),
      ('No Place Co','noplace','HVAC',null,null,null,null,null,'free','$100',false,'${OWNER}',null,null);
    UPDATE public.businesses SET is_demo = true WHERE slug = 'demo';`);
  await db.exec(readFileSync(migrationFile(), "utf8").replace(/--> statement-breakpoint/g, ""));
  await db.exec(`GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;`);
  return db;
}
const rows = async (db: PGlite, sql: string, params: unknown[] = []) => (await db.query<Record<string, unknown>>(sql, params)).rows;
const importRows = (db: PGlite, list: unknown[]) => db.query(`SELECT public.fn_directory_import($1::jsonb) r`, [JSON.stringify(list)]);
const listing = (id: string, extra: Record<string, unknown> = {}) => ({ name: "Acme Roofing", category: "Roofing", city: "Denver", region: "CO", country: "US", latitude: 39.75, longitude: -104.95, source: "osm", source_id: id, source_license: "ODbL", ...extra });

describe("directory read functions", () => {
  it("orders Pro, then claimed, then unclaimed, then name, and excludes demo and internal", async () => {
    const db = await setup();
    try {
      await importRows(db, [listing("1"), listing("2", { name: "Aaa Electric" })]);
      await db.exec("SET ROLE anon");
      const r = await rows(db, "SELECT kind, slug, name FROM public.fn_directory_search()");
      expect(r.map((x) => x.name)).toEqual(["Zed Pro Roofing", "Alpha Plumbing", "Home Realty", "No Place Co", "Aaa Electric", "Acme Roofing"]);
      expect(r.map((x) => x.slug)).not.toContain("demo");
      expect(r.map((x) => x.slug)).not.toContain("qa");
      expect(r.slice(4).every((x) => x.kind === "listing")).toBe(true);
    } finally { await db.close(); }
  }, 30000);

  it("hides the reward for regulated categories", async () => {
    const db = await setup();
    try {
      await db.exec("SET ROLE anon");
      const [realty] = await rows(db, "SELECT has_reward, reward_text FROM public.fn_directory_search(p_q => 'Realty')");
      expect(realty).toEqual({ has_reward: false, reward_text: null });
      const [plumb] = await rows(db, "SELECT has_reward, reward_text FROM public.fn_directory_search(p_q => 'Alpha')");
      expect(plumb).toEqual({ has_reward: true, reward_text: "$100" });
      const reg = await rows(db, "SELECT public.fn_directory_regulated(c) r FROM unnest(ARRAY['Real Estate','real-estate','Mortgage','INSURANCE','Roofing']) c");
      expect(reg.map((x) => x.r)).toEqual([true, true, true, true, false]);
    } finally { await db.close(); }
  }, 30000);

  it("filters by bounding box, caps rows at 200 and never returns sensitive columns", async () => {
    const db = await setup();
    try {
      await importRows(db, Array.from({ length: 250 }, (_, i) => listing(`b${i}`, { name: `Shop ${i}` })));
      await db.exec("SET ROLE anon");
      const all = await rows(db, "SELECT * FROM public.fn_directory_search(p_limit => 1000)");
      expect(all.length).toBe(200);
      const cols = Object.keys(all[0]);
      for (const bad of ["user_id", "business_email", "stripe_customer_id", "phone", "id", "acquisition", "source_id"]) expect(cols).not.toContain(bad);
      const ca = await rows(db, "SELECT name FROM public.fn_directory_search(45, -130, 55, -120)");
      expect(ca.map((x) => x.name)).toEqual(["Home Realty"]);
      const one = await rows(db, "SELECT * FROM public.fn_directory_listing('shop-0-denver')");
      expect(Object.keys(one[0])).not.toContain("claimed_business_id");
      await expect(db.query("SELECT * FROM public.directory_listings")).rejects.toThrow(/permission denied/);
      await expect(db.query("SELECT * FROM public.fn_directory_search(95, 0, 96, 1)")).rejects.toThrow(/invalid_bbox/);
    } finally { await db.close(); }
  }, 30000);

  it("clusters at continental zoom and caps cluster rows at 400", async () => {
    const db = await setup();
    try {
      const spread = Array.from({ length: 900 }, (_, i) => listing(`c${i}`, { name: `Spot ${i}`, latitude: 25 + (i % 30), longitude: -125 + Math.floor(i / 30) * 2 }));
      await importRows(db, spread);
      await db.exec("SET ROLE anon");
      const low = await rows(db, "SELECT * FROM public.fn_directory_clusters(10, -170, 75, -50, 2)");
      expect(low.length).toBeLessThan(100);
      expect(low.reduce((n, c) => n + Number(c.count), 0)).toBe(903);
      const high = await rows(db, "SELECT * FROM public.fn_directory_clusters(10, -170, 75, -50, 12)");
      expect(high.length).toBe(400);
    } finally { await db.close(); }
  }, 30000);
});

describe("claim, removal and import", () => {
  it("links a claim only for the owner who signed up from that listing, then drops it from the directory", async () => {
    const db = await setup();
    try {
      await importRows(db, [listing("1")]);
      const [{ id }] = await rows(db, "SELECT id FROM public.businesses WHERE slug = 'alpha'");
      await db.exec(`SET test.uid = '${OWNER}'`);
      await expect(db.query("SELECT public.fn_directory_claim('acme-roofing-denver', $1)", [id])).rejects.toThrow(/code_mismatch/);
      await db.query(`UPDATE public.businesses SET acquisition = '{"landing_path":"/b/acme-roofing-denver"}' WHERE id = $1`, [id]);
      await db.exec(`SET test.uid = '22222222-2222-2222-2222-222222222222'`);
      await expect(db.query("SELECT public.fn_directory_claim('acme-roofing-denver', $1)", [id])).rejects.toThrow(/not_authorized/);
      await db.exec(`SET test.uid = '${OWNER}'`);
      await db.query("SELECT public.fn_directory_claim('acme-roofing-denver', $1)", [id]);
      const [l] = await rows(db, "SELECT status, claimed_business_id FROM public.directory_listings");
      expect(l).toEqual({ status: "claimed", claimed_business_id: id });
      const [view] = await rows(db, "SELECT status, claimed_slug, phone FROM public.fn_directory_listing('acme-roofing-denver')");
      expect(view).toEqual({ status: "claimed", claimed_slug: "alpha", phone: null });
      const names = (await rows(db, "SELECT name FROM public.fn_directory_search()")).map((x) => x.name);
      expect(names).not.toContain("Acme Roofing");
      await expect(db.query("SELECT public.fn_directory_claim('acme-roofing-denver', $1)", [id])).rejects.toThrow(/not_found/);
    } finally { await db.close(); }
  }, 30000);

  it("rate limits removal requests to three an hour and alerts info@revvin.co", async () => {
    const db = await setup();
    try {
      await importRows(db, [listing("1")]);
      await db.exec("SET ROLE anon");
      const ask = () => db.query("SELECT public.fn_directory_request_removal('acme-roofing-denver', 'Pat <b>', 'pat@example.com', 'Closed')");
      await ask(); await ask(); await ask();
      await expect(ask()).rejects.toThrow(/rate_limited/);
      await db.exec("RESET ROLE");
      expect((await rows(db, "SELECT count(*)::int n FROM public.directory_removal_requests"))[0].n).toBe(3);
      const mail = await rows(db, "SELECT p FROM public.outbox");
      expect(mail.length).toBe(3);
      const p = mail[0].p as Record<string, string>;
      expect(p.to).toBe("info@revvin.co");
      expect(p.html).toContain("Pat &lt;b&gt;");
    } finally { await db.close(); }
  }, 30000);

  it("upserts on source and source id with unique slugs, and only for the service role", async () => {
    const db = await setup();
    try {
      const first = await importRows(db, [listing("1"), listing("2"), listing("3", { name: "Alpha", city: "" })]);
      expect((first.rows[0] as { r: unknown }).r).toEqual({ inserted: 3, updated: 0 });
      const again = await importRows(db, [listing("1", { phone: "555" })]);
      expect((again.rows[0] as { r: unknown }).r).toEqual({ inserted: 0, updated: 1 });
      const slugs = (await rows(db, "SELECT slug FROM public.directory_listings ORDER BY slug")).map((x) => x.slug);
      expect(slugs).toEqual(["acme-roofing-denver", "acme-roofing-denver-2", "alpha-2"]);
      await db.exec("SET ROLE authenticated");
      await expect(importRows(db, [listing("9")])).rejects.toThrow(/permission denied/);
    } finally { await db.close(); }
  }, 30000);
});

const chainMigration = () => {
  const f = readdirSync("drizzle/migrations").find((n) => /_directory_hide_chains_distance_sort\.sql$/.test(n));
  return readFileSync(`drizzle/migrations/${f}`, "utf8").replace(/--> statement-breakpoint/g, "");
};

async function setupChains() {
  const db = await setup();
  await db.exec(`ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_internal boolean DEFAULT false;
    CREATE OR REPLACE FUNCTION public.fn_plan_is_pro(p text, t timestamptz) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT p = 'pro' OR t > now() $$;
    CREATE OR REPLACE FUNCTION public.similarity(a text, b text) RETURNS real LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN a = b THEN 1 ELSE 0.5 END::real $$;
    CREATE OR REPLACE FUNCTION public.fn_directory_business_rows() RETURNS TABLE(kind text, slug text, name text, category text, city text, region text, country text, lat double precision, lng double precision, is_pro boolean, is_verified boolean, has_reward boolean, reward_text text, logo_url text, rank integer)
      LANGUAGE sql STABLE AS $$ SELECT 'business'::text, b.slug, b.name, b.category, b.city, b.state, b.country, b.latitude, b.longitude, b.plan = 'pro', false, false, NULL::text, NULL::text, 1 FROM public.businesses b WHERE false $$;`);
  await db.exec(chainMigration());
  return db;
}

describe("chain and franchise hiding", () => {
  it("hides brand matches and names repeated five times from map search and the homepage count", async () => {
    const db = await setupChains();
    try {
      await importRows(db, [
        listing("j1", { name: "1-800-GOT-JUNK?" }),
        ...Array.from({ length: 5 }, (_, i) => listing(`r${i}`, { name: "Acme Local Chain", latitude: 39.7 + i / 100 })),
        listing("ok", { name: "Bob's Roofing" }),
      ]);
      const reasons = await rows(db, "SELECT name, chain_reason FROM public.directory_listings WHERE is_chain ORDER BY name");
      expect(reasons.find((r) => r.name === "1-800-GOT-JUNK?")?.chain_reason).toBe("brand");
      expect(reasons.filter((r) => r.chain_reason === "name_repeat").length).toBe(5);
      await db.exec("SET ROLE anon");
      const r = await rows(db, "SELECT name, total_count FROM public.fn_directory_map_search(39, -106, 41, -104)");
      expect(r.map((x) => x.name)).toEqual(["Bob's Roofing"]);
      expect(Number(r[0].total_count)).toBe(1);
      const [{ n }] = await rows(db, "SELECT public.fn_directory_public_count()::int n");
      await db.exec("RESET ROLE");
      const live = (await rows(db, "SELECT count(*)::int c FROM public.businesses WHERE public.fn_page_live(account_status, is_published, is_disabled) AND NOT coalesce(is_demo,false) AND NOT coalesce(is_internal,false) AND slug IS NOT NULL"))[0].c as number;
      expect(n).toBe(live + 1);
    } finally { await db.close(); }
  }, 30000);

  it("never hides a claimed listing even with a chain name", async () => {
    const db = await setupChains();
    try {
      await importRows(db, [listing("j1", { name: "Minute Key" })]);
      const [{ id }] = await rows(db, "SELECT id FROM public.businesses WHERE slug = 'alpha'");
      await db.query("UPDATE public.directory_listings SET status = 'claimed', claimed_business_id = $1", [id]);
      await db.query("SELECT public.fn_directory_flag_chains()");
      const [l] = await rows(db, "SELECT is_chain, chain_reason FROM public.directory_listings");
      expect(l).toEqual({ is_chain: false, chain_reason: null });
    } finally { await db.close(); }
  }, 30000);
});
