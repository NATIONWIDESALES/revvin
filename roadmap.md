# Prebuilt pages for outbound sales

# Legal operator identity, November 22
- [x] Identify the approved legal operator in the shared footer, legal introductions, Organization data and llms.txt without changing other copy or contact details.
- [x] 173 relevant tests passed; static Organization data verified on /, /about, /terms and /privacy. Live preview verified shared footer and legal identification, unchanged contact, no page errors and no 320px overflow. Preview build OK; no publication performed.

# Search verification and brand entity, November 22
- [x] Add the exact static Google verification file and LinkedIn company identity without changing visible copy.
- [x] Verified exact HTTP 200 local static serving, sitemap exclusion and prerendered home/about identity; 156 relevant tests passed and preview build OK.
- [ ] Confirm the production verification URL after owner publication. Current production response is 404; no publication authorized.

# Signup trade qualification, November 21
- [x] Require a preview-prefilled trade, persist signup metadata and category through the existing category handoff, and gate browser/server Meta registration.
- [x] Full suite: 1340 passed, 3 skipped; function checks and preview typecheck/build clean. Simulated signup at 320/390/1280 verifies validation, metadata, qualified-only pixel requests and preview preselection. No migrations or publishing.
- [ ] Deploy the meta-capi qualification change with the reviewed frontend release. Held for the owner's review; no live account creation or Meta receipt verification performed.

# Reliability, November 21
- [x] Install the missing size observer before React renders any page and test native preservation.
- [x] Filter routine signup role-alert emails only, retaining audit logging and split weekly totals. Function deployment remains unapplied for review.
- [ ] Fix smoke slug generation. Blocked: the live journey is a SQL function, not an edge function; no migrations authorized. Supply an unapplied proposal.
- [x] Full suite: 1287 passed, 3 skipped; security-monitor Deno check and preview build clean. Browser signup and sample load with native ResizeObserver removed and no page errors. Smoke proposal: 1000 read-only generated candidates passed the live validator. Commit without publishing.

# Social videos, November 20
- [x] Saved the four supplied render scripts unchanged and rendered seven static public MP4 files using temporary fonts; no app imports or app changes.
- [x] Verified all seven at 1080x1920 with H.264/AAC, exact requested durations and HTTP 200 video/mp4 locally. Inspected the 6-second Black Friday frame: green background, yellow heading, $67.90 and $582. Sizes reported in chat; not published.

# Invite landing sale, November 20
- [x] Reuse the site-wide banner on /i/:code and live-sale signup destination on its main CTA; preserve invite capture and expired-sale behavior. Invite pages remain popup-free.
- [x] Full suite: 1276 passed, 3 skipped; typecheck/server checks/build clean. Browser invite-to-signup note, unchanged invite storage and expiry verified at 320px, 390px and 1280px. Not published.

# Reliability, November 20
- [x] Harden path-specific 30-second chunk recovery; deferred reports use chunk_reload in existing code/message fields. Live homepage and index.html both return no-cache, must-revalidate, max-age=0.
- [x] Capture bounded scrubbed error/component source locations in existing fields; fix reproduced missing ResizeObserver crash and skip unsupported optional intersection features. Exact reported undefined-property failure remains unproven.
- [x] Full suite 1270 passed, 3 skipped; typecheck/server checks/build clean. Reduced-feature sample submission and failed lazy import with exactly one reload then normal error UI verified. Changelog: docs/reliability-2026-11-20.md. Not published.

# Dashboard miles and Advanced, November 19
- [x] Keep kilometre storage/search unchanged; convert radius inputs and distance displays to miles.
- [x] Move integrations into collapsed Settings Advanced and retain integrations deep link. Full suite 1259 passed, 3 skipped; typecheck/build clean. Simulated owner browser save/read-back and mobile overflow check passed; live owner verification unavailable because requester has no app account and temporary-user approval is unavailable.

# Onboarding slug and city, November 19
- [x] Investigate live signup metadata, active trigger, historical onboarding and slug lookup; leave affected rows unchanged.
- [x] Fix draft-name slugs and typed-city persistence; full suite 1250 passed, 3 skipped; typecheck clean. Simulated authenticated browser signup/publish/read-back passed. Live write verification unavailable: temporary-user approval unavailable and requester has no matching auth account.

