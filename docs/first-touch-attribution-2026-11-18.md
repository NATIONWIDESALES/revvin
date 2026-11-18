# First-touch signup attribution

- Added `src/lib/firstTouch.ts`: session-first capture of only the five existing UTM keys (200 characters each) and real pathname (160 characters, no query/hash), under `revvin_first_touch`. Public document startup only, no SPA navigation listener. Organic landings store pathname only; later landings never overwrite it. Storage failures retain current-URL fallback.
- Updated `src/main.tsx` to capture before rendering and `src/lib/instantPreview.ts` to prefer preview acquisition, then stored first touch, then current href. Shared UTM keys remain exported from instantPreview. Preview path validation is unchanged. No query forwarding or Meta changes.
- Added `src/test/first-touch.test.ts`: nine regressions covering homepage-to-signup, direct signup, later campaigns, organic landings, bounds, private routes, preview precedence, unavailable storage, and stored-path validation.
- Updated `AGENTS.md` and `roadmap.md`.

## Existing server behavior, unchanged

Migration 0007's business acquisition trigger accepts each acquisition string and truncates it to 200 characters. Its latest definition in 0019 preserves that behavior. There is no landing-path allowlist for this stored acquisition field: `/` stays `/`, and `/pricing` stays `/pricing`.

The separate `fn_record_acquisition_event` allowlist governs event paths, not stored business acquisition. Signup events still use their existing allowed signup path. Preview read-back continues normalizing unsupported preview landing paths to `/`; this fix does not change it.

## Verification

- Full Vitest suite with 15-second per-test limit: 1225 passed, 3 skipped, zero failed.
- `tsgo -b --noEmit`: passed. Preview build: OK.
- Playwright clicked the real homepage Start free link, filled and submitted the signup form, asserted the outgoing signup acquisition contained homepage UTMs and `/`, and reached the confirmation UI. Auth response was simulated to avoid creating an account. A second document landing retained the first touch; a fresh direct signup landing captured its own UTMs.
- No live account creation or database read-back performed. No payments, security policies, migrations or UI copy changed. Not published.