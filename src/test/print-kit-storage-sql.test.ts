// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const OWNER = "11111111-1111-1111-1111-111111111111";
const MINE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const THEIRS = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

async function setup() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA storage; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true),'')::uuid $$;
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
    CREATE FUNCTION storage.extension(text) RETURNS text LANGUAGE sql AS $$ SELECT reverse(split_part(reverse($1),'.',1)) $$;
    CREATE TABLE public.businesses(id uuid PRIMARY KEY, user_id uuid, name text);
    -- Business names that look like folders prove the policy reads the object name, not the business name.
    INSERT INTO public.businesses VALUES ('${MINE}','${OWNER}','${THEIRS}/x'),('${THEIRS}','22222222-2222-2222-2222-222222222222','${MINE}/x');
    CREATE TABLE storage.objects(bucket_id text, name text);
    GRANT USAGE ON SCHEMA storage, auth, public TO authenticated;
    GRANT SELECT ON public.businesses TO authenticated; GRANT INSERT ON storage.objects TO authenticated;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`);
  await db.exec(readFileSync("drizzle/migrations/0047_fix_print_kit_upload_policy.sql", "utf8").replace(/--> statement-breakpoint/g, ""));
  await db.exec(`SET test.uid = '${OWNER}'; SET ROLE authenticated;`);
  return db;
}
const put = (db: PGlite, bucket: string, name: string) => db.query("INSERT INTO storage.objects(bucket_id,name) VALUES ($1,$2)", [bucket, name]);

describe("print kit upload policy", () => {
  it("owner can upload a PDF into their own business folder", async () => {
    const db = await setup();
    try { await expect(put(db, "print-kits", `${MINE}/123/yard-sign.pdf`)).resolves.toBeTruthy(); } finally { await db.close(); }
  }, 30000);
  it("owner cannot upload into another business's folder", async () => {
    const db = await setup();
    try { await expect(put(db, "print-kits", `${THEIRS}/123/yard-sign.pdf`)).rejects.toThrow(/row-level security/); } finally { await db.close(); }
  }, 30000);
  it("owner cannot upload a non-pdf name", async () => {
    const db = await setup();
    try { await expect(put(db, "print-kits", `${MINE}/123/yard-sign.png`)).rejects.toThrow(/row-level security/); } finally { await db.close(); }
  }, 30000);
});
