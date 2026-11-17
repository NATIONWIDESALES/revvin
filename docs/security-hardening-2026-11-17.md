# Security hardening changelog, November 17, 2026

## Result

No frontend publish. No Stripe changes, RLS policy changes, broadened grants, dropped tables or deleted application data. Database changes were applied through reviewed migrations with operator-only rollback comments. Nine affected admin-authorizing functions were deployed. The generated MCP deployment was withheld by the platform until a future publish.

## Applied migrations and live evidence

- `0035_security_admin_mfa_and_internal_access.sql`: revoked EXECUTE from PUBLIC, anon and authenticated for every public SECURITY DEFINER function returning trigger; removed all anon/authenticated privileges on the twelve specified internal tables and five already-private operational tables; pinned `fn_business_derive_plan()` search path; made admin `has_role` checks require JWT AAL2 only after a verified TOTP factor exists. Service-role automation remains service-authorized. No auth schema was modified.
- `0036_security_public_business_view_read_only.sql`: the public business view was automatically updatable and had full anon/authenticated privileges. Removed its unused write privileges. Live ACL now has only `anon=r` and `authenticated=r`; public SELECT still returns HTTP 200. The SECURITY DEFINER view remains because its explicit published-business predicate is required for public referral-page reads.
- Live read-back: no public SECURITY DEFINER trigger-return function remains executable by anon or authenticated; none of the twelve specified internal tables retains their access; no verified TOTP factors exist, so admin enrollment has not activated enforcement or locked anyone out.

### Trigger functions covered

`create_default_notification_settings`, `email_queue_wake`, `enforce_business_slug_rules`, `fn_autocreate_reward_on_won`, `fn_contact_assign_referrer`, `fn_enforce_free_contact_limit`, `fn_enforce_single_active_seasonal`, `fn_failure_retention`, `fn_freeze_lead_identity`, `fn_guard_contact_ask_limit`, `fn_guard_first_trial`, `fn_guard_is_verified`, `fn_guard_pro_integration`, `fn_guard_signups_paused`, `fn_job_daily_cap`, `fn_metro_guard`, `fn_new_business_acquisition_trial`, `fn_security_business_audit`, `fn_security_dispute_audit`, `fn_user_roles_security_audit`, `fn_webhook_on_lead`, `fn_webhook_on_reward_paid`, `handle_new_user`, `prevent_business_privileged_updates`, `prevent_consent_timestamp_rollback`, `prevent_offer_privileged_updates`, `prevent_referrer_privileged_updates`, `prevent_status_self_approval`.

Trigger invocation still works without client EXECUTE, proven with an authenticated insert in isolated PostgreSQL. Five service-only triggers were already inaccessible and remain so: `email_queue_wake`, `fn_failure_retention`, `fn_guard_pro_integration`, `fn_webhook_on_lead`, `fn_webhook_on_reward_paid`. Rollback deliberately excludes them.

### Internal table access

All twelve requested tables had no direct frontend reads: `partners`, `partner_payouts`, `partner_commissions`, `partner_adjustments`, `partner_clicks`, `platform_flags`, `push_send_log`, `security_alerts`, `security_events`, `business_lifecycle_emails`, `business_trial_history`, `job_ask_delay_rollback_20261113`. Partner screens use authorized edge actions with service-role access, not direct client access. Also removed any redundant privileges on `app_failures`, `failure_alerts`, `notification_jobs`, `referral_rate_buckets`, `referral_submissions`; these remain deny-all to direct clients.

## Scan findings: fixed or left open

The full available security scan completed; the database linter, dependency scan, client credential-reference review and edge authorization review were also run. The workspace has no Wiz connection, so that scanner was skipped, not represented as passing.

