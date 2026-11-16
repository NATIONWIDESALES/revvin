// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

describe("image bucket enforcement safety", () => {
  it("requires exact bucket restrictions before removing only the broken checks", async () => {
    const db = new PGlite();
    try {
      await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA storage;
        CREATE TABLE storage.buckets(id text PRIMARY KEY, allowed_mime_types text[], file_size_limit bigint);
        CREATE TABLE storage.objects(bucket_id text, metadata jsonb, name text);
        INSERT INTO storage.buckets VALUES('business-logos',NULL,2097152),('avatars',NULL,2097152);
        CREATE POLICY "Users can upload their own logo" ON storage.objects FOR INSERT WITH CHECK (true);
        CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (true);
        CREATE POLICY "Authenticated users upload referral attachments" ON storage.objects FOR INSERT WITH CHECK (true);`);
      await db.exec(readFileSync("drizzle/migrations/0014_security_image_upload_policy.sql", "utf8"));
      const sql = readFileSync("docs/image-upload-fix-2026-11-16.md", "utf8").split("```sql\n")[1].split("```")[0];
      await expect(db.exec(sql)).rejects.toThrow("Configure both image buckets");
      expect((await db.query("SELECT policyname FROM pg_policies WHERE permissive='RESTRICTIVE'")).rows).toHaveLength(2);
      // Represents configuration by the Storage API in this isolated fixture only.
      await db.exec(`UPDATE storage.buckets SET allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp'];`);
      await db.exec(sql);
      expect((await db.query("SELECT policyname FROM pg_policies WHERE permissive='RESTRICTIVE'")).rows).toEqual([]);
      expect((await db.query("SELECT policyname FROM pg_policies ORDER BY policyname")).rows).toEqual([
        { policyname: "Authenticated users upload referral attachments" },
        { policyname: "Users can upload their own logo" },
        { policyname: "Users upload own avatar" },
      ]);
      expect((await db.query("SELECT id, allowed_mime_types, file_size_limit::integer FROM storage.buckets ORDER BY id")).rows).toEqual([
        { id: "avatars", allowed_mime_types: ["image/png","image/jpeg","image/webp"], file_size_limit: 2097152 },
        { id: "business-logos", allowed_mime_types: ["image/png","image/jpeg","image/webp"], file_size_limit: 2097152 },
      ]);
    } finally { await db.close(); }
  }, 30000);

  it("adds owner SELECT policies for upsert without touching other policies", async () => {
    const db = new PGlite();
    try {
      await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA storage; CREATE SCHEMA auth;
        CREATE TABLE storage.objects(bucket_id text, metadata jsonb, name text);
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
        CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1, '/') $$;
        CREATE POLICY "Users can upload their own logo" ON storage.objects FOR INSERT WITH CHECK (true);
        CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (true);`);
      await db.exec(readFileSync("drizzle/migrations/0031_image_upload_owner_select.sql", "utf8"));
      expect((await db.query("SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'objects' ORDER BY policyname")).rows).toEqual([
        { policyname: "Owners read own avatar objects", cmd: "SELECT", permissive: "PERMISSIVE" },
        { policyname: "Owners read own logo objects", cmd: "SELECT", permissive: "PERMISSIVE" },
        { policyname: "Users can upload their own logo", cmd: "INSERT", permissive: "PERMISSIVE" },
        { policyname: "Users upload own avatar", cmd: "INSERT", permissive: "PERMISSIVE" },
      ]);
      // Re-runnable: DROP POLICY IF EXISTS before CREATE.
      await db.exec(readFileSync("drizzle/migrations/0031_image_upload_owner_select.sql", "utf8"));
      expect((await db.query("SELECT count(*)::int AS n FROM pg_policies WHERE tablename = 'objects'")).rows[0]).toEqual({ n: 4 });
    } finally { await db.close(); }
  }, 30000);
});