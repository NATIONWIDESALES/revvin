# Image upload fix, November 16, 2026

## Status

Client changes completed, frontend not published. Production uploads remain blocked because the storage configuration prerequisite could not be applied with the available tools. No database change was applied and no policies were removed.

The bucket update tool exposes only public/private and file size, not allowed MIME types. Both live buckets currently have `file_size_limit = 2097152` and `allowed_mime_types = NULL`. Platform instructions prohibit updating `storage.buckets` through SQL. Removing the policies without bucket MIME restrictions would weaken security, so the attempted migration includes a fail-closed prerequisite assertion. That assertion correctly rejected the migration and the migration tool rolled back its file and journal entry.

## Files changed

- `src/lib/imageUpload.ts`: rasterise SVG through Image, use 512-square fallback dimensions, try PNG then WEBP at quality 0.9, shrink the longest edge down to 256, enforce output below 2,000,000 bytes, allow only bounded raster fallbacks, match file extensions to MIME type, retain storage error logging.
- `src/components/BusinessLogoUpload.tsx`: update the supported-format/resizing helper line; keep original 15 MB check.
- `src/components/dashboard/PageBrandingEditor.tsx`: update the cover-image helper line; keep original 15 MB check.
- `src/test/image-upload.test.ts`: eight unit cases covering WEBP fallback, progressive resizing, SVG rasterisation, undecodable unsupported input, three raster extensions, and oversized fallback rejection.
- `src/test/image-upload-storage.test.ts`: isolated PostgreSQL assertion covering prerequisite failure, removal of only the two broken policies, preservation of sibling policies, and exact bucket limits/types.
- `docs/image-upload-fix-2026-11-16.md`: this changelog, blocked migration SQL, rollback instructions and verification limits.

`AvatarUpload.tsx` has no similar format helper line, so it is unchanged. Its 15 MB pre-check remains intact.

## Migration

Intended next migration: `0030_image_upload_bucket_enforcement.sql`. **Not recorded or applied**, because its prerequisite failed. The migration tool removed the failed file/journal entry. Before retrying, configure both buckets through the Storage API with `allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"]` and `fileSizeLimit: 2097152`, preserving all other bucket settings. The available tool cannot perform the MIME configuration.

Attempted SQL below; no public-schema policies are touched:

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
- Live database read confirms the reported restrictive policies and missing bucket MIME limits. Migration attempt failed safely; the production fix is not applied.
- Real authenticated upload/read-back and native browser format decoding are not verified. Unit tests mock canvas and storage; the SQL test uses isolated PostgreSQL and does not establish production success.
- No edge functions redeployed, no frontend published, no Stripe, routes, prices, emails or dashboard layout changes.
### Final results

- Full Vitest: 976 passed, 3 skipped (75 test files passed, 1 skipped).
- Final typecheck: clean, exit 0.
- Preview build telemetry: build OK.
- Production migration remains blocked and unapplied.
