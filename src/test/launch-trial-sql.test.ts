// @vitest-environment node
// Pro trial starts at the first referral launch (migration 0045), not at signup.
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { migrationFunctions } from "./helpers/migrationFunctions";

let db: PGlite;
const fns = migrationFunctions();
const asService = "SELECT set_config('request.jwt.claim.role','service_role',false)";
const asOwner = (uid: string) => `SELECT set_config('request.jwt.claim.role','authenticated',false), set_config('request.jwt.claim.sub','${uid}',false)`;
const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, raw_user_meta_data jsonb);
    CREATE TABLE business_trial_history(user_id uuid PRIMARY KEY, granted_at timestamptz NOT NULL DEFAULT now(), launch_granted_at timestamptz);
    CREATE TABLE businesses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, plan text DEFAULT 'free', is_demo boolean DEFAULT false,
      category text, industry text, offer_amount text, acquisition jsonb, pro_trial_ends_at timestamptz, published_notified_at timestamptz);`);
  for (const name of ["fn_new_business_acquisition_trial", "fn_guard_first_trial", "fn_start_launch_trial"]) await db.exec(fns.get(name)!);
  await db.exec(`CREATE TRIGGER trg_acquisition_trial_guard BEFORE INSERT OR UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION fn_new_business_acquisition_trial();
    CREATE TRIGGER zzz_first_trial BEFORE INSERT ON businesses FOR EACH ROW EXECUTE FUNCTION fn_guard_first_trial();
    REVOKE ALL ON FUNCTION fn_start_launch_trial(uuid) FROM PUBLIC, anon, authenticated; GRANT EXECUTE ON FUNCTION fn_start_launch_trial(uuid) TO service_role;
    GRANT USAGE ON SCHEMA public, auth TO authenticated; GRANT SELECT, INSERT, UPDATE, DELETE ON businesses TO authenticated;`);
}, 30000);
afterAll(async () => { await db.close(); });

async function signup(n: number, extra = "") {
  await db.exec(`INSERT INTO auth.users VALUES('${u(n)}','{}') ON CONFLICT DO NOTHING; ${asService};
    INSERT INTO businesses(id,user_id${extra ? "," + extra.split("=")[0] : ""}) VALUES('${u(100 + n)}','${u(n)}'${extra ? "," + extra.split("=")[1] : ""});`);
  return u(100 + n);
}
const trialDays = async (id: string) => (await db.query<{ d: number | null }>(`SELECT round(extract(epoch FROM pro_trial_ends_at-now())/86400)::int d FROM businesses WHERE id='${id}'`)).rows[0]?.d ?? null;
const start = async (id: string) => { await db.exec(asService); return (await db.query<{ r: string }>(`SELECT fn_start_launch_trial('${id}') r`)).rows[0].r; };

it("new signup gets no trial, even if the insert asks for one", async () => {
  const id = await signup(1, "pro_trial_ends_at=now()+interval '30 days'");
  expect(await trialDays(id)).toBeNull();
  expect((await db.query(`SELECT 1 FROM business_trial_history WHERE user_id='${u(1)}'`)).rows).toHaveLength(0);
});

it("first launch starts 14 days, and a second call is a no-op", async () => {
  const id = u(101);
  expect(await start(id)).toBe("started");
  expect(await trialDays(id)).toBe(14);
  expect(await start(id)).toBe("already_used");
  expect(await trialDays(id)).toBe(14);
});

it("a running signup trial with fewer than 14 days left is extended to 14 days from the send, once", async () => {
  const id = await signup(2);
  await db.exec(`SELECT set_config('revvin.launch_trial','1',false); UPDATE businesses SET pro_trial_ends_at=now()+interval '3 days' WHERE id='${id}'; SELECT set_config('revvin.launch_trial','',false);
    INSERT INTO business_trial_history(user_id) VALUES('${u(2)}');`);
  expect(await start(id)).toBe("started");
  expect(await trialDays(id)).toBe(14);
  expect(await start(id)).toBe("already_used");
});

it("an expired signup trial with no launch gets 14 days at the first launch", async () => {
  const id = await signup(3);
  await db.exec(`SELECT set_config('revvin.launch_trial','1',false); UPDATE businesses SET pro_trial_ends_at=now()-interval '20 days' WHERE id='${id}'; SELECT set_config('revvin.launch_trial','',false);
    INSERT INTO business_trial_history(user_id) VALUES('${u(3)}');`);
  expect(await start(id)).toBe("started");
  expect(await trialDays(id)).toBe(14);
});

it("paying Pro and demo accounts are unaffected", async () => {
  const paid = await signup(4, "plan='pro'");
  expect(await start(paid)).toBe("paid");
  expect(await trialDays(paid)).toBeNull();
  const demo = await signup(5, "is_demo=true");
  expect(await start(demo)).toBe("demo");
  expect(await trialDays(demo)).toBeNull();
});

it("a client cannot start, extend or call the trial function", async () => {
  const id = await signup(6);
  await db.exec(`${asOwner(u(6))}; SET ROLE authenticated;`);
  try {
  await expect(db.exec(`UPDATE businesses SET pro_trial_ends_at=now()+interval '14 days' WHERE id='${id}'`)).rejects.toThrow("Trial expiry is managed by the server");
  // Clients cannot run set_config through the Data API; the flag alone is also
  // not enough in production, where the session user is never postgres.
  await expect(db.query(`SELECT fn_start_launch_trial('${id}')`)).rejects.toThrow("permission denied for function fn_start_launch_trial");
  } finally { await db.exec("RESET ROLE"); }
  expect(await trialDays(id)).toBeNull();
});

it("deleting and recreating a business does not grant a second trial", async () => {
  const id = await signup(7);
  expect(await start(id)).toBe("started");
  await db.exec(`DELETE FROM businesses WHERE id='${id}'; INSERT INTO businesses(id,user_id) VALUES('${u(207)}','${u(7)}');`);
  expect(await trialDays(u(207))).toBeNull();
  expect(await start(u(207))).toBe("already_used");
  expect(await trialDays(u(207))).toBeNull();
});
