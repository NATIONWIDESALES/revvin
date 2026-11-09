// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { migrationFunctions } from "./helpers/migrationFunctions";

const functions = migrationFunctions();
function payloads(sql: string) {
  const result: string[] = [];
  const starts = [...sql.matchAll(/enqueue_email\(\s*'transactional_emails'\s*,\s*jsonb_build_object\(/g)];
  for (const match of starts) {
    const start = (match.index ?? 0) + match[0].length;
    let depth = 1, quote = false, end = start;
    for (; end < sql.length; end++) {
      if (sql[end] === "'") {
        if (quote && sql[end + 1] === "'") { end++; continue; }
        quote = !quote;
      } else if (!quote) {
        if (sql[end] === "(") depth++;
        if (sql[end] === ")" && --depth === 0) break;
      }
    }
    result.push(sql.slice(start, end));
  }
  return result;
}
function assertContract(sql: string) {
  const bodies = payloads(sql);
  expect(bodies.length).toBeGreaterThan(0);
  for (const body of bodies) {
    expect(body).toMatch(/'purpose'\s*,\s*'transactional'/);
    expect(body).toMatch(/'idempotency_key'\s*,/);
    expect(body).toMatch(/'queued_at'\s*,\s*to_char\(/);
    expect(body).toMatch(/'message_id'\s*,/);
  }
}

it("reproduces the old first-view payload rejection", () => {
  const old = readFileSync("drizzle/migrations/0017_prospect_pages.sql", "utf8");
  expect(() => assertContract(old)).toThrow();
});
it("every latest SQL transactional writer supplies the queue delivery contract", () => {
  const writers = [...functions].filter(([, sql]) => /enqueue_email\(\s*'transactional_emails'/.test(sql));
  expect(writers.map(([name]) => name).sort()).toEqual(["fn_earn_get_link", "fn_prospect_claim", "fn_prospect_view"]);
  for (const [, sql] of writers) assertContract(sql);
});
it("view, claim and Earn emit valid distinct stable keys in rollback-only PostgreSQL", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-4000-8000-000000000001'::uuid $$;
      CREATE TABLE auth.users(id uuid,email text);
      INSERT INTO auth.users VALUES('00000000-0000-4000-8000-000000000001','caller@example.test');
      CREATE TABLE businesses(id uuid PRIMARY KEY,user_id uuid,name text,acquisition jsonb,slug text);
      CREATE TABLE audit_log(id uuid DEFAULT gen_random_uuid(),actor_id uuid,event_type text,payload jsonb);
      CREATE TABLE captured(payload jsonb);
      CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
      CREATE FUNCTION fn_rate_bucket_hit(text,interval,integer) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
      CREATE FUNCTION fn_request_bucket() RETURNS text LANGUAGE sql AS $$ SELECT 'isolated' $$;
      CREATE FUNCTION enqueue_email(text,jsonb) RETURNS void LANGUAGE sql AS $$ INSERT INTO captured VALUES($2) $$;
      CREATE TABLE metros(is_live boolean);
      INSERT INTO metros VALUES(true);
      CREATE FUNCTION fn_earn_eligible(businesses,metros) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
      CREATE FUNCTION fn_email_owned() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
      CREATE TABLE referrers(id uuid DEFAULT gen_random_uuid(),business_id uuid,name text,email text,token text);
      CREATE TABLE suppressed_emails(email text);
      CREATE FUNCTION fn_upsert_referrer(uuid,text,text,text) RETURNS referrers LANGUAGE sql AS $$ INSERT INTO referrers(business_id,name,email,token) VALUES($1,$2,$3,'fixture-token') RETURNING * $$;`);
    await db.exec(readFileSync("drizzle/migrations/0017_prospect_pages.sql", "utf8").replace(/SELECT cron\.schedule\([\s\S]*?\n\);/, "SELECT 1;"));
    for (const name of ["fn_prospect_view", "fn_prospect_claim", "fn_earn_get_link"]) {
      const sql = functions.get(name);
      if (!sql) throw new Error(name);
      await db.exec(sql);
    }
    await db.exec(`BEGIN; INSERT INTO prospect_pages(code,name,trade,created_by) VALUES('fixturecode123','Fixture Roofing','roofing','00000000-0000-4000-8000-000000000001');
      INSERT INTO businesses VALUES('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','Fixture Roofing','{"prospect_code":"fixturecode123"}','fixture-roofing');
      SELECT fn_prospect_view('fixturecode123'); SELECT fn_prospect_view('fixturecode123');
      SELECT fn_prospect_claim('fixturecode123','00000000-0000-4000-8000-000000000002');
      SELECT fn_earn_get_link('fixture-roofing','Fixture Referrer','referrer@example.test');
      SELECT fn_earn_get_link('fixture-roofing','Fixture Referrer','referrer@example.test');`);
    const { rows } = await db.query<{ payload: Record<string,string> }>("SELECT payload FROM captured");
    expect(rows.map(r => r.payload.label)).toEqual(["prospect_first_view", "prospect_first_view", "prospect_claimed", "prospect_claimed", "earn_link", "earn_link"]);
    for (const { payload } of rows) {
      expect(payload.purpose).toBe("transactional");
      expect(payload.idempotency_key.length).toBeGreaterThan(20);
      expect(Number.isFinite(Date.parse(payload.queued_at))).toBe(true);
    }
    expect(new Set(rows.slice(0, 4).map(r => r.payload.idempotency_key)).size).toBe(4);
    expect(rows[4].payload.idempotency_key).toBe(rows[5].payload.idempotency_key);
    await db.exec("ROLLBACK");
    expect((await db.query<{ n: number }>("SELECT count(*)::int n FROM captured")).rows[0].n).toBe(0);
  } finally { await db.close(); }
}, 30000);