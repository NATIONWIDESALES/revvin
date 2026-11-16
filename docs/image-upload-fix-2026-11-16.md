# Image upload fix, November 16, 2026

## Status

Migration `0030_image_upload_bucket_enforcement.sql` is applied to the live database. Both buckets were verified before and after application to allow exactly PNG, JPEG and WEBP with a 2097152-byte limit. The two broken restrictive policies are gone; all 11 other storage policies are unchanged. Frontend not published. Real authenticated upload/read-back remains unverified.

The initial attempt failed safely because bucket MIME restrictions were absent. The prerequisite was subsequently configured externally and confirmed by a live read query. The documented fail-closed migration was rerun without changing its SQL and applied successfully.

## Files changed

- `src/lib/imageUpload.ts`: rasterise SVG through Image, use 512-square fallback dimensions, try PNG then WEBP at quality 0.9, shrink the longest edge down to 256, enforce output below 2,000,000 bytes, allow only bounded raster fallbacks, match file extensions to MIME type, retain storage error logging.
- `src/components/BusinessLogoUpload.tsx`: update the supported-format/resizing helper line; keep original 15 MB check.
- `src/components/dashboard/PageBrandingEditor.tsx`: update the cover-image helper line; keep original 15 MB check.
- `src/test/image-upload.test.ts`: eight unit cases covering WEBP fallback, progressive resizing, SVG rasterisation, undecodable unsupported input, three raster extensions, and oversized fallback rejection.
- `src/test/image-upload-storage.test.ts`: isolated PostgreSQL assertion covering prerequisite failure, removal of only the two broken policies, preservation of sibling policies, and exact bucket limits/types.
- `docs/image-upload-fix-2026-11-16.md`: this changelog, blocked migration SQL, rollback instructions and verification limits.

`AvatarUpload.tsx` has no similar format helper line, so it is unchanged. Its 15 MB pre-check remains intact.

## Migration

Applied migration: `drizzle/migrations/0030_image_upload_bucket_enforcement.sql`, with the rollback comment below. The migration tool also recorded its journal entry and snapshot. No bucket settings were changed by this migration.

Applied SQL below; no public-schema policies are touched:

```sql
/* Rollback SQL (restore the original checks before restoring bucket settings):
CREATE POLICY "Raster image uploads only" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (bucket_id NOT IN ('business-logos','avatars') OR (metadata->>'mimetype' IN ('image/png','image/jpeg','image/webp') AND CASE WHEN metadata->>'size' ~ '^[0-9]{1,10}$' THEN (metadata->>'size')::bigint<=2097152 ELSE false END));
CREATE POLICY "Raster image updates only" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated WITH CHECK (bucket_id NOT IN ('business-logos','avatars') OR (metadata->>'mimetype' IN ('image/png','image/jpeg','image/webp') AND CASE WHEN metadata->>'size' ~ '^[0-9]{1,10}$' THEN (metadata->>'size')::bigint<=2097152 ELSE false END));
Original bucket settings: allowed_mime_types NULL, file_size_limit 2097152 for both buckets. Restore MIME settings through the Storage API, not SQL.
*/
DO $$ BEGIN
  IF (SELECT count(*) FROM storage.buckets WHERE id IN ('business-logos','avatars') AND file_size_limit = 2097152 AND cardinality(allowed_mime_types) = 3 AND allowed_mime_types @> ARRAY['image/png','image/jpeg','image/webp']::text[]) <> 2 THEN
    RAISE EXCEPTION 'Configure both image buckets with PNG, JPEG, WEBP and 2097152-byte limits through the Storage API before removing the restrictive policies';
  END IF;
END $$;
DROP POLICY "Raster image uploads only" ON storage.objects;
DROP POLICY "Raster image updates only" ON storage.objects;
```

## Verification

- Full Vitest suite before the additional SQL assertion: 975 passed, 3 skipped.
- Typecheck: clean (`tsgo -b --noEmit`).
- Preview build telemetry: build OK.
- Final full-suite results are recorded below after rerunning with the SQL assertion.
- Live database reads before and after the successful migration confirm exact bucket limits/types and removal of only the two named restrictive policies.
- Real authenticated upload/read-back and native browser format decoding are not verified. Unit tests mock canvas and storage; the SQL test uses isolated PostgreSQL and does not establish production success.
- No edge functions redeployed, no frontend published, no Stripe, routes, prices, emails or dashboard layout changes.
### Final results

- Full Vitest: 976 passed, 3 skipped (75 test files passed, 1 skipped).
- Final typecheck: clean, exit 0.
- Preview build telemetry: build OK.
- Production migration 0030 is applied and verified by live policy/bucket reads.

## Follow-up changelog, November 16, 2026

- `drizzle/migrations/0030_image_upload_bucket_enforcement.sql`: recorded and applied the exact documented prerequisite assertion and two policy drops, retaining the rollback comment.
- `drizzle/migrations/meta/_journal.json` and `drizzle/migrations/meta/0030_snapshot.json`: migration-tool-generated history and snapshot.
- `docs/image-upload-fix-2026-11-16.md`: updated status, migration outcome and verification results.
- No application code changed, no additional policy changes, no Stripe changes, no edge deployments and no frontend publication.
- Compared all remaining storage policies before and after: names, roles, commands, permissiveness, USING expressions and WITH CHECK expressions are unchanged across all 11 policies, including owner-folder and referral-attachment policies.
- Tests added: none in this follow-up. Existing image-upload and isolated PostgreSQL regression tests rerun; results below.
- Real authenticated upload/read-back remains unverified; database verification confirms the reported policy blocker is removed.

- Follow-up regression results: 9 tests passed across 2 files. Full suite/typecheck were not rerun for this migration-only follow-up; earlier results above remain historical.
