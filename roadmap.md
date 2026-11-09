# Prebuilt pages for outbound sales

- [x] Migration: prospect_pages table, sales role, RLS, grants, RPCs, expiry cron
- [x] Edge function prospect-lookup (Google Places, sales/admin, 60/hour)
- [x] CRM Prospects tab (admin + sales; sales sees only prospect tools)
- [x] Public /preview/:code page (noindex, banner, mock, sign+QR, claim, remove)
- [x] Alerts: first-view + claim emails to info@revvin.co and caller
- [x] Clarity slot in brand.ts (empty default, masked, allowed routes only)
- [x] Hide Earn from homepage/nav/footer until a metro is live
- [x] Tests for every item (33 new, 862 total pass)
- [x] Changelog docs/prebuilt-pages-2026-11-01.md
- [x] Full suite + preview build; edge functions deployed; not published

# Sales-path incident fixes
- [x] Reproduce historical SQL email payload and owner publish failures
- [x] Check all current SQL writers and live grants/guards without modifying them
- [x] Harden awaited onboarding save and fixed publish failure diagnostics
- [x] Run full suite, inspect build signal, and document verification limits

# Sales rep partner engine
- [ ] Add rep linking, versioned terms, applied-rate snapshots and guarded attribution RPCs. Blocked: migration tool lacks public schema permission; nothing applied.
- [ ] Connect claim precedence and collected-payment commissions to the existing ledger. Blocked: required schema/functions unavailable.
- [ ] Add own-rep earnings and admin terms/leaderboard controls. Blocked: required schema/functions unavailable.
- [x] Save isolated candidate tests and blocked-work changelog; no frontend publish
- [ ] Deploy and verify integrated admin/rep/payment flows. Blocked: Cloud schema permission refusal.
