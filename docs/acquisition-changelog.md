# Business acquisition changelog

October 31, 2026. Not published.

## Results
- Instant hero preview updates the sign and carries business name, trade, reward and bounded campaign data into signup through both session storage and query parameters. Signup metadata initializes the new business; onboarding uses existing available-slug resolution and adds optional mobile capture.
- `/start` and all 20 existing industry slugs have dedicated noindex,follow landing pages. No gutters industry exists, so no invented trade was added. Existing slugs are pool-service, garage-door and house-cleaning. Landing pages stay out of sitemap, RSS and AI text.
- New businesses get server-created, owner-immutable 14-day trials. Existing rows are not backfilled. Stored paid plan and Stripe derivation are unchanged. Effective plan drives dashboard/profile permissions, contact import enforcement, campaign composition/queue delivery and lifecycle/monthly recap eligibility. First 100 contacts are ranked by creation time, with id only as deterministic tie-break. Expiry retains every contact; excess asks pause.
- Signup/publication alerts have distinct idempotency keys and include acquisition, reward, owner email, mobile and page/admin links. Publication alerts require a verified owner session. Phone links support human follow-up; no automatic owner SMS is sent.
- Conflicting founding strips on Home/Pricing are hidden; the offer configuration, prices and payment flows remain untouched.
- Mobile CTA uses intersection/focus state, reserved bottom space and safe-area inset. Pixel id is empty; no provider code loads. If enabled, fixed events are exchanged through a separate no-referrer document after delayed activation and regional permission. Unknown and consent-required regions are blocked without a banner; browser opt-outs and saved refusal are honored. No matching or uploads.

## Verification
- Full suite: **791 passed, 3 skipped**, 57 test files passed and one skipped. Deno function checks included.
- Automatic preview build/typecheck: **build OK**, latest verified October 31 at 16:10:51 UTC. Manual builds/typechecks were not run.
- Playwright at 1440x900 and 390x844: typed name/reward updated sign, submitted into prefilled signup, locked HVAC trade, no horizontal overflow or page errors. No signup was submitted.
- Actual migration tested in isolated PostgreSQL: exactly 14 days, no existing-row backfill, owner cannot extend expiry, paid Pro wins, wrong owner denied, contact 101 paused after expiry while all contacts remain, extra import refused, narrow event RPC rejects unsupported paths/events.
- Public brand, metadata/schema and existing regression guards pass. No fresh production-artifact Lighthouse or axe run: Accessibility/Best Practices/SEO 100 and Home/Pricing mobile non-regression remain unverified. No production dist is available from the automatic preview harness.
- Deployed: notify-business-signup, send-campaign, process-email-queue, monthly-roi-recap, lifecycle-emails, preview-transactional-email. No customer/admin test messages sent. Existing scheduler frequency caps and suppression remain; a trial notice may be deferred by the one-email-per-24-hours cap. Email delivery and end-to-end new-account publication are not verified.
- Calling each owner within the hour requires the team's response. The optional field's text describes team texting; delivery is manual, not automated. No hour guarantee was added to public copy.
- Pixel is disabled. Enabled provider receipt and attribution are unverified. Isolated fixed-event measurement would report the ad-events document rather than the original landing URL; no claim of optimization eligibility is made. Keep Meta dataset restrictions/Business Tools Terms and privacy disclosures under review before enabling. Withdrawal is available on Privacy and through browser opt-outs.

## Files
### Frontend and content
- src/lib/instantPreview.ts: validated capture, storage/query handoff, acquisition and sign defaults.
- src/lib/acquisitionEvents.ts, src/lib/track.ts: fixed new events through narrow RPC, no typed data.
- src/content/previewTrades.ts, src/content/industries.ts: lightweight choices and re-export.
- src/components/marketing/InstantPreview.tsx, HeroYardSign.tsx: three-field preview and sign state.
- src/pages/Index.tsx, Pricing.tsx: preview/trial copy and hidden conflicting founding strips.
- src/pages/Start.tsx, src/content/startPages.ts, src/content/seoRoutes.ts, src/App.tsx: landing routes, FAQs and prerender entries.
- src/components/SEOHead.tsx: optional noindex,follow.
- src/components/signup/SignupForm.tsx, src/pages/Onboarding.tsx: prefill, metadata, mobile and confirmation-link handoff.
- src/lib/publishPage.ts: publication alert invocation.
- src/lib/effectivePlan.ts, src/pages/dashboard/BusinessDashboard.tsx, ProfileEdit.tsx: server entitlements and trial banner.
- src/components/dashboard/CustomersTab.tsx: free-limit eligibility and authoritative preparation gate.
- src/pages/dashboard/AdminDashboard.tsx, src/pages/SuperAdminCRM.tsx: acquisition, phone and record-target display.
- src/components/marketing/MobileStartBar.tsx, src/components/Layout.tsx: conditional mobile CTA.
- src/config/brand.ts, src/components/MetaPixel.tsx, src/lib/metaPermission.ts, src/lib/metaPixelLoader.ts, public/ad-events.html, src/pages/Privacy.tsx: empty slot, deferred isolated provider boundary and disclosure/withdrawal.
- src/lib/supabaseLazy.ts: Start marketing classification.

### Database and functions
- drizzle/migrations/0007_acquisition_pro_trial.sql: acquisition, pro_trial_ends_at, published_notified_at nullable columns; fn_new_business_acquisition_trial, fn_effective_plan, fn_contact_ask_allowed, fn_guard_contact_ask_limit, fn_record_acquisition_event; updated fn_enforce_free_contact_limit; additive triggers and explicit function grants. No RLS policy changed. Existing phone column reused.
- drizzle/migrations/meta/0007_snapshot.json, meta/_journal.json and src/integrations/supabase/types.ts: generated migration/schema metadata.
- supabase/functions/_shared/effective-plan.ts, acquisition-notification.ts, trial-notices.ts: authority and notification helpers.
- supabase/functions/_shared/transactional-email-templates/trial-ending.tsx, registry.ts, _shared/lifecycle-categories.ts: account-specific expiry notices.
- supabase/functions/notify-business-signup/index.ts, lifecycle-emails/index.ts, monthly-roi-recap/index.ts, send-campaign/index.ts, process-email-queue/index.ts: alert, trial eligibility and queue-time checks.

### Tests and build
- src/test/acquisition-rules.test.ts, acquisition-sql.test.ts: numbered requirement logic and actual migration tests.
- src/test/customers-tab-workflow.test.tsx: authoritative ask fixture.
- src/test/track-signup-lane.test.ts: existing insert policy unchanged, new RPC lane separate.
- src/test/seo-pass.test.ts: longer isolated sitemap test allowance.
- package.json, bun.lock: PGlite dev test dependency; Vite/plugin version alignment.
- vite.config.ts, plugins/ssr.ts: normalize duplicate installed Vite plugin type boundary, without changing runtime hooks.
- AGENTS.md, roadmap.md: architecture and completion/verification limitations.
- .lovable/mcp/manifest.json and supabase/functions/mcp/index.ts: automatically generated changes observed; not manually edited for this request.
- docs/acquisition-changelog.md: this report.