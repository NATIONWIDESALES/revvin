# Reliability, November 20, 2026

## Investigation
- Shared React lazy recovery and the Vite preload listener already existed in current source. The reported November 16 build predates that recovery. Already-running older documents cannot gain new recovery code until a newer document loads.
- Live GET header checks for https://revvin.co/ and https://revvin.co/index.html both returned HTTP 200 and `cache-control: no-cache, must-revalidate, max-age=0`. Reloading with the existing cache-busting parameter requests a revalidated document.
- The existing failure RPC accepts only predefined steps and scrubs message/code to 300 characters each. Adding a new step or stack column would require a migration. This change instead marks recoveries with `code=chunk_reload` and a `chunk_reload:` message prefix under the existing `render_crash` step. Existing rate limits, alert handling and security remain unchanged.
- A signed-out browser with Linux Chrome 124 user-agent, 800x600 viewport, reduced motion, WebGL unavailable and both observers removed crashed with `ResizeObserver is not a constructor` in the Radix size observer. This is a reproduced reduced-feature crash, not proof of the historical `Cannot read properties of undefined` cause. Chrome 124 was emulated by identity and missing features, not an actual Chrome 124 binary.

## Changes
- `src/lib/chunkRecovery.ts`: per-path session timestamp guard, 30-second limit, storage read-back, existing timestamp URL fallback, CSS preload signature and Vite-event fallback. Concurrent failures navigate once. Recovering imports remain pending; persistent failures reach the unchanged error screen. Deferred recovery reporting runs on the next document startup so backend loading does not race page unload.
- `src/lib/reportFailure.ts`: first three source locations from the first eight error/component stack lines, bounded source basenames and line/column only. Emails, URL queries, arguments and arbitrary stack text are not forwarded. Error locations use message; component locations use code, within existing 300-character limits and compatible with server scrubbing.
- `src/components/ErrorBoundary.tsx`: passes the React component stack into the private reporter. UI copy remains unchanged.
- `src/components/ui/slider.tsx`, `package.json`, `bun.lock`: supplies the established @juggle/resize-observer implementation only when the native observer is unavailable.
- `src/components/marketing/MobileStartBar.tsx`: optional intersection-dependent behavior skips when unsupported and ignores empty observer entries.
- `src/test/chunk-recovery.test.tsx`, `src/test/report-failure.test.ts`, `src/test/observer-compatibility.test.tsx`: recovery, reporting privacy and reduced-feature regressions.
- `AGENTS.md`, `roadmap.md`, this document: architecture and verification notes.

## Verification
- Targeted reliability tests: 21 passed.
- Full Vitest suite with two workers and 15-second per-test timeout: 1270 passed, 3 skipped, zero failed.
- `oj typecheck -b --noEmit`: passed. Existing `check:functions` command: passed. Latest preview diagnostic: build OK.
- Playwright: signed-out reduced-feature /sample submitted the demo referral and displayed the owner inbox with no page errors.
- Playwright: aborting the actual Sample lazy import produced exactly two document requests, preserving original query/hash with one recovery timestamp added. Persistent failure then displayed Refresh Page / Go Home, with no further automatic navigation.
- Source and unit tests validate diagnostic contents; a live app_failures insert/read-back was not performed. Publishing and a real deployment rollover were not performed.

No payment changes, migrations, security-policy changes or visible copy changes. Not published.