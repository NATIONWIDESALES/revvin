// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PRIVACY_DOC } from "../content/legal";

const read = (p: string) => readFileSync(p, "utf8");
const migration = read("drizzle/migrations/0015_security_round2_flags_events_retention.sql");

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE TABLE public.user_roles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, role text);
    CREATE TABLE public.referral_rate_buckets(bucket_key text, window_start timestamptz, hits integer, PRIMARY KEY(bucket_key, window_start));
    CREATE TABLE public.leads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), status text, lead_name text, lead_phone text, lead_email text, lead_need text, closed_at timestamptz, updated_at timestamptz DEFAULT now());
    CREATE TABLE public.referral_triggers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), status text, sent_at timestamptz, created_at timestamptz DEFAULT now(), customer_email text, customer_phone text);
    CREATE TABLE public.notifications_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz DEFAULT now());
    CREATE TABLE public.email_send_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz DEFAULT now());
    CREATE TABLE public.funnel_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz DEFAULT now());
    CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), referral_id uuid, actor_id uuid NOT NULL, event_type text, payload jsonb, created_at timestamptz DEFAULT now());
  `);
  await db.exec(migration);
}, 30000);

afterAll(async () => { await db.close(); });

describe("2. data retention", () => {
  it("anonymizes only old closed leads, scrubs old asks, deletes old logs, and audits counts", async () => {
    await db.exec(`
      INSERT INTO public.leads(status, lead_name, lead_phone, lead_email, lead_need, closed_at, updated_at) VALUES
        ('closed_won', 'Jane Old', '5551112222', 'jane@example.com', 'roof repair', now() - interval '25 months', now() - interval '25 months'),
        ('closed_lost', 'Jim Old', '5553334444', 'jim@example.com', 'fence', now() - interval '30 months', now() - interval '30 months'),
        ('new', 'Kay Open', '5555556666', 'kay@example.com', 'deck', NULL, now() - interval '30 months'),
        ('closed_won', 'Lee Recent', '5557778888', 'lee@example.com', 'paint', now() - interval '2 months', now() - interval '2 months');
      INSERT INTO public.referral_triggers(status, sent_at, created_at, customer_email, customer_phone) VALUES
        ('sent', now() - interval '100 days', now() - interval '100 days', 'old@example.com', '5550001111'),
        ('sent', now() - interval '10 days', now() - interval '10 days', 'new@example.com', '5550002222'),
        ('scheduled', NULL, now() - interval '100 days', 'pending@example.com', '5550003333');
      INSERT INTO public.notifications_log(created_at) VALUES (now() - interval '200 days'), (now() - interval '10 days');
      INSERT INTO public.email_send_log(created_at) VALUES (now() - interval '200 days'), (now() - interval '10 days');
      INSERT INTO public.funnel_events(created_at) VALUES (now() - interval '14 months'), (now() - interval '1 month');
    `);
    const { rows } = await db.query<any>(`SELECT public.fn_data_retention() AS counts`);
    const counts = rows[0].counts;
    expect(counts).toMatchObject({
      leads_anonymized: 2,
      referral_triggers_scrubbed: 1,
      notifications_log_deleted: 1,
      email_send_log_deleted: 1,
      funnel_events_deleted: 1,
    });

    const leads = (await db.query<any>(`SELECT status, lead_name, lead_phone, lead_email, lead_need FROM public.leads ORDER BY lead_name`)).rows;
    const old = leads.filter((l) => l.lead_name === "Removed");
    expect(old).toHaveLength(2);
    expect(old.every((l) => l.lead_phone === null && l.lead_email === null && l.lead_need === "Removed")).toBe(true);
    // Open leads are never anonymized, even when old.
    expect(leads.find((l) => l.lead_name === "Kay Open")).toMatchObject({ status: "new", lead_phone: "5555556666" });
    expect(leads.find((l) => l.lead_name === "Lee Recent")).toBeDefined();

    const trigger = async (email: string) =>
      (await db.query<any>(`SELECT customer_email, customer_phone FROM public.referral_triggers WHERE customer_email = $1`, [email])).rows;
    // The ask processed 100 days ago was scrubbed.
    expect((await db.query<any>(`SELECT count(*)::int n FROM public.referral_triggers WHERE customer_email IS NULL AND customer_phone IS NULL`)).rows[0].n).toBe(1);
    expect((await trigger("new@example.com"))[0]).toEqual({ customer_email: "new@example.com", customer_phone: "5550002222" });
    // A still-pending ask keeps its contact details.
    expect((await trigger("pending@example.com"))[0]).toEqual({ customer_email: "pending@example.com", customer_phone: "5550003333" });

    expect((await db.query<any>(`SELECT count(*)::int n FROM public.notifications_log`)).rows[0].n).toBe(1);
    expect((await db.query<any>(`SELECT count(*)::int n FROM public.email_send_log`)).rows[0].n).toBe(1);
    expect((await db.query<any>(`SELECT count(*)::int n FROM public.funnel_events`)).rows[0].n).toBe(1);

    const audit = (await db.query<any>(`SELECT event_type, payload FROM public.audit_log`)).rows;
    expect(audit).toHaveLength(1);
    expect(audit[0].event_type).toBe("data_retention");
    expect(audit[0].payload.leads_anonymized).toBe(2);

    // A second run is a no-op: anonymized rows are not counted again.
    const again = (await db.query<any>(`SELECT public.fn_data_retention() AS counts`)).rows[0].counts;
    expect(again.leads_anonymized).toBe(0);
  });
});

describe("4. kill switches are server enforced", () => {
  it("blocks account creation only while signups are paused", async () => {
    await db.exec(`INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111')`);
    await db.exec(`UPDATE public.platform_flags SET enabled = true WHERE key = 'signups_paused'`);
    await expect(
      db.exec(`INSERT INTO auth.users VALUES ('22222222-2222-4222-8222-222222222222')`),
    ).rejects.toThrow("signups_paused");
    await db.exec(`UPDATE public.platform_flags SET enabled = false WHERE key = 'signups_paused'`);
    await db.exec(`INSERT INTO auth.users VALUES ('33333333-3333-4333-8333-333333333333')`);
    expect((await db.query<any>(`SELECT count(*)::int n FROM auth.users`)).rows[0].n).toBe(2);
  });

  it("flags tables grant the service role only, never anon or authenticated", () => {
    for (const table of ["platform_flags", "security_events", "security_alerts"]) {
      expect(migration).toContain(`GRANT ALL ON public.${table} TO service_role;`);
      expect(migration).not.toMatch(new RegExp(`GRANT [^;]*ON public\\.${table} TO (anon|authenticated)`));
    }
  });
});

