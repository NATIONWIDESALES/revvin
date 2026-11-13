# Congruency fixes, November 13, 2026

## Results

1. `/referral-agreement` now redirects client-side to `/terms`. The obsolete agreement component is deleted. Homepage/pricing trust links lead to About and Terms; the wizard link reads Terms. Reserved slug entries remain untouched, as do analyticsPrivacy and supabaseLazy path allowlists. No prerender, sitemap or robots changes.
2. All three existing Pro lifecycle candidates carry copy-only trial context. Trial means stored plan is not `pro` and its end is strictly in the future. Dates use en-US month/day in UTC, such as November 25. Trial welcome uses the exact requested subject, heading and opening. The two follow-ups refer to your Pro trial. Paid-Pro copy, steps, candidate choice, eligibility, suppression, frequency, ledger and timing remain unchanged.
3. Live source prices now derive from shared pricing config or the existing mirrored email constant. Deleted three legacy components only after confirming no imports. Competitor facts, launch guarantee, prices, features, caps, trial length, payment code and all database files remain untouched. Two dashboard files changed comments only to satisfy the repository-wide literal guard.

## Verification

- Full Vitest suite: **949 passed, 3 skipped**, 70 test files passed and 1 skipped. No failing tests. Existing React server-render useLayoutEffect warnings remain.
- New focused checks: 16 new tests; focused run across congruency, lifecycle and public-facts files: 46 passed.
- Application typecheck: `tsgo -b --noEmit`, exit 0.
- Preview build signal: build OK, latest inspected entry November 13 at 22:20:58 UTC. No manual production build was run.
- Compared all evaluated exports for guides, industries, legal, startPages and seoRoutes against the pre-change HEAD: all identical, including crawler route data. Price replacement did not alter content.
- Desktop local browser: retired agreement redirected to Terms; `/pricing`, `/sample`, `/start/roofing`, `/referral-program/roofing` showed the unchanged monthly price. Pricing contains Terms links and no retired agreement link. No page errors. Screenshot: `/tmp/browser/congruency/terms.png`.
- `git diff --check` passed.

## Deployment and limits

- **No edge functions were redeployed.** Trial email and send-notification edits are source-only and require function deployment before affecting live emails. No emails were sent and no historical lifecycle records were reset.
- **Frontend not published.** Redirect and page-source changes require publishing to reach the live site.
- `index.html` was deliberately left static and unchanged. A test asserts both of its standard monthly price mentions match config. `public/llms.txt` stays static and unchanged; a test extracts both Pro prices and the Free customer cap and compares them with config.
- Browser checks were local desktop public checks, not an exhaustive mobile/live-route audit. Live email delivery and paid/trial production messages were not verified.
- No database changes, Stripe changes, checkout changes, promotion changes, lifecycle sending changes or rep-commission work.

## Every changed file

- `AGENTS.md`: Record copy-only trial context as separate from lifecycle selection.
- `roadmap.md`: Track and close only these three requested fixes.
- `src/App.tsx`: Redirect the retired agreement URL to Terms with Navigate replace.
- `src/pages/ReferralAgreement.tsx`: Delete the stale, formerly routed agreement component.
- `src/components/marketing/HowPayoutsWork.tsx`: Closing links now point only to About and Terms.
- `src/components/ReferralWizard.tsx`: Legal link now points to Terms and is labeled Terms.
- `src/content/guides.ts`: Derive standard Pro price text from PRICE_TEXT; keep evaluated content identical.
- `src/content/industries.ts`: Derive FAQ and description prices from PRICE_TEXT without changing content.
- `src/content/legal.ts`: Derive monthly and yearly prices; legal text and dates remain identical.
- `src/content/startPages.ts`: Derive trial FAQ prices while preserving its exact wording.
- `src/content/seoRoutes.ts`: Remove the fixed monthly price from a comment only; route data unchanged.
- `src/pages/Sample.tsx`: Render the same monthly price through PRICE_TEXT.
- `src/pages/Start.tsx`: Render the same monthly and annual prices through PRICE_TEXT.
- `src/pages/IndustryLanding.tsx`: Derive Offer price and description from pricing config, retaining their values and types.
- `src/pages/ForBusinesses.tsx`: Delete unimported, already redirected legacy component with fixed prices.
- `src/pages/TrustCenter.tsx`: Delete unimported, already redirected legacy component with fixed prices.
- `src/pages/AboutRevvinLLM.tsx`: Delete unimported, already redirected legacy component with fixed prices.
- `src/components/dashboard/RoiSummaryCard.tsx`: Remove a price literal from a comment only; no dashboard behavior or copy changes.
- `src/pages/dashboard/AdminDashboard.tsx`: Remove a price literal from a comment only; no admin behavior or rendered changes.
- `src/test/public-facts.test.ts`: Retain retired-claim assertions against the current About page and shared content rather than deleted components.
- `src/test/congruency-fixes.test.ts`: Add 16 tests for redirect/reserved slug, retired links, trial context, actual email rendering, source price guards and static parity.
- `supabase/functions/_shared/trial-notices.ts`: Reuse the trial helper module for copy context and UTC plain-date formatting; existing notice function unchanged.
- `supabase/functions/lifecycle-emails/index.ts`: Pass onTrial and trialEndsOn to exactly the three Pro candidates; all candidate conditions and sending rules unchanged.
- `supabase/functions/_shared/transactional-email-templates/pro-welcome.tsx`: Use requested trial subject, heading and opening only for onTrial; preserve paid copy and steps.
- `supabase/functions/_shared/transactional-email-templates/pro-no-import-d2.tsx`: Refer to the Pro trial for trial data; retain paid copy and other content.
- `supabase/functions/_shared/transactional-email-templates/pro-no-ask-d7.tsx`: Add trial context only for trial data; retain paid copy and other content.
- `supabase/functions/send-notification/index.ts`: Use existing mirrored PRICE_MONTHLY_TEXT for the invitation price; resulting message unchanged.
- `docs/congruency-fixes-2026-11-13.md`: Document every changed file, verification and deployment limits.


