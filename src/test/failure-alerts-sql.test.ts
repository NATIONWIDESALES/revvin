// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { migrationFunctions } from "./helpers/migrationFunctions";

async function fixture() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE auth.users(id uuid,email text);
    CREATE TABLE public.businesses(id uuid,user_id uuid,name text,is_demo boolean,account_status text,is_published boolean,is_disabled boolean);
    CREATE FUNCTION public.fn_page_live(text,boolean,boolean) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='approved' AND $2 AND NOT $3 $$;
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.admin',true),'')='true' $$;
    CREATE FUNCTION public.fn_request_bucket() RETURNS text LANGUAGE sql AS $$ SELECT 'fixture' $$;
    CREATE FUNCTION public.fn_rate_bucket_hit(text,interval,integer) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.rate_allowed',true),'true')='true' $$;
    CREATE TABLE public.email_unsubscribe_tokens(token text,email text);
    CREATE TABLE public.audit_log(event_type text);
    CREATE TABLE public.captured_emails(payload jsonb);
    CREATE FUNCTION public.enqueue_email(text,jsonb) RETURNS bigint LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.captured_emails VALUES($2); RETURN 1; END $$;
    INSERT INTO public.businesses VALUES('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Fixture Business',false,'approved',true,false);
    INSERT INTO auth.users VALUES('00000000-0000-0000-0000-000000000002','owner@example.test');
    SELECT set_config('test.uid','00000000-0000-0000-0000-000000000002',false);`);
  await db.exec(readFileSync("drizzle/migrations/0032_failure_alerts.sql", "utf8"));
  await db.exec(`CREATE FUNCTION fn_bot_reason(ua text, referrer text) RETURNS text LANGUAGE sql AS $$
    SELECT CASE WHEN ua ~* '(bot|crawl|spider|headless|playwright)' THEN 'declared'
      WHEN substring(ua FROM 'Chrome/(\\d{1,4})')::int < 130 AND referrer = '' THEN 'stale_no_referrer'
      ELSE NULL END $$;`);
  const current = migrationFunctions().get("fn_report_failure");
  if (!current) throw new Error("Missing current failure reporter");
  await db.exec(current);
  return db;
}
const report = (db: PGlite, step = "image_upload") => db.query("SELECT fn_report_failure($1,'Storage denied','403','/dashboard?token=private',NULL,'fixture','test browser') AS ok", [step]);
const session = "a".repeat(32);
const recovery = (db: PGlite, sessionKey = session, ua = "Chrome/143.0", code = "chunk_reload", message = "chunk_reload: stale deployment module; automatic recovery attempted") =>
  db.query("SELECT fn_report_failure('render_crash',$1,$2,'/',NULL,$3,$4)", [message, code, `fixture|s:${sessionKey}|r:0`, ua]);

describe("private failure alerts", () => {
  it("logs a first automatic recovery without emailing", async () => {
    const db = await fixture();
    try {
      await recovery(db);
      expect((await db.query("SELECT count(*)::int n FROM app_failures")).rows).toEqual([{ n: 1 }]);
      expect((await db.query("SELECT count(*)::int n FROM captured_emails")).rows).toEqual([{ n: 0 }]);
    } finally { await db.close(); }
  }, 30000);
  it("emails the second same-session failure within 60 seconds", async () => {
    const db = await fixture();
    try {
      await recovery(db); await recovery(db);
      expect((await db.query("SELECT count(*)::int n FROM app_failures")).rows).toEqual([{ n: 2 }]);
      expect((await db.query("SELECT count(*)::int n FROM captured_emails")).rows).toEqual([{ n: 1 }]);
    } finally { await db.close(); }
  }, 30000);
  it("emails a normal crash after attempted recovery rather than hiding the failed recovery", async () => {
    const db = await fixture();
    try {
      await recovery(db); await recovery(db, session, "Chrome/143.0", "TypeError", "Render failed");
      expect((await db.query("SELECT count(*)::int n FROM captured_emails")).rows).toEqual([{ n: 1 }]);
    } finally { await db.close(); }
  }, 30000);
  it("does not combine failures from different anonymous sessions", async () => {
    const db = await fixture();
    try {
      await db.exec("SELECT set_config('test.uid','',false)");
      await recovery(db); await recovery(db, "b".repeat(32));
      expect((await db.query("SELECT count(*)::int n FROM captured_emails")).rows).toEqual([{ n: 0 }]);
    } finally { await db.close(); }
  }, 30000);
  it("does not treat a failure older than 60 seconds as failed recovery", async () => {
    const db = await fixture();
    try {
      await recovery(db);
      await db.exec("UPDATE app_failures SET created_at=now()-interval '61 seconds'");
      await recovery(db);
      expect((await db.query("SELECT count(*)::int n FROM captured_emails")).rows).toEqual([{ n: 0 }]);
    } finally { await db.close(); }
  }, 30000);
  it.each(["HeadlessChrome/143.0", "Googlebot", "Mozilla/5.0 (X11; Linux x86_64) Chrome/124.0"])("logs %s without emailing even repeated failures", async (ua) => {
    const db = await fixture();
    try {
      await recovery(db, session, ua); await recovery(db, session, ua);
      expect((await db.query("SELECT count(*)::int n FROM app_failures")).rows).toEqual([{ n: 2 }]);
      expect((await db.query("SELECT count(*)::int n FROM captured_emails")).rows).toEqual([{ n: 0 }]);
    } finally { await db.close(); }
  }, 30000);
  it("keeps old-browser visitors with a referrer eligible for genuine failure alerts", async () => {
    const db = await fixture();
    try {
      await db.query("SELECT fn_report_failure('publish','Save failed','403','/',NULL,$1,'Chrome/124.0')", [`fixture|s:${session}|r:1`]);
      expect((await db.query("SELECT count(*)::int n FROM captured_emails")).rows).toEqual([{ n: 1 }]);
    } finally { await db.close(); }
  }, 30000);
  it("records failures but reserves at most one email per step/business in a sliding hour", async () => {
    const db = await fixture();
    try {
      await report(db); await report(db);
      expect((await db.query("SELECT count(*)::int n FROM app_failures")).rows).toEqual([{ n: 2 }]);
      expect((await db.query("SELECT count(*)::int n FROM captured_emails")).rows).toEqual([{ n: 1 }]);
      await db.exec("UPDATE failure_alerts SET sent_at=now()-interval '61 minutes'");
      await report(db);
      const payloads = await db.query<{ payload: Record<string, string> }>("SELECT payload FROM captured_emails");
      expect(payloads.rows).toHaveLength(2);
      const payload = payloads.rows[1].payload;
      expect(payload.to).toBe("info@revvin.co");
      expect(payload.subject).toBe("[Customer] Revvin failure: image_upload for Fixture Business");
      expect(payload.text).toContain("Same failure in last 24 hours: 3");
      expect(payload.text).toContain("owner@example.test");
      expect(payload.text).toContain("Time (Pacific):");
      expect(payload.text).not.toContain("token=private");
      expect(payload.queued_at).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
      expect(payload.idempotency_key).toMatch(/^failure_alert:/);
      expect(payload.unsubscribe_token).toHaveLength(32);
    } finally { await db.close(); }
  }, 30000);
  it("includes the pause notice in email 20, then keeps recording without any email 21", async () => {
    const db = await fixture();
    try {
      await db.exec("INSERT INTO failure_alerts(step,sent_at,message_id) SELECT 'render_crash',now(),gen_random_uuid() FROM generate_series(1,19)");
      await report(db); await report(db, "logo_save");
      expect((await db.query("SELECT count(*)::int n FROM failure_alerts")).rows).toEqual([{ n: 20 }]);
      expect((await db.query<{ payload: { text: string } }>("SELECT payload FROM captured_emails")).rows[0].payload.text).toContain("Alerts paused until midnight Pacific, check the failures list");
      expect((await db.query("SELECT count(*)::int n FROM app_failures")).rows).toEqual([{ n: 2 }]);
      await db.exec("UPDATE failure_alerts SET sent_at=now()-interval '2 days'");
      await report(db, "logo_save");
      expect((await db.query("SELECT count(*)::int n FROM captured_emails")).rows).toEqual([{ n: 2 }]);
    } finally { await db.close(); }
  }, 30000);
  it("skips demos, rate-limited callers, invalid steps and forged business identities", async () => {
    const db = await fixture();
    try {
      await db.exec("UPDATE businesses SET is_demo=true"); await report(db);
      await db.exec("UPDATE businesses SET is_demo=false; SELECT set_config('test.rate_allowed','false',false)"); await report(db);
      await db.exec("SELECT set_config('test.rate_allowed','true',false)"); await report(db, "anything");
      await db.query("SELECT fn_report_failure('logo_save','x','x','/', '00000000-0000-0000-0000-000000000099','x','x')");
      expect((await db.query("SELECT count(*)::int n FROM app_failures")).rows).toEqual([{ n: 0 }]);
    } finally { await db.close(); }
  }, 30000);
  it("blocks direct client reads and requires admin for the bounded list", async () => {
    const db = await fixture();
    try {
      await report(db);
      expect((await db.query("SELECT relrowsecurity FROM pg_class WHERE relname IN ('app_failures','failure_alerts')")).rows).toEqual([{ relrowsecurity: true },{ relrowsecurity: true }]);
      await db.exec("SET ROLE authenticated");
      await expect(db.query("SELECT * FROM app_failures")).rejects.toThrow("permission denied");
      await expect(db.query("SELECT fn_admin_failures()")).rejects.toThrow("not_authorized");
      await db.exec("RESET ROLE; SELECT set_config('test.admin','true',false); SET ROLE authenticated");
      expect((await db.query<{ fn_admin_failures: unknown[] }>("SELECT fn_admin_failures()")).rows[0].fn_admin_failures).toHaveLength(1);
    } finally { await db.close(); }
  }, 30000);
  it("scrubs errors and deletes only failure records older than 90 days on the existing retention audit", async () => {
    const db = await fixture();
    try {
      const scrubbed = (await db.query<{ value: string }>("SELECT fn_failure_scrub($1) value", ['denied (row, form value) token=secret https://x.test?q=private owner@example.test "private"'])).rows[0].value;
      expect(scrubbed).not.toMatch(/form value|token=secret|q=private|owner@example|"private"/);
      await report(db);
      await db.exec("INSERT INTO app_failures(step,message,created_at) VALUES('image_upload','old',now()-interval '91 days'),('image_upload','keep',now()-interval '89 days'); INSERT INTO audit_log VALUES('data_retention')");
      expect((await db.query("SELECT message FROM app_failures ORDER BY created_at")).rows).toEqual([{ message: "keep" }, { message: "Storage denied" }]);
    } finally { await db.close(); }
  }, 30000);
});