describe("3. monitoring signals are recorded", () => {
  it("logs rate-limit rejections without changing the allow decision", async () => {
    expect((await db.query<any>(`SELECT public.fn_rate_bucket_hit('t', interval '1 hour', 2) AS ok`)).rows[0].ok).toBe(true);
    expect((await db.query<any>(`SELECT public.fn_rate_bucket_hit('t', interval '1 hour', 2) AS ok`)).rows[0].ok).toBe(true);
    expect((await db.query<any>(`SELECT public.fn_rate_bucket_hit('t', interval '1 hour', 2) AS ok`)).rows[0].ok).toBe(false);
    const events = (await db.query<any>(`SELECT event_type, details FROM public.security_events WHERE event_type = 'rate_limited'`)).rows;
    expect(events).toHaveLength(1);
    expect(events[0].details).toMatchObject({ bucket: "t", hits: 3, max: 2 });
  });

  it("records every user_roles change", async () => {
    await db.exec(`INSERT INTO public.user_roles(user_id, role) VALUES ('11111111-1111-4111-8111-111111111111', 'admin')`);
    const events = (await db.query<any>(`SELECT event_type, details FROM public.security_events WHERE event_type = 'user_roles_change'`)).rows;
    expect(events).toHaveLength(1);
    expect(events[0].details).toMatchObject({ action: "INSERT", role: "admin" });
  });

  it("security monitor requires cron auth, throttles per type per 6 hours, and emails the team", () => {
    const fn = read("supabase/functions/security-monitor/index.ts");
    expect(fn).toContain("checkCronAuth(req)");
    expect(fn).toContain("THROTTLE_HOURS = 6");
    expect(fn).toContain('ALERT_EMAIL = "info@revvin.co"');
    expect(fn).toContain("getUTCDay() === 1");
    for (const type of ["signups_spike", "email_spike", "business_email_spike", "rate_limit_spike", "user_roles_change", "webhook_endpoint_created", "restricted_publish", "weekly_summary"]) {
      expect(fn).toContain(type);
    }
    // Alerts still reach the team while outbound email is paused.
    expect(fn).toContain("allowWhenPaused: true");
  });
});

describe("4 and 5. outbound pause, privacy copy and security.txt", () => {
  it("every email send and the queue processor honor the outbound pause", () => {
    const gateway = read("supabase/functions/_shared/resend-gateway.ts");
    expect(gateway).toContain("outbound_email_paused");
    expect(gateway).toContain('error: "outbound_paused"');
    const queue = read("supabase/functions/process-email-queue/index.ts");
    expect(queue).toContain("outbound_email_paused");
    expect(queue).toContain("outbound_paused");
  });

  it("admin flag changes are restricted to the two known switches", () => {
    const sa = read("supabase/functions/sa-data/index.ts");
    expect(sa).toContain('"signups_paused", "outbound_email_paused"');
    expect(sa).toContain('action === "get_security_alerts"');
  });

  it("privacy policy states the retention periods", () => {
    const retention = PRIVACY_DOC.sections.find((s) => s.heading === "6. Data Retention");
    const text = retention!.paragraphs.map((para) => para.text).join(" ");
    for (const period of ["24 months", "90 days", "180 days", "13 months"]) expect(text).toContain(period);
    expect(text).toContain("customer list is never deleted");
    expect(text).not.toContain("—");
  });

  it("security.txt is present with contact, expiry about a year out, and canonical URL", () => {
    const txt = read("public/.well-known/security.txt");
    expect(txt).toContain("Contact: mailto:info@revvin.co");
    expect(txt).toContain("Preferred-Languages: en");
    expect(txt).toContain("Canonical: https://revvin.co/.well-known/security.txt");
    const expires = new Date(txt.match(/^Expires: (.+)$/m)![1]);
    const days = (expires.getTime() - Date.now()) / 86400_000;
    expect(days).toBeGreaterThan(300);
    expect(days).toBeLessThan(400);
  });
});
