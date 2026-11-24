// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const OWNER = "11111111-1111-1111-1111-111111111111";
const REF_MINE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const REF_THEIRS = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const file = readdirSync("drizzle/migrations").find((f) => f.includes("fix_referral_attachments_owner_read"))!;

describe("business owners read referral attachments", () => {
  it("owner reads only attachments under their own business's referrals", async () => {
    const db = new PGlite();
    try {
      await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA storage; CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true),'')::uuid $$;
        CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
        CREATE TABLE public.businesses(id uuid PRIMARY KEY, user_id uuid, name text);
        CREATE TABLE public.referrals(id serial, business_id uuid, referrer_id uuid);
        INSERT INTO public.businesses VALUES ('c0000000-0000-0000-0000-000000000001','${OWNER}','${REF_THEIRS}/x'),
          ('c0000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','${REF_MINE}/x');
        INSERT INTO public.referrals(business_id, referrer_id) VALUES ('c0000000-0000-0000-0000-000000000001','${REF_MINE}'),('c0000000-0000-0000-0000-000000000002','${REF_THEIRS}');
        CREATE TABLE storage.objects(bucket_id text, name text);
        INSERT INTO storage.objects VALUES ('referral-attachments','${REF_MINE}/photo.jpg'),('referral-attachments','${REF_THEIRS}/photo.jpg'),('other','${REF_MINE}/photo.jpg');
        GRANT USAGE ON SCHEMA storage, auth, public TO authenticated;
        GRANT SELECT ON public.businesses, public.referrals, storage.objects TO authenticated;
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`);
      await db.exec(readFileSync(`drizzle/migrations/${file}`, "utf8").replace(/--> statement-breakpoint/g, ""));
      await db.exec(`SET test.uid = '${OWNER}'; SET ROLE authenticated;`);
      const rows = (await db.query<{ bucket_id: string; name: string }>("SELECT bucket_id, name FROM storage.objects")).rows;
      expect(rows).toEqual([{ bucket_id: "referral-attachments", name: `${REF_MINE}/photo.jpg` }]);
    } finally { await db.close(); }
  }, 30000);
});
