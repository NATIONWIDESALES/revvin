// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
let db: PGlite;
const owner = "00000000-0000-4000-8000-000000000001";
const business = "00000000-0000-4000-8000-000000000002";
const existing = "00000000-0000-4000-8000-000000000003";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${owner}'::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated'::text $$;
    CREATE TABLE auth.users(id uuid,raw_user_meta_data jsonb);
    CREATE TABLE public.businesses(id uuid PRIMARY KEY,user_id uuid,name text,category text,industry text,offer_amount text,plan text DEFAULT 'free',is_demo boolean DEFAULT false);
    CREATE TABLE public.referral_contacts(id uuid PRIMARY KEY,business_id uuid,created_at timestamptz DEFAULT now());
    CREATE TABLE public.referral_contact_sends(business_id uuid,contact_id uuid);
    CREATE TABLE public.funnel_events(event text,path text,meta jsonb);
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public.fn_rate_bucket_hit(text,interval,integer) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    INSERT INTO auth.users VALUES('${owner}','{"acquisition":{"utm_source":"facebook","email":"private"},"preview_trade":"Roofing","preview_reward":"250"}');
    INSERT INTO public.businesses(id,user_id,name) VALUES('${existing}','${owner}','Existing');`);
  await db.exec(readFileSync("drizzle/migrations/0007_acquisition_pro_trial.sql", "utf8"));
  await db.exec(`CREATE TRIGGER contact_limit BEFORE INSERT ON public.referral_contacts FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_free_contact_limit();
    INSERT INTO public.businesses(id,user_id,name) VALUES('${business}','${owner}','Acme');`);
}, 30000);
afterAll(async () => { await db.close(); });
describe("3 and 4. live migration in isolated PostgreSQL", () => {
  it("sets exactly 14 days only on new businesses, with safe acquisition fields", async () => {
    const { rows } = await db.query<any>(`SELECT acquisition,category,offer_amount,pro_trial_ends_at-created_at AS unused FROM (SELECT *, now() AS created_at FROM public.businesses WHERE id='${business}') b`);
    expect(rows[0].acquisition).toEqual({ utm_source: "facebook" });
    expect(rows[0].category).toBe("Roofing"); expect(rows[0].offer_amount).toBe("$250");
    const result = await db.query<any>(`SELECT abs(extract(epoch FROM (pro_trial_ends_at-now()))-14*86400)<5 AS correct FROM public.businesses WHERE id='${business}'`);
    expect(result.rows[0].correct).toBe(true);
    expect((await db.query<any>(`SELECT pro_trial_ends_at FROM public.businesses WHERE id='${existing}'`)).rows[0].pro_trial_ends_at).toBeNull();
  });
  it("prevents extending a trial through owner updates", async () => {
    await expect(db.exec(`UPDATE public.businesses SET pro_trial_ends_at=now()+interval '90 days' WHERE id='${business}'`)).rejects.toThrow("Trial expiry is managed by the server");
  });
  it("paid Pro wins and effective plan authorizes only the owner", async () => {
    expect((await db.query<any>(`SELECT public.fn_effective_plan('${business}') AS plan`)).rows[0].plan).toBe("pro");
    await db.exec(`UPDATE public.businesses SET plan='pro' WHERE id='${existing}';`);
    expect((await db.query<any>(`SELECT public.fn_effective_plan('${existing}') AS plan`)).rows[0].plan).toBe("pro");
    await db.exec(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-4000-8000-000000000099'::uuid $$;`);
    await expect(db.query(`SELECT public.fn_effective_plan('${business}')`)).rejects.toThrow("not_authorized");
    await db.exec(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${owner}'::uuid $$;`);
  });
  it("expiry preserves contacts but blocks contact 101 asks and further imports", async () => {
    await db.exec(`INSERT INTO public.referral_contacts SELECT ('10000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,'${business}',now()+n*interval '1 second' FROM generate_series(1,101) n;`);
    await db.exec(`ALTER TABLE public.businesses DISABLE TRIGGER trg_acquisition_trial_guard; UPDATE public.businesses SET pro_trial_ends_at=now()-interval '1 second' WHERE id='${business}'; ALTER TABLE public.businesses ENABLE TRIGGER trg_acquisition_trial_guard;`);
    expect((await db.query<any>(`SELECT count(*)::int AS n FROM public.referral_contacts WHERE business_id='${business}'`)).rows[0].n).toBe(101);
    expect((await db.query<any>(`SELECT public.fn_contact_ask_allowed('${business}','10000000-0000-4000-8000-000000000100') AS allowed`)).rows[0].allowed).toBe(true);
    expect((await db.query<any>(`SELECT public.fn_contact_ask_allowed('${business}','10000000-0000-4000-8000-000000000101') AS allowed`)).rows[0].allowed).toBe(false);
    await expect(db.exec(`INSERT INTO public.referral_contact_sends VALUES('${business}','10000000-0000-4000-8000-000000000101')`)).rejects.toThrow("free_ask_limit");
    await expect(db.exec(`INSERT INTO public.referral_contacts VALUES('10000000-0000-4000-8000-000000000102','${business}',now())`)).rejects.toThrow("free_contact_limit");
  });
  it("acquisition RPC accepts only named events and safe paths without widening RLS", async () => {
    expect((await db.query<any>(`SELECT public.fn_record_acquisition_event('preview_submitted','/start/roofing') AS ok`)).rows[0].ok).toBe(true);
    expect((await db.query<any>(`SELECT public.fn_record_acquisition_event('preview_submitted','/r/private') AS ok`)).rows[0].ok).toBe(false);
    expect((await db.query<any>(`SELECT public.fn_record_acquisition_event('not_an_event','/') AS ok`)).rows[0].ok).toBe(false);
  });
});