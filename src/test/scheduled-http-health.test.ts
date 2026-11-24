// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as httpRules from "../../supabase/functions/security-monitor/http-health";
import * as smokeRules from "../../supabase/functions/security-monitor/smoke-confirmation";
import * as roleRules from "../../supabase/functions/security-monitor/role-changes";

const health = (extra: Partial<httpRules.ScheduledHttpHealth> = {}): httpRules.ScheduledHttpHealth => ({ total: 115, failures: 6, real_errors: 0, consecutive_jobs: [], by_status: { error: 6 }, ...extra });
describe("scheduled HTTP email thresholds", () => {
  it("does not email for six isolated DNS failures out of 115 calls", () => expect(httpRules.scheduledHttpFailing(health())).toBe(false));
  it("emails at exactly 20 percent failures", () => expect(httpRules.scheduledHttpFailing(health({ total: 100, failures: 20 }))).toBe(true));
  it("does not email below 20 percent", () => expect(httpRules.scheduledHttpFailing(health({ total: 100, failures: 19 }))).toBe(false));
  it("emails for a correlated caller with three consecutive failures at low overall rate", () => expect(httpRules.scheduledHttpFailing(health({ consecutive_jobs: ["function:public.email_queue_dispatch()"] }))).toBe(true));
  it("emails for one HTTP 4xx/5xx even at low overall rate", () => expect(httpRules.scheduledHttpFailing(health({ failures: 1, real_errors: 1 }))).toBe(true));
  it("does not email when no calls completed", () => expect(httpRules.scheduledHttpFailing(health({ total: 0, failures: 0 }))).toBe(false));
  it("does not recover a failure email that was never sent", () => expect(httpRules.scheduledHttpWasFailing({ alert_type: "health_http", details: { email_sent: false } })).toBe(false));
  it("recovers a successfully sent failure email", () => expect(httpRules.scheduledHttpWasFailing({ alert_type: "health_http", details: { email_sent: true } })).toBe(true));
  it("does not repeat recovery after a sent recovery", () => expect(httpRules.scheduledHttpWasFailing({ alert_type: "health_http_recovered", details: { email_sent: true } })).toBe(false));
});

