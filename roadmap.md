# Prebuilt pages for outbound sales

# Marketing SEO and trust, November 17
- [x] Add footer Instagram link, Organization sameAs and the three requested homepage heading updates.
- [x] Verified server-rendered documents and unchanged metadata; 1086 tests passed, 3 skipped; typecheck clean; desktop/mobile checked. Changelog: docs/marketing-seo-trust-2026-11-17.md. Not published.

# Origami marketing snippet, November 16
- [x] Add isolated client-only marketing loader with opt-out and bot gates.
- [x] Update privacy disclosure; 1084 tests passed, 3 skipped, typecheck/build clean; browser gates and private-route shutdown verified. Not published; Origami receipt and company matching remain unverified.

# Early Black Friday presentation, November 16
- [x] Centralize the prominent, dismissible sale bar and lazy first-visit dialog on eligible pages.
- [x] Preserve sale signup intent through setup and default the live upgrade picker to Yearly.
- [x] Full tests: 1049 passed, 3 skipped; typecheck clean; desktop/mobile, dismissal, focus, pinning and expiry checked. No publish. Real owner/setup browser verification blocked by unavailable session.

# Early Black Friday, November 16
- [x] Reuse server promo selection and shared pricing for the timed sale; preserve legacy paths.
- [x] Add sale-only banners/prices and trial-ending email line.
- [x] Run full tests and typecheck, deploy only checkout/lifecycle functions, verify and document. Do not publish.

# Targeted public-page fixes, November 13
- [x] Require an explicit unlocked trade; preserve locked-trade signup.
- [x] Share pricing FAQs across the page, static HTML and FAQPage schema.
- [x] Clarify yearly calculator pricing and add sourced roundup FAQs/date.
- [x] Document post-publish referral HTML/preview limitations and hosting options.
- [x] Full Vitest: 933 passed, 3 skipped; typecheck clean; desktop/mobile public flows checked. Every changed file listed in docs/public-page-fixes-2026-11-13.md; not published. Rep work stays parked.

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
- [ ] Add rep linking, versioned terms, applied-rate snapshots and guarded attribution RPCs. Ready to resume after pricing verification; permission probe now succeeds.
- [ ] Connect claim precedence and collected-payment commissions to the existing ledger. Pending additive rep migration and integration.
- [ ] Add own-rep earnings and admin terms/leaderboard controls. Pending additive rep migration and integration.
- [x] Save isolated candidate tests and blocked-work changelog; no frontend publish
- [ ] Deploy and verify integrated admin/rep/payment flows. Pending authenticated verification.

# Approved pricing and plan change, active before rep commissions
- [x] Owner sequencing correction: pricing proceeds now, rep commissions resume afterwards. Permission probe succeeded as postgres.
- [x] Create new recurring prices on existing Pro product ($97/month USD, $970/year USD); preserve legacy prices and the existing $17 subscriber. Stop before checkout/public copy changes if price creation is unavailable.
- [x] Version checkout so absent version retains legacy prices; recognize both generations throughout billing and commissions without repricing subscriptions.
- [x] Pause new invite redemptions behind one default-paused flag; preserve redeemed offers and coupons; paused surfaces apply standard offer.
- [x] Confirm no real business exceeds 25 contacts or uses automatic asks before migrating; enforce 25 Free contacts and Pro automatic-job asks at every server entry without deleting contacts/settings/connections.
- [x] Sweep config, marketing, product, SEO/generated documents, emails, legal, MCP and partner/admin surfaces to the approved split; preserve competitor facts.
- [x] Delete the $29 founding offer completely: hidden Pricing branch and homepage strips, FOUNDING_OFFER_ACTIVE, offer-only configuration/copy/CTA names/email/legal/tests/docs/admin references. Keep SETUP_CALL_URL and Done-for-you launch booking links. Confirm no code references a $29 Stripe price; add $29 and founding-as-Revvin-offer to retired-phrases guard. Report removals and justified retained references.
- [x] Add launch guarantee: $297 refund if no referral within 60 days of first asks, at least 50 customers asked, email request within 90 days of purchase; manual refunds only.
- [x] Update guards and isolated entitlement tests, run full suite and inspect build; report contradictions, exclusions, checkout verification limits and ordered publish steps. Do not publish frontend.
- [x] Pre-publish congruency review: 10 owner findings fixed (auth copy, webhook line item, setup-fee qualification, competitor fact revert, phone-support removal, Pro rail grouping, Rewards tab label, invite fail-closed guard, done-for-you launch naming, partner earnings and admin text). 12 new guard tests; 927 passed, 3 skipped; build clean; 4 functions redeployed; not published. Rep commissions stay parked.

# Congruency fixes, November 13
- [x] Retire stale agreement and its links; preserve reserved slug.
- [x] Distinguish trial email copy without changing selection or timing.
- [x] Derive live price copy from config, add guards and verify static parity.
- [x] Full suite, typecheck, public checks and file-by-file changelog; no frontend publish.

# Same-user auth refresh fix, November 13
- [x] Stabilize auth identity and identity-dependent loaders/forms.
- [x] Keep business dashboard mounted during background refreshes.
- [x] Add four regressions; 953 tests passed, 3 skipped; typecheck clean; append changelog. Authenticated browser check blocked by no matching requester account; not published.

# Product walkthrough fixes, November 13
- [x] Fix Campaign readiness, retry UX and apply recorded array-append migration.
- [x] Apply reversible two-hour default/backfill without changing scheduled asks.
- [x] Correct owner SMS controls, upgrade mapping, signup routing, edit labels and won-job prompt.
- [x] Apply the specified wording fixes and report owner-SMS/delay/worker findings.
- [x] Deploy only lifecycle-emails, send-notification and preview-transactional-email.
- [x] Run regressions, full Vitest and typecheck; document exact SQL and verification limits. No frontend publish.
- Verification: 967 passed, 3 skipped; typecheck clean. Authenticated browser verification unavailable. Frontend not published.

# Failure alerts, November 16
- [x] Apply migration 0032 with private RLS tables, guarded recording/admin RPCs, queue throttles and retention trigger.
- [x] Add reporting at existing failure branches and the admin Failures tab without customer changes.
- [x] Full Vitest: 988 passed, 3 skipped; typecheck clean; intercepted browser referral-failure check passed.
- [ ] Remove inherited anon/authenticated table grants. Blocked by the one-migration-only constraint after live read-back revealed platform default grants; RLS with no policies still denies all direct client access.
- [ ] Verify real admin list and inbox receipt. Admin-session verification remains blocked; queue acceptance and the failure-alert sent log were verified live on November 16.

# Email queue authorization, November 16
- [x] Diagnose worker rejection using current managed credentials and live dispatcher responses.
- [x] Restore existing worker behavior after supported credential refresh; add verified service authorization fallback and deploy only the queue worker.
- [x] Verify live dispatch, failure-alert sent log, 14-day unsent counts and expiry handling; document and run regressions.
