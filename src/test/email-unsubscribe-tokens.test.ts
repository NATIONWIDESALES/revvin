// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it, vi } from "vitest";
vi.setConfig({ testTimeout: 30000 });
import { migrationFunctions } from "./helpers/migrationFunctions";
import { classifySendFailure, needsUnsubscribeToken, rekeyPayload, withUnsubscribeToken } from "../../supabase/functions/process-email-queue/queue-retry";

const fns = migrationFunctions();

async function db() {
  const d = new PGlite();
  await d.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA pgmq; CREATE SCHEMA auth;
    CREATE TABLE pgmq.sent(q text, payload jsonb);
    CREATE FUNCTION pgmq.send(text,jsonb) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO pgmq.sent VALUES($1,$2); SELECT 1::bigint $$;
    CREATE FUNCTION pgmq.create(text) RETURNS void LANGUAGE sql AS $$ SELECT $$;
    CREATE TABLE public.email_unsubscribe_tokens(id uuid DEFAULT gen_random_uuid(), token text UNIQUE, email text UNIQUE, created_at timestamptz DEFAULT now(), used_at timestamptz);`);
  for (const n of ["fn_email_unsubscribe_token", "enqueue_email"]) await d.exec(fns.get(n)!);
  return d;
}
const sent = async (d: PGlite) => (await d.query<{ payload: Record<string, string> }>("SELECT payload FROM pgmq.sent")).rows.map(r => r.payload);

describe("every transactional template carries an unsubscribe token", () => {
  for (const label of ["prospect_first_view", "prospect_claimed", "earn_link", "failure_alert"]) {
    it(label, async () => {
      const d = await db();
      try {
        await d.query(`SELECT public.enqueue_email('transactional_emails', jsonb_build_object('to','Info@Revvin.co','purpose','transactional','label',$1::text,'idempotency_key','k:'||$1::text,'message_id','m'))`, [label]);
        const [p] = await sent(d);
        expect(p.unsubscribe_token).toMatch(/^[a-f0-9]{32}$/);
        const { rows } = await d.query<{ email: string; token: string }>("SELECT email, token FROM public.email_unsubscribe_tokens");
        expect(rows).toEqual([{ email: "info@revvin.co", token: p.unsubscribe_token }]);
      } finally { await d.close(); }
    });
  }
  it("reuses one token per address and keeps an explicit token", async () => {
    const d = await db();
    try {
      await d.exec(`SELECT public.enqueue_email('transactional_emails','{"to":"a@x.test","purpose":"transactional"}');
        SELECT public.enqueue_email('transactional_emails','{"to":"a@x.test","purpose":"transactional"}');
        SELECT public.enqueue_email('transactional_emails','{"to":"b@x.test","unsubscribe_token":"keepthisexplicittoken"}');`);
      const [a, b, c] = await sent(d);
      expect(a.unsubscribe_token).toBe(b.unsubscribe_token);
      expect(a.idempotency_key).toBe(a.message_id);
      expect(c.unsubscribe_token).toBe("keepthisexplicittoken");
    } finally { await d.close(); }
  });
  it("leaves campaign payloads untouched", async () => {
    const d = await db();
    try {
      await d.exec(`SELECT public.enqueue_email('campaign_emails','{"to":"a@x.test"}')`);
      expect((await sent(d))[0]).toEqual({ to: "a@x.test" });
    } finally { await d.close(); }
  });
});

describe("queue worker repair and retries", () => {
  it("mints a token for a transactional payload that arrives without one", async () => {
    const out = await withUnsubscribeToken({ to: "info@revvin.co", purpose: "transactional" }, async () => "abcdefabcdefabcdef12");
    expect(out.unsubscribe_token).toBe("abcdefabcdefabcdef12");
    expect(needsUnsubscribeToken({ to: "x@y.z", purpose: "auth" })).toBe(false);
    await expect(withUnsubscribeToken({ to: "x@y.z", purpose: "transactional" }, async () => null)).rejects.toThrow("unsubscribe_token_unavailable");
  });
  it("409 already failed retries with a new idempotency key", () => {
    const err = Object.assign(new Error('Email API error: 409 {"type":"run_failed","title":"This email send already failed."}'), { status: 409 });
    expect(classifySendFailure(err)).toBe("rekey");
    const p1 = rekeyPayload({ idempotency_key: "prospect_first_view:abc", message_id: "m" }, 1);
    expect(p1.idempotency_key).toBe("prospect_first_view:abc:retry1");
    expect(rekeyPayload(p1, 2).idempotency_key).toBe("prospect_first_view:abc:retry2");
    expect(p1.message_id).toBe("m");
  });
  it("a permanent 400 is not retried", () => {
    expect(classifySendFailure(new Error('Email API error: 400 {"type":"missing_parameter"}'))).toBe("permanent");
    expect(classifySendFailure(Object.assign(new Error("x"), { status: 500 }))).toBe("retry");
  });
});

describe("Earn link email", () => {
  async function earnDb(suppressed: boolean) {
    const d = await db();
    await d.exec(`CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
      CREATE TABLE auth.users(id uuid,email text);
      CREATE TABLE public.businesses(id uuid PRIMARY KEY,slug text);
      INSERT INTO public.businesses VALUES('00000000-0000-4000-8000-000000000002','fixture-roofing');
      CREATE TABLE public.metros(is_live boolean); INSERT INTO public.metros VALUES(true);
      CREATE FUNCTION public.fn_earn_eligible(public.businesses,public.metros) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
      CREATE FUNCTION public.fn_rate_bucket_hit(text,interval,integer) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
      CREATE FUNCTION public.fn_request_bucket() RETURNS text LANGUAGE sql AS $$ SELECT 'b' $$;
      CREATE FUNCTION public.fn_email_owned() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
      CREATE TABLE public.referrers(id uuid DEFAULT gen_random_uuid(),business_id uuid,name text,email text,token text);
      CREATE TABLE public.suppressed_emails(email text);
      CREATE FUNCTION public.fn_upsert_referrer(uuid,text,text,text) RETURNS public.referrers LANGUAGE sql AS $$ INSERT INTO public.referrers(business_id,name,email,token) VALUES($1,$2,$3,'fixture-token') RETURNING * $$;`);
    if (suppressed) await d.exec(`INSERT INTO public.suppressed_emails VALUES('ref@x.test')`);
    await d.exec(fns.get("fn_earn_get_link")!);
    return d;
  }
  it("a signed-out visitor gets the link email queued with a token", async () => {
    const d = await earnDb(false);
    try {
      const { rows } = await d.query<{ t: string | null }>("SELECT public.fn_earn_get_link('fixture-roofing','Fixture Ref','ref@x.test') t");
      expect(rows[0].t).toBeNull();
      const [p] = await sent(d);
      expect(p.label).toBe("earn_link");
      expect(p.to).toBe("ref@x.test");
      expect(p.text).toContain("https://revvin.co/r/fixture-roofing?ref=fixture-token");
      expect(p.unsubscribe_token).toMatch(/^[a-f0-9]{32}$/);
    } finally { await d.close(); }
  });
  it("when the email cannot be queued a new visitor sees the link, an existing one gets an error", async () => {
    const d = await earnDb(true);
    try {
      const { rows } = await d.query<{ t: string | null }>("SELECT public.fn_earn_get_link('fixture-roofing','Fixture Ref','ref@x.test') t");
      expect(rows[0].t).toBe("fixture-token");
      await expect(d.query("SELECT public.fn_earn_get_link('fixture-roofing','Fixture Ref','ref@x.test')")).rejects.toThrow("email_unavailable");
      expect(await sent(d)).toEqual([]);
    } finally { await d.close(); }
  });
});
