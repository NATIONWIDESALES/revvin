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

# Approved pricing and plan change, third in sequence
- [ ] Begin only after sales-path fixes and rep commissions are finished. Blocked: rep commission implementation is unfinished due to Cloud schema permission refusal.
- [ ] Create new recurring prices on existing Pro product ($97/month USD, $970/year USD); preserve legacy prices and the existing $17 subscriber. Stop before checkout/public copy changes if price creation is unavailable.
- [ ] Version checkout so absent version retains legacy prices; recognize both generations throughout billing and commissions without repricing subscriptions.
- [ ] Pause new invite redemptions behind one default-paused flag; preserve redeemed offers and coupons; paused surfaces apply standard offer.
- [ ] Confirm no real business exceeds 25 contacts or uses automatic asks before migrating; enforce 25 Free contacts and Pro automatic-job asks at every server entry without deleting contacts/settings/connections.
- [ ] Sweep config, marketing, product, SEO/generated documents, emails, legal, MCP and partner/admin surfaces to the approved split; preserve competitor facts.
- [ ] Delete the $29 founding offer completely: hidden Pricing branch and homepage strips, FOUNDING_OFFER_ACTIVE, offer-only configuration/copy/CTA names/email/legal/tests/docs/admin references. Keep SETUP_CALL_URL and Done-for-you launch booking links. Confirm no code references a $29 Stripe price; add $29 and founding-as-Revvin-offer to retired-phrases guard. Report removals and justified retained references. Blocked with pricing work until rep commissions are finished.
- [ ] Add launch guarantee: $297 refund if no referral within 60 days of first asks, at least 50 customers asked, email request within 90 days of purchase; manual refunds only.
- [ ] Update guards and isolated entitlement tests, run full suite and inspect build; report contradictions, exclusions, checkout test-mode verification and ordered publish steps. Do not publish frontend.