| Finding | Status and reason |
| --- | --- |
| Mutable function search path on `fn_business_derive_plan` | Fixed in 0035; latest linter no longer reports it. |
| Trigger-only SECURITY DEFINER execution | Fixed for all trigger-return functions in 0035; live read-back and trigger regression pass. |
| Unnecessary internal table privileges | Fixed by revocation; no frontend reads were found. |
| Public business view write privileges | Fixed in 0036; read-only access retained. |
| SECURITY DEFINER business view linter error | Left open intentionally: safe-column published-row view supports anonymous referral pages while base business RLS is private. Switching to invoker would break public reads. Writes are now forbidden. |
| `lov_db_rls_tautology_permissive_v1_ecfe4f62540fb032`, public badges catalog | Left open: informational finding on intentionally public badge definitions. No RLS was changed or finding dismissed. |
| 17 RLS-enabled tables without policies | Left open intentionally: deny-all service-only storage. Creating permissive policies would weaken access. |
| 21 anonymous-callable and 42 authenticated-callable SECURITY DEFINER functions | Retained required RPC access. Verdicts below; execute privilege alone does not establish successful unauthorized actions. |
| Dependency advisories | Fixed all reported high/critical and most moderate findings through compatible updates and patched transitive overrides. Latest scan retains two moderate React Router advisories below. |
| React Router constructor injection in SSR hydration and backslash open redirect | Left open: scanner names 7.18.0 as patched; current compatible version is 6.30.6. A major router upgrade is not a surgical, proven-compatible fix. App uses its own static hydration, not router data-error hydration; neither advisory was dismissed. |
| Missing response frame headers | Host limitation remains. Pre-render and navigation guards now deny framing of sensitive routes; JavaScript guards are defense in depth, not equivalent to frame-ancestors. |

Latest database linter: 81 findings across four categories, down from 128 across five. Latest security scan: one informational badges finding. Latest dependency scan: only the two moderate router advisories. Remote edge imports are pinned but are not covered by the browser lockfile scan; no claim of exhaustive remote dependency clearance.

## Public RPC verdicts

No new ad-hoc rate limiter was added. Existing bounded SQL buckets remain intact; the platform does not offer a standard rate-limiting primitive. Informational reads and one-time capability writes are distinguished from abuse-prone creation below.

| RPC | Input / authorization / abuse verdict |
| --- | --- |
| `fn_submit_public_referral` | Consent, request ID and field bounds; published business, deduplication and referrer capability checks; request/global buckets. Retained. |
| `fn_submit_earn_lead` | Source allowlist, email format/length, field truncation and validated metro; 10/email/hour. Per-email throttling is not a global anti-spam guarantee; retained existing behavior. |
| `fn_earn_get_link` | Validated names/email/business eligibility; existing IP/global buckets; existing email must be verified before exposing its token. Retained. |
| `fn_slug_status` | Existing slug rejection rules and availability only. No explicit request bucket. Read-only enumeration/availability, no customer data returned. Left unchanged; infrastructure rate limiting remains a gap. |
| `fn_slug_available` | Normalizes input for availability lookup, no explicit format or length check or bucket. Read-only boolean. Left unchanged for compatibility; bounds and infrastructure throttling are recommended follow-up. |
| `fn_prospect_remove` | 10-64 character capability code, 10/request-bucket/hour; cannot remove claimed pages. Retained. |
| `fn_report_failure` | Step allowlist, ownership checks, scrubbed/bounded metadata, demo exclusion; 60/caller/hour, 3000/global/hour plus email throttle. Retained. |
| `fn_record_satisfaction` | UUID capability selects one row; first answer wins. No request bucket. Capability/one-shot write limits mutation but does not rate-limit invalid token probes. Retained. |
| `fn_record_acquisition_event` | Event/path allowlist; 30/caller-bucket/minute. Retained. |
| `fn_platform_counts` | No parameters, aggregate counts only; no bucket. Retained informational read. |
| `has_role` | Caller identity scoped, cannot inspect another user's roles without admin authorization; admin checks now honor live verified factor plus JWT AAL2. No write and no bucket. Retained. |
| `assign_self_role` | Requires authenticated caller, business/referrer allowlist, one initial assignment. Admin self-assignment rejected. No additional bucket because assignment is one-shot. Retained. |
| `award_badge_if_qualified` | UUID lookup, actual caller referral qualification, existing award idempotency. No general bucket; anonymous caller cannot gain another person's award. Retained. |
| `fn_submit_public_capture` | Kind and event allowlists, payload/field bounds and existing per-kind/global buckets. Retained. |
| `fn_get_referral_status`, `fn_resolve_referrer` | UUID or bounded capability token, safe result fields; no general bucket. Required existing status/link flows. Retained; token probing rate limits remain infrastructure follow-up. |
| `fn_business_metro`, `fn_earn_businesses`, `fn_earn_metro`, `fn_earn_metros`, `fn_earn_waiting_count` | Published/live eligible public directory data and aggregate counts only. No request buckets; retained informational discovery reads. |