# Meta server registration, November 18
- [x] Check confirmation and business-row timing; allow authenticated business signup intent with no row yet, retaining known-demo exclusions and the ten-minute window. Full suite: 1244 passed, 3 skipped; application and endpoint typechecks passed. Confirmation signups have no replay; direct transport remains prohibited by integration instructions.
- [x] Add runtime-disabled signup endpoint, shared browser/server event ID, consent-gated session identifiers, disabled hashing helper and privacy disclosure.
- [x] Full suite 1242 passed, 3 skipped; application and endpoint typechecks passed, preview build OK. Simulated browser signup reaches welcome despite server event failure, with matching browser/server event IDs. Live signup and Meta receipt unverified.
- [ ] Enable and verify Meta sending. Blocked: supported Meta service connection and runtime access token are not configured; no direct-token transport is permitted by the integration guidance.

# First-touch signup attribution, November 18
- [x] Capture bounded session-first public landing UTMs and pathname; use them for non-preview signup without changing database validation.
- [x] Full suite: 1225 passed, 3 skipped; typecheck/build clean. Browser verified original UTMs in signup request and confirmation UI with simulated auth response, direct signup capture and later-landing preservation. No publishing.

# Meta registration delivery, November 18
- [x] Reproduce missing CompleteRegistration request before fix using full signup UI with simulated auth success and delayed Meta stub.
- [x] Preserve eligible SPA bridge, bound pending-event disposal and acknowledge SDK dispatch; retain immediate withdrawal.
- [x] Browser assertion fails before and passes after; 1216 tests passed, 3 skipped; typecheck/build clean. Simulated auth and Meta transport only, live signup and Meta receipt remain unverified. Documented; not published.

# Paid-ad sale popup, November 18
- [x] Suppress automatic sale popup for paid-ad browser sessions without changing banner or signup.
- [x] Full suite: 1203 passed, 3 skipped; typecheck clean; mobile paid landing and Pricing retain banner without popup, organic popup opens. Documented; not published.

# Monitoring review, November 18
- [x] Email token finding is stale: live enqueue_email adds tokens and current worker repairs missing ones. Anonymous sale hypothesis is false: headerless GET returns 200 and preview Pricing shows sale.
- [x] Preserve explicit billing choices across delayed sale responses; 1186 tests passed, preview build clean, public Monthly-to-signup browser flow verified. No publishing. Authenticated dashboard flow covered by shared-hook regressions, not a live owner checkout.

# Meta attribution handoff, November 18
- [x] Add permission-gated validated session fbclid forwarding and storage-confirmed preview URL cleanup.
- [x] Full suite: 1182 passed, 3 skipped; typecheck and preview build clean; browser handoff, synthetic conversion and failed-storage blocking verified. Changelog appended; not published. Real signup completion, Meta receipt and attribution remain unverified.

# Stale chunk recovery, November 18
- [x] Add shared bounded recovery for Vite preload events and every React lazy import without changing crash UI or reporting.
- [x] Ten recovery regressions; full suite: 1124 passed, 3 skipped; typecheck and preview build clean. Browser verified single recovery and persistent-failure UI. Changelog: docs/chunk-recovery-2026-11-18.md. Not published.

# Security hardening, November 17
- [x] Audit database, functions, client and dependencies; auth setting updates accepted, unavailable hosted read-back documented.
- [x] Revoke trigger/internal access with reviewed rollback migrations; preserve public RPCs and make public business view read-only.
- [x] Add private-route frame guard and conditional admin TOTP gate across UI and server checks; affected admin functions deployed.
- [x] Full suite: 1114 passed, 3 skipped; typecheck/build clean; live permissions, public validation and frame guard checked. Changelog: docs/security-hardening-2026-11-17.md. Not published.
- [ ] Verify real admin enrollment and successful live customer write/read-back flows. Blocked: requester has no matching account and account-specific session approval is unavailable.
- [ ] Read hosted minimum password length, email confirmation, OTP expiry and independent HIBP/current-password read-back. Blocked: available auth tools expose writes, not these hosted setting reads; owner can inspect More > Users > Auth settings > Email.

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
- [x] Remove inherited anon/authenticated failure-table grants. Resolved by reviewed security migration 0035; direct clients remain denied.
- [ ] Verify real admin list and inbox receipt. Admin-session verification remains blocked; queue acceptance and the failure-alert sent log were verified live on November 16.

# Email queue authorization, November 16
- [x] Diagnose worker rejection using current managed credentials and live dispatcher responses.
- [x] Restore existing worker behavior after supported credential refresh; add verified service authorization fallback and deploy only the queue worker.
- [x] Verify live dispatch, failure-alert sent log, 14-day unsent counts and expiry handling; document and run regressions.
