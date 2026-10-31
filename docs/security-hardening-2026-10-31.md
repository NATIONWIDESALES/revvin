# Security hardening: October 31, 2026

## Status

Implemented database and code hardening with the limitations below. Not published. Backend migrations and 16 function deployments are live independently of website publication. No Stripe products, prices, checkout or payment webhooks were changed. Signup confirmation settings were not changed. No customer messages or test accounts were created.

## Itemized changes and tests

### 1
- Change: Email ownership gate requires OTP/magiclink or an actual confirmation challenge; narrow referrer summary replaces direct lead reads.
- Test/limitation: PGlite executes the actual ownership function for password, OTP, magiclink and challenge cases; projection contract.

### 2
- Change: Notification/audit writer grants revoked. Ownership-checked referral action RPC and database audit triggers replace client writer calls.
- Test/limitation: Grant/source regression and client-call exclusion.

### 3
- Change: Legacy referral INSERT policy removed; attachment reads compare the owner folder to server-owned referral relationships.
- Test/limitation: Policy contract regression.

### 4
- Change: Public view reduced to the page projection, with no owner, billing, lifecycle or coordinate fields.
- Test/limitation: Generated-type guard and two anonymous live referral reads passed.

### 5
- Change: Admin authority comes only from persisted roles; existing backend admin count is one.
- Test/limitation: Executable admin helper tests reject email-only access.

### 6
- Change: Signup alerts require caller ownership or worker credentials; partner attribution needs a business under 30 minutes old and a corroborated click inside 60 days.
- Test/limitation: Ownership/source tests and existing attribution suite.

### 7
- Change: index_approved defaults false and is guarded; CRM toggle added; unapproved referral documents remain noindex. Restricted public offers excluded.
- Test/limitation: Referral metadata and SQL contracts. Existing real-estate referral forms load.

### 8
- Change: Invitation cap 5/day, partner application global cap 50/hour, ask RPC and all insert paths enforce 120/hour and Free 50/Pro 300 daily caps. Private eligibility check and neutral sign-in endpoint added.
- Test/limitation: Cap contracts; auth ordering checks. No messages sent in verification.

### 9
- Change: Campaign owner template escaped before merge/newline conversion.
- Test/limitation: Executable malicious-body escaping regression.

### 10
- Change: Anonymous Earn never receives a saved token. Existing/new personal links are queued to email; IP/global creation caps apply. Trusted email sessions may receive their own token.
- Test/limitation: SQL return/queue/rate contracts. Actual mailbox delivery not verified.

### 11
- Change: HTTPS hostname validation on writes; DNS public-address checks at dispatch; manual redirects; cron credentials required.
- Test/limitation: Three Deno tests include private and mapped IPv6, mixed DNS and CSV. Live unauthenticated dispatch returned 401. DNS resolution is not pinned to the subsequent fetch, so DNS-rebinding residual risk remains.

### 12
- Change: No duplicate owner IDs found; unique owner constraint, client INSERT/DELETE removal and persistent trial history added.
- Test/limitation: SQL contracts and existing trial tests. Full new-account creation/deletion lifecycle not live tested.

### 13
- Change: Old/unknown campaign segments blocked in sender and composer; provider events persist suppression; senders fail closed against global suppression. Campaign, lifecycle and ask gateway sends add one-click headers.
- Test/limitation: Executable campaign eligibility and header/event contracts. Real provider callbacks and mailbox headers not exercised.

### 14
- Change: Server-only helper grants; role checks restricted to self/admin/service.
- Test/limitation: Grant and role contracts.

### 15
- Change: Partner email matching uses normalized exact equality.
- Test/limitation: Both source paths checked.

### 16
- Change: Public captures route through bounded, rate-limited RPC; anon inserts revoked.
- Test/limitation: Tracker privacy/full suite and RPC contracts.

### 17
- Change: Both buckets verified at 2 MB. Restrictive storage INSERT/UPDATE policies allow PNG/JPEG/WebP only.
- Test/limitation: Policy contract. Bucket allowed_mime_types remains unset: available bucket tool exposes no MIME setting. Policy is an authenticated-upload mitigation, not a verified bucket-level MIME configuration; privileged uploads bypass it.

### 18
- Change: Private routes refuse framed rendering and attempt top navigation; low-risk CSP added.
- Test/limitation: Route/CSP contract and preview rendering. External checkout and Maps/Places were not exercised.

