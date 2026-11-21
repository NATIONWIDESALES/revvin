// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
import { signupCategory, SIGNUP_TRADES } from "@/lib/signupTrade";

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid, raw_user_meta_data jsonb);
    CREATE TABLE public.businesses(user_id uuid, category text, industry text, acquisition jsonb, offer_amount text, pro_trial_ends_at timestamptz, published_notified_at timestamptz);`);
  await db.exec(readFileSync("drizzle/migrations/0019_keep_prospect_code_on_signup.sql", "utf8"));
  await db.exec(`CREATE TRIGGER acquisition BEFORE INSERT ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.fn_new_business_acquisition_trial();`);
}, 30000);
afterAll(async () => { await db?.close(); });
it.each(SIGNUP_TRADES)("existing insert trigger persists mapped signup category for %s", async trade => {
  const id = crypto.randomUUID();
  const category = signupCategory(trade);
  await db.query("INSERT INTO auth.users VALUES ($1,$2)", [id, JSON.stringify({ role: "business", signup_trade: trade, preview_trade: category })]);
  await db.query("INSERT INTO public.businesses(user_id) VALUES ($1)", [id]);
  const { rows } = await db.query<{ category: string }>("SELECT category FROM public.businesses WHERE user_id=$1", [id]);
  expect(rows[0].category).toBe(category);
});