// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Prebuilt prospect pages: schema guards, RLS, RPC behavior, expiry and scrub,
 * robots/sitemap exclusion, script templates, preview handoff and Clarity
 * gating. The SQL tests run the real migration in an isolated PostgreSQL.
 */

const MIGRATION = readFileSync("drizzle/migrations/0017_prospect_pages.sql", "utf8");
const PEEK_MIGRATION = readFileSync("drizzle/migrations/0018_prospect_peek.sql", "utf8");

describe("prospect_pages migration SQL", () => {
  it("creates the table with RLS and no anon grant", () => {
    expect(MIGRATION).toContain("CREATE TABLE public.prospect_pages");
    expect(MIGRATION).toContain("ALTER TABLE public.prospect_pages ENABLE ROW LEVEL SECURITY");
    expect(MIGRATION).not.toMatch(/GRANT .* ON public\.prospect_pages TO anon/);
    expect(MIGRATION).toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_pages TO authenticated");
    expect(MIGRATION).toContain("GRANT ALL ON public.prospect_pages TO service_role");
  });
  it("scopes every policy to the admin or sales role", () => {
    const policies = MIGRATION.match(/CREATE POLICY[\s\S]*?;/g) ?? [];
    expect(policies.length).toBe(4);
    for (const policy of policies) {
      expect(policy).toContain("has_role");
      expect(policy).toMatch(/'admin'/);
    }
  });
  it("rate limits the public view and remove functions", () => {
    expect(MIGRATION).toMatch(/fn_prospect_view[\s\S]*fn_rate_bucket_hit\('prospect_view:/);
    expect(MIGRATION).toMatch(/fn_prospect_remove[\s\S]*fn_rate_bucket_hit\('prospect_remove:/);
  });
  it("keeps view and peek functions service-role only", () => {
    expect(MIGRATION).toContain("REVOKE ALL ON FUNCTION public.fn_prospect_view(text) FROM PUBLIC, anon, authenticated");
    expect(PEEK_MIGRATION).toContain("REVOKE ALL ON FUNCTION public.fn_prospect_peek(text) FROM PUBLIC, anon, authenticated");
  });
  it("never returns phone, website or notes to the public preview", () => {
    const viewFn = MIGRATION.slice(MIGRATION.indexOf("fn_prospect_view"), MIGRATION.indexOf("fn_prospect_remove"));
    const returned = viewFn.slice(viewFn.lastIndexOf("jsonb_build_object"));
    expect(returned).not.toContain("'phone'");
    expect(returned).not.toContain("'website'");
    expect(returned).not.toContain("'notes'");
    expect(returned).not.toContain("google_place_id");
  });
  it("schedules the daily expiry job", () => {
    expect(MIGRATION).toContain("prospect-expiry-daily");
    expect(MIGRATION).toContain("fn_prospect_expire");
  });
});

describe("prospect_pages in isolated PostgreSQL", () => {
  let db: PGlite;
  const owner = "00000000-0000-4000-8000-000000000001";
  const business = "00000000-0000-4000-8000-000000000002";
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${owner}'::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated'::text $$;
      CREATE TABLE auth.users(id uuid, email text);
      INSERT INTO auth.users VALUES('${owner}', 'caller@revvin.co');
      CREATE TABLE public.businesses(id uuid PRIMARY KEY, user_id uuid, name text, acquisition jsonb);
      INSERT INTO public.businesses VALUES('${business}', '${owner}', 'Acme Roofing', '{"prospect_code":"abc123def456"}');
      CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), referral_id uuid, actor_id uuid, event_type text, payload jsonb, created_at timestamptz DEFAULT now());
      CREATE FUNCTION public.has_role(uuid, text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
      CREATE FUNCTION public.fn_rate_bucket_hit(text, interval, integer) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
      CREATE FUNCTION public.fn_request_bucket() RETURNS text LANGUAGE sql AS $$ SELECT 'test' $$;
      CREATE FUNCTION public.enqueue_email(text, jsonb) RETURNS void LANGUAGE sql AS $$ SELECT $$;
      CREATE EXTENSION IF NOT EXISTS pg_cron;`);
    await db.exec(MIGRATION.replace(/SELECT cron\.schedule\([\s\S]*?\$\$;/, "SELECT 1;"));
    await db.exec(PEEK_MIGRATION);
  }, 30000);
  afterAll(async () => { await db.close(); });

  it("counts views, marks viewed and returns only safe fields", async () => {
    await db.exec(`INSERT INTO public.prospect_pages(code, name, trade, phone, notes) VALUES('abc123def456', 'Acme Roofing', 'roofing', '555-0100', 'internal note')`);
    const { rows } = await db.query<any>(`SELECT public.fn_prospect_view('abc123def456') AS v`);
    expect(rows[0].v.name).toBe("Acme Roofing");
    expect(rows[0].v.phone).toBeUndefined();
    expect(rows[0].v.notes).toBeUndefined();
    const { rows: r2 } = await db.query<any>(`SELECT status, view_count, first_viewed_at FROM public.prospect_pages WHERE code='abc123def456'`);
    expect(r2[0].status).toBe("viewed");
    expect(r2[0].view_count).toBe(1);
    expect(r2[0].first_viewed_at).not.toBeNull();
  });

  it("peek does not count a view", async () => {
    const { rows } = await db.query<any>(`SELECT public.fn_prospect_peek('abc123def456') AS v`);
    expect(rows[0].v.name).toBe("Acme Roofing");
    const { rows: r2 } = await db.query<any>(`SELECT view_count FROM public.prospect_pages WHERE code='abc123def456'`);
    expect(r2[0].view_count).toBe(1);
  });

  it("rejects unknown and malformed codes", async () => {
    await expect(db.query(`SELECT public.fn_prospect_view('nope')`)).rejects.toThrow();
    await expect(db.query(`SELECT public.fn_prospect_view('aaaaaaaaaa')`)).rejects.toThrow();
  });

  it("claims only when the business carries the matching prospect code", async () => {
    await expect(db.query(`SELECT public.fn_prospect_claim('abc123def456', '${business}')`)).resolves.toBeTruthy();
    const { rows } = await db.query<any>(`SELECT status, claimed_business_id FROM public.prospect_pages WHERE code='abc123def456'`);
    expect(rows[0].status).toBe("claimed");
    expect(rows[0].claimed_business_id).toBe(business);
    // A second claim is refused.
    await expect(db.query(`SELECT public.fn_prospect_claim('abc123def456', '${business}')`)).rejects.toThrow("not_found");
  });

  it("refuses claims from a business without the code in its acquisition", async () => {
    await db.exec(`INSERT INTO public.prospect_pages(code, name, trade) VALUES('zzz999yyy888', 'Other Co', 'plumbing')`);
    await db.exec(`INSERT INTO public.businesses VALUES('00000000-0000-4000-8000-000000000009', '${owner}', 'Unrelated', '{}')`);
    await expect(db.query(`SELECT public.fn_prospect_claim('zzz999yyy888', '00000000-0000-4000-8000-000000000009')`)).rejects.toThrow("code_mismatch");
  });

  it("remove marks the page removed and the view then fails", async () => {
    await db.query(`SELECT public.fn_prospect_remove('zzz999yyy888')`);
    const { rows } = await db.query<any>(`SELECT status, removed_at FROM public.prospect_pages WHERE code='zzz999yyy888'`);
    expect(rows[0].status).toBe("removed");
    expect(rows[0].removed_at).not.toBeNull();
    await expect(db.query(`SELECT public.fn_prospect_view('zzz999yyy888')`)).rejects.toThrow("not_found");
  });

  it("expires old pages and scrubs contact details 30 days later", async () => {
    await db.exec(`INSERT INTO public.prospect_pages(code, name, trade, phone, website, notes, expires_at)
      VALUES('old123old123', 'Old Co', 'hvac', '555-0101', 'https://old.example', 'note', now() - interval '31 days')`);
    let { rows } = await db.query<any>(`SELECT public.fn_prospect_expire() AS r`);
    expect(rows[0].r.expired).toBe(1);
    // Not scrubbed yet: only 1 day past expiry.
    let { rows: r2 } = await db.query<any>(`SELECT phone FROM public.prospect_pages WHERE code='old123old123'`);
    expect(r2[0].phone).toBe("555-0101");
    await db.exec(`UPDATE public.prospect_pages SET expires_at = now() - interval '61 days' WHERE code='old123old123'`);
    ({ rows } = await db.query<any>(`SELECT public.fn_prospect_expire() AS r`));
    expect(rows[0].r.scrubbed).toBe(1);
    ({ rows: r2 } = await db.query<any>(`SELECT phone, website, notes FROM public.prospect_pages WHERE code='old123old123'`));
    expect(r2[0]).toEqual({ phone: null, website: null, notes: null });
  });
});

describe("robots, sitemap and feeds", () => {
  it("robots.txt disallows /preview/ in every user-agent group", () => {
    const robots = readFileSync("public/robots.txt", "utf8");
    const groups = robots.split(/(?=User-agent:)/).filter((g) => g.startsWith("User-agent:"));
    expect(groups.length).toBeGreaterThanOrEqual(3);
    for (const group of groups) {
      expect(group).toContain("Disallow: /preview/");
    }
  });
  it("no prerendered route or sitemap entry is a preview page", async () => {
    const { PRERENDER_ROUTES } = await import("../content/seoRoutes");
    expect(PRERENDER_ROUTES.some((r) => r.path.startsWith("/preview"))).toBe(false);
    const { indexableRoutes } = await import("../../plugins/sitemap");
    expect(indexableRoutes().some((r) => r.path.startsWith("/preview"))).toBe(false);
  });
  it("llms.txt does not mention preview pages", () => {
    const llms = readFileSync("public/llms.txt", "utf8");
    expect(llms).not.toContain("/preview/");
  });
});

describe("outreach scripts", () => {
  it("fills every placeholder and never leaves one behind", async () => {
    const { PROSPECT_TEXT_SCRIPT, PROSPECT_EMAIL_SCRIPT, PROSPECT_EMAIL_SUBJECT, fillScript } = await import("../content/prospectScripts");
    for (const template of [PROSPECT_TEXT_SCRIPT, PROSPECT_EMAIL_SCRIPT, PROSPECT_EMAIL_SUBJECT]) {
      const filled = fillScript(template, { business: "Acme Roofing", link: "https://revvin.co/preview/abc123def456", caller: "Sam" });
      expect(filled).not.toMatch(/\{[^}]+\}/);
      expect(filled).toContain("Acme Roofing");
      expect(filled).toContain("https://revvin.co/preview/abc123def456");
    }
  });
  it("falls back to 'there' when no first name is known", async () => {
    const { PROSPECT_TEXT_SCRIPT, fillScript } = await import("../content/prospectScripts");
    expect(fillScript(PROSPECT_TEXT_SCRIPT, { business: "Acme", link: "x", caller: "Sam" })).toContain("Hi there,");
  });
  it("contains no em dashes", async () => {
    const { PROSPECT_TEXT_SCRIPT, PROSPECT_EMAIL_SCRIPT, PROSPECT_EMAIL_SUBJECT } = await import("../content/prospectScripts");
    for (const s of [PROSPECT_TEXT_SCRIPT, PROSPECT_EMAIL_SCRIPT, PROSPECT_EMAIL_SUBJECT]) {
      expect(s).not.toContain("—");
    }
  });
});

describe("preview handoff into signup", () => {
  it("carries prospect fields through the preview data", async () => {
    const { readPreview } = await import("../lib/instantPreview");
    const search = "?name=Acme%20Roofing&trade=roofing&reward=250&landing_path=/preview/abc123def456&city=Denver&region=CO&country=US&prospect_code=abc123def456&utm_source=outbound&utm_medium=prebuilt";
    const data = readPreview(search);
    expect(data?.prospect_code).toBe("abc123def456");
    expect(data?.city).toBe("Denver");
    expect(data?.landing_path).toBe("/preview/abc123def456");
    expect(data?.utm_source).toBe("outbound");
  });
  it("rejects a malformed prospect code and non-US/CA country", async () => {
    const { readPreview } = await import("../lib/instantPreview");
    const data = readPreview("?name=Acme&trade=roofing&reward=100&prospect_code=bad&country=GB");
    expect(data?.prospect_code).toBeUndefined();
    expect(data?.country).toBeUndefined();
  });
  it("adds prospect fields to the acquisition snapshot", async () => {
    const { acquisitionOf } = await import("../lib/instantPreview");
    const acq = acquisitionOf({ name: "Acme", trade: "roofing", reward: 100, landing_path: "/preview/abc123def456", prospect_code: "abc123def456", utm_source: "outbound", utm_medium: "prebuilt" });
    expect(acq).toMatchObject({ prospect_code: "abc123def456", utm_source: "outbound", utm_medium: "prebuilt" });
  });
});

describe("Clarity session recording slot", () => {
  it("is empty by default", async () => {
    const { CLARITY_PROJECT_ID } = await import("../config/brand");
    expect(CLARITY_PROJECT_ID).toBe("");
  });
  it("never loads on dashboard, referral forms or /me", () => {
    const source = readFileSync("src/components/ClarityLoader.tsx", "utf8");
    expect(source).toContain('path.startsWith("/dashboard")');
    expect(source).toContain('path.startsWith("/r/")');
    expect(source).toContain('path.startsWith("/me")');
    expect(source).toContain("masking");
  });
  it("privacy page mentions recording only when enabled", () => {
    const source = readFileSync("src/content/legal.ts", "utf8");
    expect(source).toContain("CLARITY_PROJECT_ID");
    expect(source).toContain("Session recording.");
  });
});

describe("Earn network hidden until a metro is live", () => {
  it("earnLive defaults to hidden and caches the metro check", async () => {
    const source = readFileSync("src/lib/earnLive.ts", "utf8");
    expect(source).toContain("cached === true");
    expect(source).toContain("liveMetros");
  });
  it("homepage, nav and footer gate Earn links on it", () => {
    expect(readFileSync("src/pages/Index.tsx", "utf8")).toContain("useEarnLive");
    expect(readFileSync("src/components/Navbar.tsx", "utf8")).toContain("useEarnLive");
    expect(readFileSync("src/components/Footer.tsx", "utf8")).toContain("useEarnLive");
  });
});

describe("preview page guards", () => {
  const page = readFileSync("src/pages/ProspectPreview.tsx", "utf8");
  it("is noindex, nofollow", () => {
    expect(page).toContain("noindex");
    expect(page).toContain("follow={false}");
  });
  it("shows the always-visible affiliation banner", () => {
    expect(page).toContain("Preview built by Revvin for");
    expect(page).toContain("Not active and not affiliated with");
  });
  it("accepts no referrals: the form is disabled and nothing submits", () => {
    expect(page).toContain("fieldset disabled");
    expect(page).not.toContain("fn_submit_public_referral");
    expect(page).not.toContain("referralSubmit");
  });
  it("shows no reviews, ratings or testimonials", () => {
    expect(page.toLowerCase()).not.toContain("review");
    expect(page.toLowerCase()).not.toContain("rating");
    expect(page.toLowerCase()).not.toContain("testimonial");
  });
  it("has the neutral unavailable page and one-tap removal", () => {
    expect(page).toContain("This preview isn't available");
    expect(page).toContain("Removed. Sorry for the bother.");
    expect(page).toContain("fn_prospect_remove");
  });
  it("contains no em dashes", () => {
    expect(page).not.toContain("—");
  });
});
