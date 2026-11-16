# Origami marketing visitor snippet

## Changelog

- `src/lib/origami.ts`: narrow marketing route allowlist, GPC/DNT and existing bot-check gates, isolated snippet using the supplied publishable key.
- `src/components/OrigamiVisitors.tsx`: client-only loading after two animation frames, one load per document, removal when leaving marketing pages.
- `src/App.tsx`: mount the invisible loader next to the existing measurement components.
- `src/content/legal.ts`: requested Origami paragraph, isolation disclosure, current Lovable visitor analytics disclosure, Privacy Policy date November 16, 2026. Terms unchanged.
- `src/test/origami.test.tsx`: 35 tests covering marketing routes, excluded routes, GPC, DNT, bots, delayed loading, duplicate prevention, private-route disposal and server rendering.
- `AGENTS.md`: record the provider isolation boundary.
- `roadmap.md`: record completed work and remaining verification limit.
- `docs/origami-visitors-2026-11-16.md`: this changelog.

## Verification

- Full suite: 1,084 passed, 3 skipped. First unrestricted run hit unrelated database-test timeouts; rerun with two workers passed all tests.
- Typecheck: `oj typecheck -b --noEmit` passed.
- Preview build signal: build OK.
- Browser: marketing page initiated provider activity, marketing navigation retained one frame, referral navigation destroyed the frame, return to marketing did not load again in the same document. Referral, preview, dashboard, admin, print, auth, Earn and Me pages initiated no provider requests. GPC, DNT and bot sessions initiated no provider requests. No browser errors observed.
- Provider traffic was intercepted in the browser check, with the current downloaded script used for execution. No real visitor event was intentionally sent for verification.

## Provider behavior and limitations

The current remote script writes an `_ov_vid` cookie and hooks SPA history automatically. Loading it in the top document would let it observe later private URLs even if its script tag were removed. It therefore runs in an opaque `allow-scripts` sandbox with no referrer. It cannot access the parent page, cookies or forms, and destroying the frame stops its running code. Its cookie attempts are blocked by the sandbox. No identity commands or page data are sent from the application.

This preserves company-level network lookup but intentionally does not forward individual marketing page paths to Origami. Origami receives its isolated document path, not the parent SPA path. Actual provider receipt, company matching and compatibility with cookie-blocked isolated operation remain unverified and must not be inferred from the intercepted browser request.

No consent banner added. No Stripe, RLS, migrations, edge functions or customer-facing layouts changed. No frontend publish performed.

## Revert

Remove `OrigamiVisitors` from `src/App.tsx` and remove its component/helper/test files. Revert the associated privacy and documentation changes. No backend rollback is needed.