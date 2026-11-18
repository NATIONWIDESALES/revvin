# Stale chunk recovery, November 18, 2026

## Behavior
- Recognizes `Failed to fetch dynamically imported module`, `Importing a module script failed`, and `ChunkLoadError`.
- Navigates once to the current URL with `_revvin_reload=<timestamp>` to fetch a fresh document. Existing query parameters and fragment remain intact; navigation replaces the current history entry.
- Writes `revvin:chunk-reload-at` to sessionStorage before navigating. A fresh document cannot reload again within five minutes. The URL timestamp also guards against cleared session storage. Concurrent errors in the departing document cannot trigger additional navigation.
- If session storage is unavailable or navigation throws, recovery declines and existing error handling proceeds.
- Vite preload errors are prevented only when recovery is underway. React lazy rejections remain pending during recovery, otherwise propagate to the unchanged ErrorBoundary, including existing `render_crash` reporting.
- No copy, Stripe, RLS, database migration, edge function or publishing changes.

## Verification
- Full Vitest suite with `--maxWorkers=2`: 1124 passed, 3 skipped, 89 test files passed and 1 skipped.
- TypeScript: `oj typecheck -b --noEmit` passed.
- Preview build: latest diagnostic reports `build OK`.
- Browser: simulated Vite chunk failure on Pricing caused exactly one document navigation, preserving the offer parameter and fragment. A second event after reload was not suppressed and caused no navigation. Blocking the About lazy module then showed the existing Refresh Page / Go Home error UI without another reload.
- Ten focused regressions cover all three error signatures, concurrent failures, five-minute limit across documents, URL fallback, blocked storage, Vite suppression, unrelated errors, persistent lazy failure reporting, and pending recovery without crash reporting.
- Production deployment rollover was not exercised because publishing is prohibited. Tabs already running a build predating this fix cannot acquire its recovery code until they load a newer document.

## Changelog
- `src/lib/chunkRecovery.ts`: shared error classifier, session/URL bounded reload guard, Vite listener and React lazy wrapper.
- `src/main.tsx`: installs the Vite listener before mounting or hydrating the app.
- `src/App.tsx`: existing lazy route and loader imports use the shared wrapper.
- `src/components/Navbar.tsx`: existing lazy notification import uses the wrapper.
- `src/components/billing/SalePromotion.tsx`: existing lazy popup import uses the wrapper; sale behavior unchanged.
- `src/pages/Browse.tsx`: existing lazy map import uses the wrapper.
- `src/test/chunk-recovery.test.tsx`: ten recovery and crash-reporting regressions.
- `AGENTS.md`: records the shared recovery architecture rule.
- `roadmap.md`: records completion and verification for this request.
- `docs/chunk-recovery-2026-11-18.md`: this changelog and verification limits.

No migrations. Not published.