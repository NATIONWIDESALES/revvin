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
