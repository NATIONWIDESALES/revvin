// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const files = () => readdirSync("drizzle/migrations").filter((n) => /_(marketplace_quote_broadcasts|quote_candidates_pro_order_fix)\.sql$/.test(n)).sort().map((n) => `drizzle/migrations/${n}`);
// Denver centre; about 1 km per 0.009 degrees of latitude.
const LAT = 39.74, LNG = -104.99;

async function setup() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT null::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT null::text $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
    CREATE TYPE public.app_role AS ENUM ('admin');
    CREATE FUNCTION public.has_role(u uuid, r public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE TABLE public.businesses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text, name text, category text, city text, state text, service_area text,
      latitude double precision, longitude double precision, plan text DEFAULT 'free', pro_trial_ends_at timestamptz, business_email text,
      account_status text DEFAULT 'approved', is_published boolean DEFAULT true, is_disabled boolean DEFAULT false,
      marketplace_listed boolean DEFAULT true, is_demo boolean DEFAULT false, is_internal boolean DEFAULT false);
    CREATE TABLE public.business_reviews(business_id uuid, rating int, status text);
    CREATE TABLE public.directory_listings(slug text, name text, city text, region text, phone text, website text, category text,
      latitude double precision, longitude double precision, status text DEFAULT 'unclaimed', is_chain boolean DEFAULT false);
    CREATE TABLE public.quote_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id),
      name text NOT NULL, email text NOT NULL, phone text, message text, created_at timestamptz DEFAULT now(), status text DEFAULT 'new');
    CREATE FUNCTION public.fn_plan_is_pro(p text, t timestamptz) RETURNS boolean LANGUAGE sql AS $$ SELECT p = 'pro' OR t > now() $$;
    CREATE FUNCTION public.fn_page_live(a text, p boolean, d boolean) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(p,false) AND NOT coalesce(d,true) AND a = 'approved' $$;
    CREATE FUNCTION public.fn_directory_regulated(c text) RETURNS boolean LANGUAGE sql AS $$ SELECT lower(coalesce(c,'')) IN ('real estate','mortgage','insurance') $$;
    CREATE FUNCTION public.fn_directory_html(t text) RETURNS text LANGUAGE sql AS $$ SELECT t $$;
    CREATE FUNCTION public.fn_rate_bucket_hit(k text, w interval, m int) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE TABLE public.outbox(q text, p jsonb);
    CREATE FUNCTION public.enqueue_email(q text, p jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.outbox VALUES (q, p); RETURN 1; END $$;
    INSERT INTO public.businesses(slug, name, category, latitude, longitude, plan, business_email) VALUES
      ('near-free', 'Near Free', 'HVAC', ${LAT + 0.01}, ${LNG}, 'free', 'a@x.co'),
      ('mid-reviewed', 'Mid Reviewed', 'HVAC', ${LAT + 0.1}, ${LNG}, 'free', 'b@x.co'),
      ('far-pro', 'Far Pro', 'HVAC', ${LAT + 0.4}, ${LNG}, 'pro', 'c@x.co'),
      ('very-near', 'Very Near', 'HVAC', ${LAT}, ${LNG}, 'free', 'd@x.co'),
      ('too-far', 'Too Far Pro', 'HVAC', ${LAT + 0.6}, ${LNG}, 'pro', 'e@x.co'),
      ('wrong-trade', 'Plumber', 'Plumbing', ${LAT}, ${LNG}, 'pro', 'f@x.co');
    INSERT INTO public.business_reviews SELECT id, 5, 'published' FROM public.businesses WHERE slug = 'mid-reviewed';`);
  for (const f of files()) await db.exec(readFileSync(f, "utf8").replace(/--> statement-breakpoint/g, ""));
  return db;
}
const rows = async (db: PGlite, sql: string, params: unknown[] = []) => (await db.query<Record<string, unknown>>(sql, params)).rows;
const req = (over: Record<string, unknown> = {}) => ({
  trade: "HVAC", details: "Furnace makes a loud banging noise when it starts", city: "Denver", lat: LAT, lng: LNG,
  name: "Pat", email: "pat@example.com", phone: null, timing: "asap", slugs: [], share_later: false, visitor_hash: "visitor-aaaa", ...over,
});
const submit = (db: PGlite, body: Record<string, unknown>) => rows(db, "SELECT public.fn_quote_broadcast_submit($1::jsonb) r", [JSON.stringify(body)]);

describe("marketplace quote matching", () => {
  it("puts Pro first, then reviewed, then nearest, cuts off at 60 km and returns at most 3", async () => {
    const db = await setup();
    try {
      const r = await rows(db, `SELECT slug, km FROM public.fn_quote_match_preview('HVAC', ${LAT}, ${LNG})`);
      expect(r.map((x) => x.slug)).toEqual(["far-pro", "mid-reviewed", "very-near"]);
      expect(r.map((x) => x.slug)).not.toContain("too-far");
      expect(r.every((x) => Number(x.km) <= 60)).toBe(true);
      expect(await rows(db, `SELECT slug FROM public.fn_quote_match_preview('Mortgage', ${LAT}, ${LNG})`)).toEqual([]);
    } finally { await db.close(); }
  }, 30000);

  it("sends only to ticked matched businesses, with a dashboard row, the marketplace line and a visitor confirmation", async () => {
    const db = await setup();
    try {
      const [{ r }] = await submit(db, req({ slugs: ["far-pro", "very-near", "wrong-trade"] }));
      expect((r as { sent: { slug: string }[] }).sent.map((s) => s.slug).sort()).toEqual(["far-pro", "very-near"]);
      const q = await rows(db, "SELECT b.slug FROM public.quote_requests q JOIN public.businesses b ON b.id = q.business_id ORDER BY 1");
      expect(q.map((x) => x.slug)).toEqual(["far-pro", "very-near"]);
      const mail = await rows(db, "SELECT p->>'to' t, p->>'text' x, p->>'subject' s FROM public.outbox");
      expect(mail.filter((m) => String(m.x).includes("Up to 2 other local businesses")).map((m) => m.t).sort()).toEqual(["c@x.co", "d@x.co"]);
      expect(mail.some((m) => m.t === "pat@example.com")).toBe(true);
      const admin = mail.find((m) => m.t === "info@revvin.co")!;
      expect(String(admin.s)).not.toContain("pat@example.com");
      expect(String(admin.x)).not.toContain("pat@example.com");
    } finally { await db.close(); }
  }, 30000);
});

describe("no-match path", () => {
  it("stores nothing without consent", async () => {
    const db = await setup();
    try {
      await expect(submit(db, req({ trade: "Roofing" }))).rejects.toThrow(/nothing_to_send/);
      expect((await rows(db, "SELECT count(*)::int n FROM public.marketplace_quote_broadcasts"))[0].n).toBe(0);
      expect((await rows(db, "SELECT count(*)::int n FROM public.outbox"))[0].n).toBe(0);
    } finally { await db.close(); }
  }, 30000);

  it("with consent, a later Roofing business that publishes nearby receives it and the visitor is told", async () => {
    const db = await setup();
    try {
      const [{ r }] = await submit(db, req({ trade: "Roofing", share_later: true }));
      expect(r).toMatchObject({ ok: true, saved: true, sent: [] });
      await db.exec(`INSERT INTO public.businesses(slug, name, category, latitude, longitude, business_email, is_published)
        VALUES ('new-roof', 'New Roof', 'Roofing', ${LAT + 0.05}, ${LNG}, 'roof@x.co', false)`);
      expect((await rows(db, "SELECT count(*)::int n FROM public.quote_requests"))[0].n).toBe(0);
      await db.exec("UPDATE public.businesses SET is_published = true WHERE slug = 'new-roof'");
      const q = await rows(db, "SELECT q.email FROM public.quote_requests q JOIN public.businesses b ON b.id = q.business_id WHERE b.slug = 'new-roof'");
      expect(q).toEqual([{ email: "pat@example.com" }]);
      const told = await rows(db, "SELECT count(*)::int n FROM public.outbox WHERE p->>'to' = 'pat@example.com' AND p->>'label' = 'quote_broadcast_later_delivery'");
      expect(told[0].n).toBe(1);
      // A far-away roofer does not get it.
      await db.exec(`INSERT INTO public.businesses(slug, name, category, latitude, longitude) VALUES ('far-roof', 'Far Roof', 'Roofing', ${LAT + 1}, ${LNG})`);
      expect((await rows(db, "SELECT count(*)::int n FROM public.quote_requests"))[0].n).toBe(1);
    } finally { await db.close(); }
  }, 30000);
});

describe("rate limit", () => {
  it("allows 3 requests per visitor per day", async () => {
    const db = await setup();
    try {
      for (let i = 0; i < 3; i++) await submit(db, req({ slugs: ["very-near"], email: `p${i}@example.com` }));
      await expect(submit(db, req({ slugs: ["very-near"] }))).rejects.toThrow(/rate_limited/);
      await submit(db, req({ slugs: ["very-near"], visitor_hash: "visitor-bbbb" }));
    } finally { await db.close(); }
  }, 30000);
});