All authenticated-only RPCs remain protected by ownership, email trust, effective plan or admin `has_role` checks. Trigger-only or service-only writers were not made public. Admin SQL functions inherit AAL2 enforcement through `has_role`; edge functions now invoke it through the verified caller's client, never a service-role role-table authorization shortcut.

## Frame protection and MFA

- Frame protection runs before React renders and again on SPA navigation. The requested dashboard, admin, auth, signup, welcome and checkout paths are protected, as are existing private status/account routes.
- No referral-page iframe/embed feature was found in the app. `/r/*` therefore blocks framing too; marketing pages remain embeddable. Hosted Stripe pages manage their own framing; no payment code changed.
- TOTP QR enrollment is available on `/__sa` and admin Account Settings. Until the first verified factor, the exact enrollment banner appears and access is allowed. With a verified factor, AAL1 does not mount admin content; challenge verification upgrades to AAL2. Failed factor checks fail closed. Auth restoration also waits before mounting private content.
- Recovery guidance requires an encrypted authenticator backup or spare device before verification. Password reset does not remove MFA and no recovery codes are fabricated. Self-service factor reset in Cloud Users is unverified; arrange any lost-factor removal only after owner identity verification.
- Live enrollment was not performed and no factor was created. Admin browser verification was blocked: `--self` has no matching requester account and account-specific minting approval is unavailable here. Do not treat mocked MFA tests as real authenticator verification.

## Hosted auth settings

- Leaked-password protection: enabling `password_hibp_enabled=true` succeeded.
- Require current password for signed-in password changes: enabling succeeded; Account Settings now passes `current_password`. Recovery links keep their normal behavior.
- Minimum password length, hosted email confirmation, OTP expiry and independent read-back of the two settings: unverified. The available project-info/configure tools do not read them. Database password settings do not establish Auth settings. No auto-confirm setting was changed.
- Owner verification path: More > Users > Auth settings > Email. Check minimum password length, Password HIBP Check, Require current password for password changes and Email OTP expiration (seconds). Preserve business signup/email-trust behavior; do not toggle confirmation blindly.

## Edge authorization and secret review

Reviewed current entry points for caller verification, ownership/capability checks and cron/signature authorization. Private actions use validated Auth `getUser`, business ownership or MFA-aware admin checks. Cron workers use configured service/cron credentials; queue alternate service credentials use server-side Auth admin verification. Stripe webhook signature verification was reviewed but untouched; Twilio webhook uses its provider signature. Job ingestion uses a hashed business API key plus plan/suppression checks. Managed email hooks use the managed signed/bearer handler. Public mutation endpoints intentionally use bounded capability or public RPCs instead of requiring an account.

Authorized user/admin entry points include `sa-data`, `partner-admin`, `prospect-lookup`, `email-health-check`, `resend-status`, `geocode-business`, `notify-deal-closed`, `notify-referrer-reward`, `send-notification`, `notify-new-referral`, `send-campaign`, `send-push`, `push-resubscribe`, `billing-history`, `check-subscription`, `create-business-checkout`, `customer-portal`, `preview-transactional-email`. Service workers include `lifecycle-emails`, `monthly-roi-recap`, `nudge-stale-leads`, `notify-new-lead`, `notify-business-signup`, `process-campaign-sends`, `process-email-queue`, `process-referral-triggers`, `dispatch-webhooks`, `security-monitor`, `partner-commissions-mature`, `smoke-maps`. Public guarded actions include `prospect-view`, `referrer-signin`, `handle-unsubscribe`, `partner-apply`, `partner-click`, `partner-dashboard`, `partner-resend-link`, `ingest-job-completed`; webhook handlers include `stripe-business-webhook`, `twilio-inbound-webhook`, `auth-email-hook`, `handle-email-events`. MCP is public discovery with its generated SDK authorization/validation boundary.