### 19
- Change: smoke-maps retained but cron-guarded.
- Test/limitation: Credential guard contract.

### 20
- Change: CSV cells with formula prefixes are single-quote prefixed.
- Test/limitation: Executable Deno CSV tests.

### 21
- Change: Owner updates cannot alter claimed referrer identity or status token.
- Test/limitation: Trigger contract. Ownership gate executed separately; full identity trigger not executed in PGlite.

### 22
- Change: Authentication precedes payload parsing in all three notification functions.
- Test/limitation: Live invalid-token malformed-body calls all returned 401 after deployment.

### 23
- Change: api source accepted by additive constraint change; raw ingestion error detail removed.
- Test/limitation: Constraint/error contract and Deno check.

### 24
- Change: Edge imports pinned, including generated MCP dependency inputs.
- Test/limitation: Repository-wide exact-version import regression; queue and selected functions pass isolated Deno checks.

### 25
- Change: Hosted password settings unchanged because current confirmation/HIBP settings could not be read safely.
- Test/limitation: Not implemented or verified. Minimum password length: More > Users > Auth settings > Email. Enable Password HIBP Check there without changing confirmation. No test is claimed for an unchanged hosted setting.

## Verification

- Full Vitest suite: 815 passed, 3 skipped, 59 files (58 passed, one skipped).
- Live public projection tests: 4 passed, including both existing real-estate referral pages.
- Deno security tests: 3 passed.
- Preview automatic build: latest observed entry `build OK`, 17:20:46 UTC. No manual project build was run.
- Read-only Playwright: homepage, signup, /me, Earn, referral page and invalid-token fallback render with no runtime errors. Referral consent checkbox and nine fields visible. Screenshots: /tmp/browser/security/.
- Authenticated end-to-end checks blocked: own-account session mint reported no matching account. Signup-to-publish, Pro campaign sending, job-done delivery, /me mailbox verification and CRM toggling are not live verified. Existing tests cover these logic paths only partially.
- Initial endpoint checks hit old deployments and returned 400/200. After explicit deployment, send-push, notify-deal-closed, notify-referrer-reward and dispatch-webhooks each returned 401 for invalid credentials.
- Selected server Deno checks passed, including queue, dispatch, push, event handler, ingestion and referrer sign-in. Broader email-template checks encountered pre-existing React typing/configuration errors; no clean all-functions check is claimed.

## Changelog

### Files changed in this run

