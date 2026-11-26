// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { migrationFunctions } from "./helpers/migrationFunctions";

const OWNER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const ADMIN = "99999999-9999-9999-9999-999999999999";
const migrations = ["0069_business_ownership_status_and_marketplace_rules.sql", "0070_ownership_domain_codes_and_documents.sql", "0071_ownership_disputes_and_admin_review.sql", "0072_ownership_code_attempts_persist.sql"];

async function setup() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions;
    CREATE FUNCTION extensions.digest(value text,algorithm text) RETURNS bytea LANGUAGE sql IMMUTABLE AS $$ SELECT decode(md5(value),'hex') $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.role',true),'') $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{"aal":"aal2"}'::jsonb $$;
    CREATE TYPE public.app_role AS ENUM ('admin');
    CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT u = '${ADMIN}' $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
    INSERT INTO auth.users VALUES ('${OWNER}','owner@acme.test',now()),('${OTHER}','person@gmail.com',now()),('${ADMIN}','admin@revvin.co',now()),('33333333-3333-3333-3333-333333333333','owner@existing.test',now());
    CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
    CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(name,'/') $$;
    CREATE TABLE public.businesses(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,name text NOT NULL,slug text UNIQUE,category text DEFAULT 'HVAC',description text,
      city text DEFAULT 'Denver',state text DEFAULT 'CO',country text DEFAULT 'US',service_area text,latitude double precision DEFAULT 39.74,longitude double precision DEFAULT -104.99,
      plan text DEFAULT 'free',pro_trial_ends_at timestamptz,offer_amount text DEFAULT '$100',logo_url text,cover_image_url text,website text,phone text,
      google_review_url text,hours jsonb,services text[],founded_year int,license_number text,social_links jsonb,
      is_verified boolean DEFAULT false,verified boolean DEFAULT false,index_approved boolean DEFAULT false,account_status text DEFAULT 'approved',
      is_published boolean DEFAULT true,is_disabled boolean DEFAULT false,marketplace_listed boolean DEFAULT true,is_demo boolean DEFAULT false,is_internal boolean DEFAULT false,
      subscription_status text DEFAULT 'none',stripe_customer_id text,stripe_subscription_id text,stripe_connected_account_id text,stripe_connect_status text,
      launch_package_status text,current_period_end timestamptz,
      acquisition jsonb DEFAULT '{}',business_email text,created_at timestamptz DEFAULT now());
    CREATE TABLE public.directory_listings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),slug text UNIQUE,name text,city text,region text,country text DEFAULT 'US',phone text,website text,category text DEFAULT 'HVAC',
      latitude double precision DEFAULT 39.74,longitude double precision DEFAULT -104.99,status text DEFAULT 'unclaimed',is_chain boolean DEFAULT false,claimed_business_id uuid);
    CREATE TABLE public.business_reviews(id uuid DEFAULT gen_random_uuid(),business_id uuid,rating int,status text);
    CREATE TABLE public.business_photos(id uuid DEFAULT gen_random_uuid(),business_id uuid,storage_path text,caption text,sort_order int DEFAULT 0,created_at timestamptz DEFAULT now());
    CREATE TABLE public.marketplace_quote_broadcasts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),trade text,lat double precision,lng double precision,share_later_consent boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),matched_count int DEFAULT 0,email text,name text);
    CREATE TABLE public.quote_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),business_id uuid,broadcast_id uuid);
    CREATE TABLE public.outbox(q text,p jsonb);
    CREATE FUNCTION public.enqueue_email(q text,p jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.outbox VALUES(q,p); RETURN 1; END $$;
    CREATE FUNCTION public.fn_page_live(a text,p boolean,d boolean) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce(p,false) AND NOT coalesce(d,true) AND a='approved' $$;
    CREATE FUNCTION public.fn_plan_is_pro(p text,t timestamptz) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT p='pro' OR t>now() $$;
    CREATE FUNCTION public.fn_directory_country(c text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT c $$;
    CREATE FUNCTION public.fn_directory_regulated(c text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT lower(coalesce(c,'')) IN ('real estate','mortgage','insurance') $$;
    CREATE FUNCTION public.fn_directory_html(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce(t,'') $$;
    CREATE FUNCTION public.fn_quote_km(a double precision,b double precision,c double precision,d double precision) RETURNS double precision LANGUAGE sql IMMUTABLE AS $$ SELECT sqrt(power(a-c,2)+power(b-d,2))*111 $$;
    CREATE FUNCTION public.fn_quote_deliver_one(m uuid,b uuid) RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.quote_requests(business_id,broadcast_id) VALUES(b,m); RETURN true; END $$;
    CREATE FUNCTION public.fn_reward_dollars(t text) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT nullif(regexp_replace(coalesce(t,''),'[^0-9.]','','g'),'')::numeric $$;
    INSERT INTO public.businesses(user_id,name,slug,website,business_email) VALUES('33333333-3333-3333-3333-333333333333','Existing Business','existing','https://existing.test','owner@existing.test');`);
  for (const file of migrations) await db.exec(readFileSync(`drizzle/migrations/${file}`, "utf8").replace(/--> statement-breakpoint/g, ""));
  const functions = migrationFunctions();
  await db.exec(functions.get("fn_directory_earn_search")!);
  await db.exec(functions.get("prevent_business_privileged_updates")!);
  await db.exec(functions.get("prevent_status_self_approval")!);
  await db.exec(`CREATE TRIGGER trg_guard_is_verified BEFORE INSERT OR UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.fn_guard_is_verified();
    CREATE TRIGGER trg_prevent_business_privileged_updates BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.prevent_business_privileged_updates();
    CREATE TRIGGER trg_prevent_status_self_approval BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.prevent_status_self_approval();
    GRANT USAGE ON SCHEMA public,auth,storage,extensions TO anon,authenticated,service_role;
    SET test.role='authenticated'; SET test.uid='${OWNER}';`);
  return db;
}

const rows = async (db: PGlite, sql: string, params: unknown[] = []) => (await db.query<Record<string, any>>(sql, params)).rows;
const asUser = async (db: PGlite, uid: string) => db.exec(`SET test.role='authenticated'; SET test.uid='${uid}'`);
const addBusiness = async (db: PGlite, slug: string, uid = OWNER, website: string | null = "https://acme.test") => {
  await db.query(`INSERT INTO public.businesses(user_id,name,slug,website,business_email) VALUES($1,$2,$3,$4,$5)`, [uid, slug, slug, website, `owner@${slug}.test`]);
  return (await rows(db, `SELECT id FROM public.businesses WHERE slug='${slug}'`))[0].id as string;
};

 describe("ownership marketplace and quote gates", () => {
  it("backfills existing businesses and excludes pending businesses from quote candidates and Earn search", async () => {
    const db = await setup();
    try {
      expect((await rows(db, "SELECT ownership_status,ownership_method,is_verified FROM public.businesses WHERE slug='existing'"))[0]).toEqual({ ownership_status: "verified", ownership_method: "grandfathered", is_verified: true });
      await addBusiness(db, "pending-shop");
      const candidates = await rows(db, "SELECT slug FROM public.fn_quote_candidates('HVAC',39.74,-104.99)");
      expect(candidates.map((r) => r.slug)).toEqual(["existing"]);
      const earn = await rows(db, "SELECT slug FROM public.fn_directory_earn_search()");
      expect(earn.map((r) => r.slug)).toEqual(["existing"]);
      const ranked = await rows(db, "SELECT slug,is_verified,has_reward,rank FROM public.fn_directory_business_rows() ORDER BY slug");
      expect(ranked.find((r) => r.slug === "pending-shop")).toMatchObject({ is_verified: false, has_reward: false, rank: 2 });
      await db.exec("INSERT INTO public.marketplace_quote_broadcasts(trade,lat,lng,share_later_consent,email,name) VALUES('HVAC',39.74,-104.99,true,'pat@example.com','Pat')");
      expect((await rows(db, "SELECT public.fn_quote_deliver_saved(id) n FROM public.businesses WHERE slug='pending-shop'"))[0].n).toBe(0);
      expect((await rows(db, "SELECT count(*)::int n FROM public.quote_requests q JOIN public.businesses b ON b.id=q.business_id WHERE b.slug='pending-shop'"))[0].n).toBe(0);
      expect((await rows(db, "SELECT public.fn_quote_deliver_saved(id) n FROM public.businesses WHERE slug='existing'"))[0].n).toBe(1);
    } finally { await db.close(); }
  }, 30000);
});

describe("domain and email code verification", () => {
  it("auto-verifies a matching confirmed domain email, never gmail or a shared host", async () => {
    const db = await setup();
    try {
      await addBusiness(db, "domain-match");
      expect((await rows(db, "SELECT public.fn_ownership_auto_verify(id) ok FROM public.businesses WHERE slug='domain-match'"))[0].ok).toBe(true);
      expect((await rows(db, "SELECT ownership_status,ownership_method FROM public.businesses WHERE slug='domain-match'"))[0]).toEqual({ ownership_status: "verified", ownership_method: "domain_email" });
      await asUser(db, OTHER);
      await addBusiness(db, "gmail-user", OTHER, "https://acme.test");
      expect((await rows(db, "SELECT public.fn_ownership_auto_verify(id) ok FROM public.businesses WHERE slug='gmail-user'"))[0].ok).toBe(false);
      expect((await rows(db, "SELECT public.fn_ownership_registrable_domain('person@gmail.com') d"))[0].d).toBeNull();
      expect((await rows(db, "SELECT public.fn_ownership_registrable_domain('shop.wixsite.com') d"))[0].d).toBeNull();
    } finally { await db.close(); }
  }, 30000);

  it("counts wrong attempts, enforces expiry and succeeds with the correct code", async () => {
    const db = await setup();
    try {
      await addBusiness(db, "code-shop");
      const send = () => db.query("SELECT public.fn_ownership_send_code('owner@acme.test')");
      await send();
      let mail = (await rows(db, "SELECT p->>'text' text FROM public.outbox WHERE p->>'label'='ownership_email_code' ORDER BY ctid DESC LIMIT 1"))[0];
      const first = String(mail.text).match(/\b(\d{6})\b/)![1];
      const wrong = first === "000000" ? "000001" : "000000";
      for (let i = 0; i < 5; i++) expect((await rows(db, `SELECT public.fn_ownership_verify_code('${wrong}') ok`))[0].ok).toBe(false);
      expect((await rows(db, "SELECT attempts,consumed_at IS NOT NULL consumed FROM public.ownership_email_codes"))[0]).toEqual({ attempts: 5, consumed: true });
      await send();
      await db.exec("UPDATE public.ownership_email_codes SET expires_at=now()-interval '1 second' WHERE consumed_at IS NULL");
      await expect(db.query(`SELECT public.fn_ownership_verify_code('${first}')`)).rejects.toThrow(/code_expired/);
      await send();
      mail = (await rows(db, "SELECT p->>'text' text FROM public.outbox WHERE p->>'label'='ownership_email_code' ORDER BY ctid DESC LIMIT 1"))[0];
      const third = String(mail.text).match(/\b(\d{6})\b/)![1];
      await expect(send()).rejects.toThrow(/rate_limited/);
      expect((await rows(db, `SELECT public.fn_ownership_verify_code('${third}') ok`))[0].ok).toBe(true);
      expect((await rows(db, "SELECT ownership_status,ownership_method FROM public.businesses WHERE slug='code-shop'"))[0]).toEqual({ ownership_status: "verified", ownership_method: "domain_email" });
      await expect(send()).rejects.toThrow(/not_available/);
      expect((await rows(db, "SELECT count(*)::int n FROM public.ownership_email_codes WHERE code_hash ~ '^[0-9]{6}$'"))[0].n).toBe(0);
    } finally { await db.close(); }
  }, 30000);

  it("uses the claimed listing domain, not a claimant-controlled website, and locks it while pending", async () => {
    const db = await setup();
    try {
      const id = await addBusiness(db, "listing-domain", OWNER, "https://attacker.test");
      await db.query(`INSERT INTO public.directory_listings(slug,name,website,status,claimed_business_id) VALUES('real-listing','Real Listing','https://real-business.test','claimed',$1)`, [id]);
      await expect(db.query("SELECT public.fn_ownership_send_code('owner@attacker.test')")).rejects.toThrow(/domain_mismatch/);
      await expect(db.query("UPDATE public.businesses SET website='https://other-attacker.test' WHERE id=$1", [id])).rejects.toThrow(/website_locked_until_verified/);
      expect((await rows(db, "SELECT public.fn_ownership_send_code('owner@real-business.test') ok"))[0].ok).toBe(true);
    } finally { await db.close(); }
  }, 30000);
});

describe("review and dispute outcomes", () => {
  it("rejects a document claim, keeps the account and releases the listing", async () => {
    const db = await setup();
    try {
      const id = await addBusiness(db, "reject-shop");
      await db.query(`INSERT INTO public.directory_listings(slug,name,status,claimed_business_id) VALUES('reject-listing','Reject Shop','claimed',$1)`, [id]);
      const request = (await rows(db, `INSERT INTO public.ownership_verification_requests(business_id,file_path) VALUES('${id}','${id}/00000000-0000-0000-0000-000000000000.pdf') RETURNING id`))[0].id;
      await asUser(db, ADMIN);
      expect((await rows(db, `SELECT public.fn_admin_ownership_review('${request}','rejected','Documents do not match') ok`))[0].ok).toBe(true);
      expect((await rows(db, "SELECT ownership_status FROM public.businesses WHERE id=$1", [id]))[0].ownership_status).toBe("rejected");
      expect((await rows(db, "SELECT status,claimed_business_id FROM public.directory_listings WHERE claimed_business_id=$1 OR slug='reject-listing'", [id]))[0]).toEqual({ status: "unclaimed", claimed_business_id: null });
      expect((await rows(db, "SELECT count(*)::int n FROM public.businesses WHERE id=$1", [id]))[0].n).toBe(1);
    } finally { await db.close(); }
  }, 30000);

  it("freezes only pending or grandfathered claims when a dispute is filed", async () => {
    const db = await setup();
    try {
      const dispute = (slug: string, hash: string) => db.query("SELECT public.fn_ownership_file_dispute($1,'Pat','Owner','pat@example.com','','Someone else claimed this business',NULL,$2)", [slug, hash]);
      await dispute("existing", "aaaaaaaaaaaaaaaaaaaaaaaa");
      expect((await rows(db, "SELECT ownership_status FROM public.businesses WHERE slug='existing'"))[0].ownership_status).toBe("disputed");
      await addBusiness(db, "pending-dispute");
      await dispute("pending-dispute", "bbbbbbbbbbbbbbbbbbbbbbbb");
      expect((await rows(db, "SELECT ownership_status FROM public.businesses WHERE slug='pending-dispute'"))[0].ownership_status).toBe("disputed");
      const id = await addBusiness(db, "domain-dispute");
      await db.exec(`SET test.role='service_role'; SET test.uid=''; UPDATE public.businesses SET ownership_status='verified',ownership_method='domain_email',ownership_verified_at=now(),is_verified=true,verified=true WHERE id='${id}'; SET test.role='authenticated'; SET test.uid='${OWNER}';`);
      await dispute("domain-dispute", "cccccccccccccccccccccccc");
      expect((await rows(db, "SELECT ownership_status FROM public.businesses WHERE slug='domain-dispute'"))[0].ownership_status).toBe("verified");
    } finally { await db.close(); }
  }, 30000);
});