## Same-user auth refresh fix, November 13 at 22:34 UTC

### Results

- Same-user SIGNED_IN and TOKEN_REFRESHED updates keep the existing user object and update the session with fresh tokens without setting auth loading. Initial getSession restoration also preserves identity for the same ID. New-user and signed-out behavior is unchanged; a nullable-session guard replaces existing non-null assertions.
- BusinessDashboard's account and checkout-return effects depend on user ID. The full-page spinner is used only when no business is loaded. Later reloads retain the current business and mounted UI until refreshed data arrives; a failed business fetch does not discard an already loaded business.
- Both onboarding effects and all listed account-data effects now depend on user ID rather than the user object. Existing role, business ID, offer ID and navigation dependencies remain in place.
- ProspectsPanel was audited and left unchanged: its loader depends on a stable load callback, not user; its user-dependent memo only derives the caller name and does not load data or reset forms. Other remaining user-object dependencies are auth navigation or referral event listeners, not data loaders/form resets, and were left unchanged.

### Every file changed in this section

- `src/contexts/AuthContext.tsx`: Preserve same-user object identity while refreshing sessions and initial restoration.
- `src/pages/dashboard/BusinessDashboard.tsx`: Key account effects by ID and keep loaded dashboard content mounted during background refreshes.
- `src/pages/Onboarding.tsx`: Key both initialization effects by ID so same-user events do not overwrite unsaved fields.
- `src/pages/dashboard/ProfileEdit.tsx`: Key profile/business form initialization by ID while preserving role dependency.
- `src/pages/dashboard/CreateOffer.tsx`: Key business initialization by ID without changing offer creation.
- `src/pages/dashboard/EditOffer.tsx`: Key offer form initialization by account ID and offer ID.
- `src/pages/dashboard/InviteCustomers.tsx`: Key business loading by account ID.
- `src/pages/dashboard/PayoutsPage.tsx`: Key reward loading by account ID and business ID.
- `src/pages/dashboard/ReferrerDashboard.tsx`: Key referral loading/claim initialization by account ID.
- `src/pages/dashboard/AdminDashboard.tsx`: Key admin data loading by account ID.
- `src/pages/Me.tsx`: Key private referral loading/reset by account ID.
- `src/components/NotificationBell.tsx`: Avoid refetching and resubscribing notifications for same-user auth events.
- `src/test/auth-sign-in-sequence.test.tsx`: Assert actual auth events preserve user reference, update session, and never restore loading.
- `src/test/onboarding-one-screen.test.tsx`: Assert same-ID auth-object replacements preserve unsaved name/reward fields and perform only one initialization read.
- `src/test/dashboard-auth-refresh.test.tsx`: Assert initial spinner, stable nav/lead-row nodes, open dropdown, no repeat reads on same-ID events, and retained notes/UI during a pending background refresh.
- `AGENTS.md`: Record identity-stable auth and ID-keyed loader convention to prevent this regression.
- `roadmap.md`: Track and close this fix without resuming parked rep work.
- `docs/congruency-fixes-2026-11-13.md`: Append results, file list and verification limits.

### Verification and limits

- Full Vitest suite: **953 passed, 3 skipped**; 71 test files passed, 1 skipped. No failures or unhandled errors. Existing server-render useLayoutEffect and React Router future warnings remain.
- Focused auth/dashboard/onboarding tests: **10 passed**, including four new regressions. Dashboard tests mount the real dashboard and lead controls with isolated account-data fixtures; auth tests emit actual provider callbacks. Onboarding tests deliberately replace the mocked auth user object with a new same-ID object to verify its effect independently.
- Application typecheck: `tsgo -b --noEmit`, exit 0.
- Preview build signal: latest inspected entry at **22:36:43 UTC**, build OK. No manual production build.
- `git diff --check` passed.
- Authenticated browser verification could not be completed: preview was signed out and the requesting user's account could not be matched for a preview session. No other customer's account was selected. Actual multi-tab BroadcastChannel behavior and phone Messages-app return remain unverified in a browser; covered at the auth callback and component regression levels instead.
- No copy, Stripe, database, RLS, migration, edge function, entitlement or sending changes. No functions redeployed. **Frontend not published**; production remains unchanged until review and publication.