async function isolatedDb() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA net;
    CREATE TABLE net._http_response(id bigint,status_code int,timed_out boolean,error_msg text,created timestamptz DEFAULT now());
    CREATE TABLE public.request_capture(url text,headers jsonb,body jsonb,params jsonb,timeout_ms int);
    CREATE SEQUENCE public.request_sequence;
    CREATE FUNCTION net.http_post(url text,body jsonb DEFAULT '{}'::jsonb,params jsonb DEFAULT '{}'::jsonb,headers jsonb DEFAULT '{}'::jsonb,timeout_milliseconds int DEFAULT 5000)
      RETURNS bigint LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.request_capture VALUES(url,headers,body,params,timeout_milliseconds); RETURN nextval('public.request_sequence'); END $$;
    CREATE FUNCTION net.http_get(url text,params jsonb DEFAULT '{}'::jsonb,headers jsonb DEFAULT '{}'::jsonb,timeout_milliseconds int DEFAULT 5000)
      RETURNS bigint LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.request_capture VALUES(url,headers,null,params,timeout_milliseconds); RETURN nextval('public.request_sequence'); END $$;
    CREATE FUNCTION public.queue_dispatch() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
      PERFORM net.http_post(url := 'https://fixture.invalid/queue',headers := jsonb_build_object('Authorization','Bearer fixture-only'),body := jsonb_build_object('name','O''Brien (test)'),params := '{"page":1}'::jsonb);
    END $$;
    CREATE FUNCTION public.explicit_timeout() RETURNS void LANGUAGE plpgsql AS $$ BEGIN
      PERFORM net.http_get(url := 'https://fixture.invalid/existing', timeout_milliseconds := 30000);
    END $$;`);
  await db.exec(readFileSync("drizzle/migrations/0039_scheduled_http_timeout_and_health.sql", "utf8"));
  return db;
}

describe("HTTP migration contract", () => {
  it("raises only missing timeout, preserves URL/body/headers/params, records IDs and restores originals", async () => {
    const db = await isolatedDb();
    try {
      await db.exec("SELECT public.queue_dispatch(); SELECT public.explicit_timeout();");
      expect((await db.query("SELECT * FROM public.request_capture ORDER BY timeout_ms")).rows).toEqual([
        { url: "https://fixture.invalid/queue", headers: { Authorization: "Bearer fixture-only" }, body: { name: "O'Brien (test)" }, params: { page: 1 }, timeout_ms: 15000 },
        { url: "https://fixture.invalid/existing", headers: {}, body: null, params: {}, timeout_ms: 30000 },
      ]);
      expect((await db.query("SELECT job_key FROM public.scheduled_http_requests ORDER BY request_id")).rows).toEqual([{ job_key: "function:public.queue_dispatch()" }, { job_key: "function:public.explicit_timeout()" }]);
      await db.exec("SELECT public.fn_rollback_scheduled_http_20261124(); SELECT public.queue_dispatch();");
      expect((await db.query("SELECT timeout_ms FROM public.request_capture ORDER BY ctid DESC LIMIT 1")).rows).toEqual([{ timeout_ms: 5000 }]);
      expect((await db.query("SELECT count(*)::int n FROM public.scheduled_http_requests")).rows).toEqual([{ n: 2 }]);
    } finally { await db.close(); }
  }, 30000);

  it("counts all calls, retains isolated DNS failures, distinguishes HTTP errors and resets streaks on success", async () => {
    const db = await isolatedDb();
    try {
      await db.exec(`INSERT INTO net._http_response SELECT i,200,false,null,now() FROM generate_series(1,109) i;
        INSERT INTO net._http_response SELECT i,null,true,'Timeout of 15000 ms reached (DNS)',now() FROM generate_series(110,115) i;
        INSERT INTO public.scheduled_http_requests(request_id,job_key,requested_at) VALUES
          (113,'caller-a',now()-interval '3 minutes'),(114,'caller-a',now()-interval '2 minutes');`);
      const snapshot = async () => (await db.query<{ h: httpRules.ScheduledHttpHealth }>("SELECT public.fn_monitor_scheduled_http() h")).rows[0].h;
      expect((await snapshot()).consecutive_jobs).toEqual([]);
      await db.exec("INSERT INTO public.scheduled_http_requests(request_id,job_key,requested_at) VALUES(115,'caller-a',now()-interval '1 minute');");
      expect(await snapshot()).toMatchObject({ total: 115, failures: 6, real_errors: 0, by_status: { error: 6 }, consecutive_jobs: ["caller-a"] });
      await db.exec("INSERT INTO net._http_response VALUES(116,200,false,null,now()); INSERT INTO public.scheduled_http_requests(request_id,job_key) VALUES(116,'caller-a');");
      expect((await snapshot()).consecutive_jobs).toEqual([]);
      await db.exec("INSERT INTO net._http_response VALUES(117,404,false,null,now()),(118,503,false,null,now()),(119,302,false,null,now());");
      expect(await snapshot()).toMatchObject({ total: 119, failures: 8, real_errors: 2 });
      expect((await db.query("SELECT count(*)::int n FROM net._http_response WHERE error_msg LIKE '%DNS%'")).rows).toEqual([{ n: 6 }]);
    } finally { await db.close(); }
  }, 30000);

  it("rollback definitions and HTTP diagnostics remain inaccessible to anonymous/authenticated roles", async () => {
    const db = await isolatedDb();
    try {
      for (const role of ["anon", "authenticated"]) {
        await db.exec(`SET ROLE ${role}`);
        await expect(db.query("SELECT * FROM public.scheduled_http_rollback_20261124")).rejects.toThrow("permission denied");
        await expect(db.query("SELECT public.fn_monitor_scheduled_http()")).rejects.toThrow("permission denied");
        await expect(db.query("SELECT public.fn_rollback_scheduled_http_20261124()")).rejects.toThrow("permission denied");
        await db.exec("RESET ROLE");
      }
    } finally { await db.close(); }
  }, 30000);
});

async function actualMonitor(http: httpRules.ScheduledHttpHealth, history: Record<string, any>[] = [], rpcError = false) {
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const contains = vi.fn();
  const db = {
    rpc: async (name: string) => name === "fn_monitor_scheduled_http" ? { data: rpcError ? null : http, error: rpcError ? { message: "fixture failure" } : null } : { data: {}, error: null },
    from: (table: string) => {
      let types: string[] = []; let sentOnly = false;
      const query: Record<string, any> = {};
      for (const method of ["select", "gte", "eq", "order", "limit"]) query[method] = () => query;
      query.in = (_column: string, value: string[]) => { types = value; return query; };
      query.contains = (column: string, value: unknown) => { contains(column, value); sentOnly = true; return query; };
      query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ count: 0, error: null, data: table === "smoke_test_runs" ? [{ ran_at: new Date().toISOString(), ok: true, failed_step: null, steps: [] }] : table === "security_alerts" ? history.filter(row => types.includes(row.alert_type) && (!sentOnly || row.details.email_sent === true)).slice(0,1) : [] }).then(resolve);
      return query;
    },
  };
  const require = (id: string) => {
    if (id.endsWith("/cors")) return { corsHeaders: {} };
    if (id.includes("supabase-js")) return { createClient: () => db };
    if (id.endsWith("cron-auth.ts")) return { checkCronAuth: () => ({ ok: true }) };
    if (id.endsWith("resend-gateway.ts")) return { sendEmailViaGateway: () => { throw new Error("No real email in dry run"); } };
    if (id.endsWith("app-config.ts")) return {};
    if (id.endsWith("role-changes.ts")) return roleRules;
    if (id.endsWith("smoke-confirmation.ts")) return smokeRules;
    if (id.endsWith("http-health.ts")) return httpRules;
    throw new Error(`Unexpected dependency ${id}`);
  };
  const js = ts.transpileModule(readFileSync("supabase/functions/security-monitor/index.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "exports", "Deno", js)(require, {}, { env: { get: () => "fixture-only" }, serve: (fn: typeof handler) => { handler = fn; } });
  if (!handler) throw new Error("Missing monitor handler");
  const response = await handler(new Request("https://fixture.invalid/security-monitor?dry_run=1"));
  expect(response.status).toBe(200);
  return { result: await response.json(), contains };
}

describe("real monitor dry-run integration", () => {
  it("low-rate DNS noise produces no email", async () => expect((await actualMonitor(health())).result.would_send).toEqual([]));
  it("serious HTTP failures keep the Automated test label", async () => {
    const { result } = await actualMonitor(health({ real_errors: 1 }));
    expect(result.would_send).toHaveLength(1);
    expect(result.would_send[0]).toMatchObject({ type: "health_http", subject: "[Automated test] Revvin alert: 6 scheduled calls failed in the last hour" });
  });
  it("failed alert delivery does not produce recovery", async () => {
    const { result, contains } = await actualMonitor(health(), [{ alert_type: "health_http", sent_at: new Date().toISOString(), details: { email_sent: false } }]);
    expect(result.would_send).toEqual([]);
    expect(contains).toHaveBeenCalledExactlyOnceWith("details", { email_sent: true });
  });
  it("sent failure recovers once below the threshold", async () => {
    const { result } = await actualMonitor(health(), [{ alert_type: "health_http", sent_at: new Date().toISOString(), details: { email_sent: true } }]);
    expect(result.would_send).toHaveLength(1);
    expect(result.would_send[0].type).toBe("health_http_recovered");
  });
  it("unavailable HTTP evidence never emits a false recovery", async () => {
    const { result } = await actualMonitor(health(), [{ alert_type: "health_http", sent_at: new Date().toISOString(), details: { email_sent: true } }], true);
    expect(result.would_send).toEqual([]);
  });
});