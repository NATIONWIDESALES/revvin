// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { esc, renderTokens, button } from "../../supabase/functions/_shared/email-format";
import { isPlatformAdmin } from "../../supabase/functions/_shared/admin-auth";
import { protectedFramePath } from "@/components/FrameGuard";
import { inSegment, SEGMENTS } from "@/lib/campaignSegments";
import { renderBusinessDoc } from "../../plugins/prerender";
import { PUBLIC_REFERRAL_PAGE_COLS } from "@/lib/publicReferralCols";
import { PGlite } from "@electric-sql/pglite";
const read = (p: string) => readFileSync(p, "utf8");
const fn = (p: string) => read(`supabase/functions/${p}`);
const migration = (prefix: string) => read(`drizzle/migrations/${readdirSync("drizzle/migrations").find(n => n.startsWith(prefix))}`);
const sql = migration("0008") + migration("0009") + migration("0011") + migration("0012") + migration("0013");
describe("security hardening item regressions", () => {
  it("1: actual email ownership SQL rejects auto-confirmed passwords and permits OTP or a confirmed challenge", async () => {
    const db = new PGlite();
    try {
      await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid,email_confirmed_at timestamptz,confirmation_sent_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-4000-8000-000000000001'::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT current_setting('test.jwt')::jsonb $$;
      INSERT INTO auth.users VALUES('00000000-0000-4000-8000-000000000001',now(),NULL);
      ${migration("0008").split("REVOKE ALL ON FUNCTION public.fn_email_owned")[0]}`);
      for (const [jwt, expected] of [[{ amr: [{ method: "password" }] }, false], [{ amr: [{ method: "otp" }] }, true], [{ amr: [{ method: "magiclink" }] }, true]] as const) {
        await db.query("SELECT set_config('test.jwt',$1,false)", [JSON.stringify(jwt)]);
        expect((await db.query<{ owned: boolean }>("SELECT public.fn_email_owned() AS owned")).rows[0].owned).toBe(expected);
      }
      await db.exec(`SELECT set_config('test.jwt','{"amr":[{"method":"password"}]}',false); UPDATE auth.users SET confirmation_sent_at=now();`);
      expect((await db.query<{ owned: boolean }>("SELECT public.fn_email_owned() AS owned")).rows[0].owned).toBe(true);
    } finally { await db.close(); }
    const summary = sql.split("CREATE OR REPLACE FUNCTION public.fn_referrer_lead_summary()")[1].split("$$;")[0];
    expect(summary).not.toMatch(/notes|deal_value|status_token|phone|email text/);
  }, 30000);
  it("2: raw writer RPCs are revoked and client actions use scoped server RPC", () => {
    expect(sql).toContain("FROM PUBLIC,anon,authenticated");
    for (const file of ["src/pages/dashboard/ReferrerDashboard.tsx", "src/pages/dashboard/AdminDashboard.tsx", "src/pages/SuperAdminCRM.tsx"]) expect(read(file)).not.toMatch(/rpc\("fn_create_(notification|audit_entry)"/);
    expect(sql).toContain("r.referrer_id IS DISTINCT FROM auth.uid()");
  });
  it("3: legacy submission policy is removed; attachment access uses owner folders", () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "Referrers submit referrals"');
    expect(sql).toContain("(storage.foldername(name))[1]=r.referrer_id::text");
    expect(migration("0008")).not.toMatch(/file_url\s+LIKE/i);
  });
  it("4: public projection contains no private identifiers or coordinates", () => {
    for (const field of ["user_id", "plan", "subscription_status", "account_status", "is_disabled", "latitude", "longitude", "created_at", "updated_at"]) expect(PUBLIC_REFERRAL_PAGE_COLS.split(",")).not.toContain(field);
  });
  it("5: an email alone never grants admin; persisted role does", async () => {
    const db = (rows: unknown[]) => ({ from: () => { const q = { select: () => q, eq: () => q, limit: async () => ({ data: rows, error: null }) }; return q; } });
    expect(await isPlatformAdmin(db([]), { id: "owner", email: "admin@example.test" })).toBe(false);
    expect(await isPlatformAdmin(db([{ role: "admin" }]), { id: "owner" })).toBe(true);
  });
  it("6: signup rejects owner mismatch; attribution requires a recent business and stored click", () => {
    expect(fn("notify-business-signup/index.ts")).toContain("payload.user_id !== user.id");
    const source = fn("_shared/partner-attribution.ts");
    expect(source).toContain("30 * 60_000"); expect(source).toContain('.from("partner_clicks")'); expect(source).toContain("60 * 86400_000");
  });
  it("7: an unapproved live referral remains usable but noindex", () => {
    const html = renderBusinessDoc(read("index.html"), { name: "Roof", slug: "roof", category: "Roofing", offer_amount: "$100", index_approved: false });
    expect(html).toContain('content="noindex, follow"');
    expect(sql).toContain("NOT public.fn_offer_is_restricted_category(b.category)");
    expect(sql).toContain("NEW.index_approved:=false");
  });
  it("8: enforced invitation, ask and receipt caps plus private neutral sign-in", () => {
    expect(fn("send-notification/index.ts")).toContain('p_max_hits: 5');
    expect(sql).toContain("interval '1 hour',120"); expect(sql).toContain("THEN 300 ELSE 50");
    expect(fn("partner-apply/index.ts")).toContain("p_max_hits: 50");
    expect(sql).toContain("REVOKE INSERT ON public.referral_triggers");
    expect(fn("referrer-signin/index.ts")).toContain('JSON.stringify({ ok: true })');
    expect(sql).toContain("fn_me_email_eligible(text) FROM anon,authenticated");
    expect(button('https://example.test/" onclick="x', "Test")).not.toContain('" onclick="x');
  });
  it("9: owner body and merged tokens are plain text, not executable HTML", () => {
    expect(renderTokens(esc('<img src=x onerror=x> {name}'), { name: '<b>Pat</b>' }, true)).toBe('&lt;img src=x onerror=x&gt; &lt;b&gt;Pat&lt;/b&gt;');
    expect(fn("send-campaign/index.ts")).toContain("renderTokens(esc(bodyTemplate)");
  });
  it("10: anonymous Earn returns no token and queues delivery", () => {
    const source = migration("0012");
    expect(source).toContain("IF public.fn_email_owned() THEN RETURN r.token");
    expect(source).toContain("RETURN NULL"); expect(source).toContain("earn_global"); expect(source).toContain("earn_ip:");
    expect(source).toContain("public.enqueue_email('transactional_emails'");
  });
  it("11: webhooks reject insecure writes, check DNS and never follow redirects", () => {
    expect(sql).toContain("^https://([^/:?#]+)");
    const source = fn("dispatch-webhooks/index.ts"); expect(source).toContain("checkCronAuth(req)"); expect(source).toContain("validateWebhookDns(ep.url)"); expect(source).toContain("redirect: 'manual'");
  });
  it("12: one business per owner, no client lifecycle, and persistent trial history", () => {
    expect(sql).toContain("UNIQUE(user_id)"); expect(sql).toContain('DROP POLICY IF EXISTS "Owners manage business"'); expect(sql).toContain('DROP POLICY IF EXISTS "Owners delete business"'); expect(sql).toContain("IF n=0 THEN NEW.pro_trial_ends_at:=NULL");
  });
  it("13: unknown and older customers cannot enter a campaign and one-click headers exist", () => {
    expect(SEGMENTS.map(s => s.key)).toEqual(["m12_24", "m6_12", "recent"]);
    const recent = SEGMENTS.find(s => s.key === "recent"); if (!recent) throw new Error("recent missing");
    expect(inSegment({ created_at: new Date().toISOString(), last_job_at: null }, recent)).toBe(false);
    expect(inSegment({ created_at: "2020-01-01", last_job_at: "2020-01-01" }, recent)).toBe(false);
    expect(fn("_shared/resend-gateway.ts")).toContain('"List-Unsubscribe-Post": "List-Unsubscribe=One-Click"');
    expect(fn("handle-email-events/index.ts")).toContain("await suppress(event, 'hard_bounce')");
  });
  it("14: helper grants and cross-user role checks are constrained", () => {
    expect(sql).toContain("public.fn_release_invite_code(text),public.email_queue_dispatch()"); expect(sql).toContain("_user_id=auth.uid()");
  });
  it("15: partner email lookups use exact equality", () => {
    for (const name of ["partner-apply", "partner-resend-link"]) { const source=fn(`${name}/index.ts`); expect(source).toContain('.eq("email", email)'); expect(source).not.toContain('.ilike("email"'); }
  });
  it("16: public capture has bounded payload and no direct anonymous inserts", () => {
    expect(sql).toContain("length(p_data::text)"); expect(sql).toContain("REVOKE INSERT ON public.funnel_events,public.mock_inquiries,public.callback_requests,public.email_leads FROM anon");
    expect(read("src/lib/supabaseLazy.ts")).toContain("/rest/v1/rpc/fn_submit_public_capture");
  });
  it("18: private routes refuse frames while marketing stays embeddable; CSP permits payment forms", () => {
    for (const path of ["/dashboard", "/me", "/__sa", "/partners/dashboard", "/welcome"]) expect(protectedFramePath(path)).toBe(true);
    expect(protectedFramePath("/pricing")).toBe(false);
    expect(read("index.html")).toContain("object-src 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com https://billing.stripe.com");
  });
  it("17: restrictive image policies reject SVG and oversized files without loosening ownership", () => {
    const source = migration("0014");
    expect(source).toContain("AS RESTRICTIVE FOR INSERT"); expect(source).toContain("AS RESTRICTIVE FOR UPDATE");
    expect(source).toContain("'image/png','image/jpeg','image/webp'"); expect(source).not.toContain("image/svg+xml"); expect(source).toContain("<=2097152");
  });
  it("19: smoke Maps now requires backend credentials", () => { expect(fn("smoke-maps/index.ts")).toContain("checkCronAuth(req)"); });
  it("20: partner CSV uses formula-safe cells", () => { expect(fn("partner-admin/index.ts")).toContain("csvCell(cell)"); expect(fn("_shared/security.ts")).toContain("[=+\\-@]"); });
  it("21: actual SQL trigger rejects owner identity rewrites", () => { expect(sql).toContain("NEW.referrer_user_id IS DISTINCT FROM OLD.referrer_user_id OR NEW.status_token IS DISTINCT FROM OLD.status_token"); });
  it("22: authentication precedes JSON validation", () => {
    for (const name of ["send-push", "notify-deal-closed", "notify-referrer-reward"]) { const source=fn(`${name}/index.ts`); expect(source.indexOf("auth.getUser(token)")).toBeLessThan(source.indexOf("req.json()")); }
  });
  it("23: API source is allowed and raw ingestion errors are not returned", () => { expect(sql).toContain("''api''"); expect(fn("ingest-job-completed/index.ts")).not.toMatch(/details: error.message/); });
  it("24: remote imports are pinned to exact dependency versions", () => {
    function walk(dir: string): string[] { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : []); }
    for (const path of walk("supabase/functions")) for (const m of read(path).matchAll(/from ["']((?:npm:|https:\/\/esm.sh\/)[^"']+)["']/g)) expect(m[1], path).toMatch(/@\d+\.\d+\.\d+/);
  });
});