No private service, Stripe or email key reference/value was found in client-serving source in the targeted credential sweep; the health page refers to public configuration names only. No secret value was printed or committed. This is a source audit, not an independently extracted published-bundle audit. Signed-out live requests to `sa-data` and `partner-admin` returned 404; `prospect-lookup` returned 401.

## Verification

- Full Vitest: 88 files passed, one skipped; 1114 tests passed, three skipped. `--maxWorkers=2`.
- TypeScript: `bunx tsgo -b --noEmit` passed. Preview's latest build log says build OK. `git diff --check` passed.
- New SQL tests exercise live-factor conditional admin decisions, privilege removal with triggers still firing, and a read-only public view denying writes.
- New UI tests: no factor offers enrollment and allows content; verified factor blocks AAL1; AAL2 allows content; pending/error/auth-restoring states fail closed.
- Live slug availability/status and published-business view read returned 200. Invalid referral consent, invalid Earn email and invalid prospect removal returned their existing validation errors, not permission errors. Anonymous self-role assignment returned not authenticated.
- Browser: top-level signup heading renders; sandboxed framed signup has zero root children; zero runtime errors. Screenshots inspected.
- Existing isolated SQL regressions cover successful referral submission, Earn enqueue/link behavior, signup plus owner publish and prospect preview removal. Successful live write-and-read-back for these flows and real admin/TOTP enrollment are NOT verified: account approval is unavailable and no live customer records or emails were fabricated for testing.

## Removal recommendations, awaiting approval

- `job_ask_delay_rollback_20261113`: candidate for archive/removal only once the delay backfill rollback window has closed and the operator confirms its original values are no longer needed.
- No other named table is recommended for removal now: partner ledger tables, lifecycle/trial history, platform flags, send logs, failure/security events and job/rate/deduplication tables support active operations or recovery. Zero policies is not evidence that a table is unused.
- Nothing was dropped or deleted.

## Every changed file

- `AGENTS.md`: caller-scoped admin assurance, frame guard and dependency override architecture rules.
- `roadmap.md`: security completion and explicit blocked verification tasks; inherited failure-table grant task resolved.
- `docs/incident-runbook.md`: safe admin enrollment/recovery guidance.
- `docs/security-hardening-2026-11-17.md`: this findings report and changelog.
- `package.json`, `bun.lock`: patched direct dependencies and compatible transitive overrides; two moderate router advisories remain.
- `drizzle/migrations/0035_security_admin_mfa_and_internal_access.sql`, `0036_security_public_business_view_read_only.sql`: applied changes and rollback comments.
- `drizzle/migrations/meta/_journal.json`, `0035_snapshot.json`, `0036_snapshot.json`: tool-generated migration history only.
- `src/main.tsx`, `src/lib/frameProtection.ts`, `src/components/FrameGuard.tsx`: initial-render and navigation frame blocking.
- `src/lib/adminMfa.ts`, `src/components/admin/AdminMfaGate.tsx`, `src/App.tsx`: conditional TOTP assurance and enrollment UI gate.
- `src/pages/dashboard/AccountSettings.tsx`: admin enrollment controls and current-password field.
- `src/test/admin-mfa.test.tsx`, `src/test/security-admin-sql.test.ts`, `src/test/security-hardening.test.ts`: frame, MFA and least-privilege regressions; updated admin helper expectation.
- `supabase/functions/_shared/admin-auth.ts`: caller-scoped MFA-aware role check, no role-only fallback.
- `supabase/functions/sa-data/index.ts`, `partner-admin/index.ts`, `email-health-check/index.ts`, `resend-status/index.ts`, `geocode-business/index.ts`, `notify-deal-closed/index.ts`, `notify-referrer-reward/index.ts`, `prospect-lookup/index.ts`, `send-notification/index.ts`: pass verified caller clients to admin checks; deployed.
- `supabase/functions/mcp/index.ts`: automatically regenerated SDK artifact; not deployed until future publish.
- The schema tool regenerated `src/integrations/supabase/types.ts`; no net tracked schema-type difference remains because these changes affect permissions/functions, not row shapes.