- `AGENTS.md`
- `bun.lock`
- `drizzle/migrations/0008_security_identity_grants_moderation.sql`
- `drizzle/migrations/0009_security_rate_limited_submissions.sql`
- `drizzle/migrations/0010_security_public_projection.sql`
- `drizzle/migrations/0011_security_referrer_actions_and_private_email_checks.sql`
- `drizzle/migrations/0012_security_earn_token_delivery.sql`
- `drizzle/migrations/0013_security_job_limits_and_bucket_validation.sql`
- `drizzle/migrations/0014_security_image_upload_policy.sql`
- `drizzle/migrations/meta/0008_snapshot.json`
- `drizzle/migrations/meta/0009_snapshot.json`
- `drizzle/migrations/meta/0010_snapshot.json`
- `drizzle/migrations/meta/0011_snapshot.json`
- `drizzle/migrations/meta/0012_snapshot.json`
- `drizzle/migrations/meta/0013_snapshot.json`
- `drizzle/migrations/meta/0014_snapshot.json`
- `drizzle/migrations/meta/_journal.json`
- `index.html`
- `package.json`
- `plugins/prerender.ts`
- `roadmap.md`
- `src/App.tsx`
- `src/components/FrameGuard.tsx`
- `src/components/dashboard/AutoAskTab.tsx`
- `src/components/dashboard/CampaignsTab.tsx`
- `src/components/earn/GetMyLink.tsx`
- `src/components/marketplace/CallbackRequestDialog.tsx`
- `src/components/marketplace/ContactBusinessDialog.tsx`
- `src/integrations/supabase/types.ts`
- `src/lib/campaignSegments.ts`
- `src/lib/emailLeads.ts`
- `src/lib/myReferrals.ts`
- `src/lib/publicReferralCols.ts`
- `src/lib/supabaseLazy.ts`
- `src/pages/Me.tsx`
- `src/pages/PublicReferralPage.tsx`
- `src/pages/SuperAdminCRM.tsx`
- `src/pages/dashboard/AdminDashboard.tsx`
- `src/pages/dashboard/ReferrerDashboard.tsx`
- `src/test/funnel-core-events.test.ts`
- `src/test/funnel-milestones.test.ts`
- `src/test/partners.test.ts`
- `src/test/prerendered-html.test.ts`
- `src/test/public-view-columns.test.ts`
- `src/test/security-hardening.test.ts`
- `src/test/seo-sitemap-robots.test.ts`
- `src/test/track-privacy.test.ts`
- `src/test/track-signup-lane.test.ts`
- `supabase/functions/_shared/admin-auth.ts`
- `supabase/functions/_shared/email-format.ts`
- `supabase/functions/_shared/global-suppression.ts`
- `supabase/functions/_shared/lifecycle-email.ts`
- `supabase/functions/_shared/outreach.ts`
- `supabase/functions/_shared/partner-attribution.ts`
- `supabase/functions/_shared/partner-email.ts`
- `supabase/functions/_shared/resend-gateway.ts`
- `supabase/functions/_shared/security.ts`
- `supabase/functions/_shared/transactional-email-templates/send-email.ts`
- `supabase/functions/dispatch-webhooks/index.ts`
- `supabase/functions/dispatch-webhooks/security_test.ts`
- `supabase/functions/email-health-check/index.ts`
- `supabase/functions/handle-email-events/index.ts`
- `supabase/functions/handle-unsubscribe/index.ts`
- `supabase/functions/ingest-job-completed/index.ts`
- `supabase/functions/lifecycle-emails/index.ts`
- `supabase/functions/mcp/index.ts`
- `supabase/functions/monthly-roi-recap/index.ts`
- `supabase/functions/notify-business-signup/index.ts`
- `supabase/functions/notify-deal-closed/index.ts`
- `supabase/functions/notify-new-lead/index.ts`
- `supabase/functions/notify-new-referral/index.ts`
- `supabase/functions/notify-referrer-reward/index.ts`
- `supabase/functions/nudge-stale-leads/index.ts`
- `supabase/functions/partner-admin/index.ts`
- `supabase/functions/partner-apply/index.ts`
- `supabase/functions/partner-click/index.ts`
- `supabase/functions/partner-commissions-mature/index.ts`
- `supabase/functions/partner-dashboard/index.ts`
- `supabase/functions/partner-resend-link/index.ts`
- `supabase/functions/preview-transactional-email/index.ts`
- `supabase/functions/process-campaign-sends/index.ts`
- `supabase/functions/process-email-queue/index.ts`
- `supabase/functions/process-referral-triggers/index.ts`
- `supabase/functions/push-resubscribe/index.ts`
- `supabase/functions/referrer-signin/index.ts`
- `supabase/functions/resend-status/index.ts`
- `supabase/functions/sa-data/index.ts`
- `supabase/functions/send-campaign/index.ts`
- `supabase/functions/send-notification/index.ts`
- `supabase/functions/send-push/index.ts`
- `supabase/functions/smoke-maps/index.ts`
- `supabase/functions/twilio-inbound-webhook/index.ts`
- `docs/security-hardening-2026-10-31.md`

### Applied migrations

- `drizzle/migrations/0008_security_identity_grants_moderation.sql`
- `drizzle/migrations/0009_security_rate_limited_submissions.sql`
- `drizzle/migrations/0010_security_public_projection.sql`
- `drizzle/migrations/0011_security_referrer_actions_and_private_email_checks.sql`
- `drizzle/migrations/0012_security_earn_token_delivery.sql`
- `drizzle/migrations/0013_security_job_limits_and_bucket_validation.sql`
- `drizzle/migrations/0014_security_image_upload_policy.sql`

### Explicitly deployed functions

send-push, notify-deal-closed, notify-referrer-reward, dispatch-webhooks, referrer-signin, process-email-queue, notify-business-signup, send-notification, send-campaign, process-referral-triggers, partner-apply, partner-resend-link, partner-admin, handle-email-events, ingest-job-completed, smoke-maps

Other functions importing shared helpers receive the shared changes through the automatic deployment pipeline; their deployed versions were not individually verified.

### Release caution

The reduced public view and tightened RPC permissions are already live, while production frontend publication was intentionally not performed. The old published client can still request removed columns or use revoked writers until the updated frontend goes live. This cross-version compatibility is not resolved by a preview build. Do not claim production signup/referral continuity until the updated client is published and tested.
