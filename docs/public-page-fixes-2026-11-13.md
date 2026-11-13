# Targeted public-page fixes, November 13, 2026

## Items 1 to 4
1. Unlocked hero trade starts empty with a disabled placeholder and required browser validation. Submission also refuses an empty trade. Reward starts at 100, then uses the existing trade suggestion; the preview uses the generic question until selection. Locked /start/{trade} behavior is unchanged. No existing business industry records were edited.
2. The five pricing Q/A pairs now have one shared content source. Collapsed accordion answers stay mounted in the HTML, with the native hidden attribute preserving the interactive collapsed state. The page and prerender route use the same pairs for FAQPage. The launch question omits its formerly hard-coded price; its unchanged answer includes the shared guarantee.
3. The worksheet explicitly labels the yearly plan and once-yearly billing using PRICE_TEXT.annualPerYear. Arithmetic and prices are unchanged.
4. The roundup has five visible FAQs, with two or three sentences per answer, from the existing comparisons and homepage FAQ facts. Revvin amounts in the touched comparisons file now read the pricing config; competitor figures and wording are unchanged. Roundup Last updated and Article dateModified are November 13, 2026. Its original publication date and October 29 competitor fact-check line remain unchanged.

## Item 5: new referral documents after a site publish (report only)

### What produces /r/{slug} today
- During the site's Vite build, plugins/prerender.ts closeBundle reads the build's HTML template, fetches public business rows from businesses_public with PRERENDER_BUSINESS_COLS and a limit of 1,000, and iterates the returned slugs. Missing credentials, a failed request, or an invalid response results in no business documents from that fetch.
- For each returned business it supplies __REVVIN_SSR__ to the build-time renderer, renders the referral page, and calls renderBusinessDoc. That sets business-specific title, description, canonical, social metadata, structured data and HTML. Full renders embed window.__REVVIN_SSR__ for matching browser hydration; a failed full render still gets the business-specific text fallback.
- The build writes dist/r/{slug}/index.html, queues a business share image at /og/r--{slug}.png, and writes the page manifest. Site publication deploys those build artifacts. Publishing a business in the app changes its live record, not the hosting files.
- A business created/published after the last deployed build has no corresponding static file in that deployment. Lovable's SPA fallback serves the root index.html. JavaScript can load the real referral page and change its head, but non-JavaScript link-preview clients read the homepage metadata instead. The existing fallback guard is JavaScript too, so it cannot correct those clients.
- Yes: under the current implementation, a new business's static document appears only after a subsequent site build is deployed, provided its public row is included in the fetch. A local or preview build alone does not update revvin.co. Neither customer signup nor owner publication currently initiates a site deploy. The 1,000-row limit also means a subsequent publish is not an unlimited guarantee of coverage.

### Production evidence, November 13
- A direct HTML request to https://revvin.co/r/bachmann-floors returned HTTP 200 with title `Revvin | Free referral program for home-service businesses`, canonical `https://revvin.co/`, and the homepage social title/image, not business-specific metadata. Its text did not contain the business name.
- https://revvin.co/og/r--bachmann-floors.png returned HTTP 404.
- This confirms the reported missing static business document/image. The business creation date and the exact date/version of the last production deployment were supplied by the owner, not independently verified here. Literal response-byte equality is not asserted; hosting can inject different response data.

### Options without a manual site publish
1. Request-time server rendering on Lovable's newer TanStack Start hosting: migrate the app, then implement /r/{slug} to fetch its public business data and return business-specific head metadata and HTML on each request. A valid existing logo or a request-time publicly accessible share image is also needed; migration alone does not automatically implement that data/metadata/image flow. One initial deployment is required, then new businesses would not need individual site republishes. This is the native hosting route to dynamic previews. See https://lovable.dev/blog/building-apps-using-tanstack-start. The upgrade can be requested in chat or through the Migrate to TanStack Start action; no migration was attempted.
2. A separately hosted dynamic public share URL could serve the business head/image and link onward to the current referral page. Share that URL instead of /r/{slug}. It needs a new public renderer and deployment, outside this patch. To keep the same revvin.co/r/{slug} URL, an external reverse proxy/custom hosting arrangement would need to intercept that path and serve dynamic HTML; that is not a built-in routing feature of this Classic Lovable deployment.
3. An automatic build/deploy pipeline could regenerate static documents after business publication, but it would still be a site publish, only automated. No supported unattended publish hook or existing automation was verified here, so this is not presented as an available configured Lovable option. Repeated static deployment also retains a delay and the current fetch-limit issue.

No _redirects, _headers or platform-specific hosting config fixes are supported by Lovable hosting. Client head changes, sitemap refreshes, or creating a share image alone cannot give a non-JavaScript client the missing business head. No referral-generation, hosting, sitemap, robots or not-found code was changed for this item.

## Changed files
- src/components/marketing/InstantPreview.tsx: require an explicit unlocked trade and generic preview/default reward.
- src/components/marketing/ReferralWorthCalculator.tsx: label yearly-plan billing from the pricing config.
- src/content/pricingFaqs.ts: shared five pricing Q/A pairs and client FAQPage schema.
- src/pages/Pricing.tsx: reuse pricing pairs/schema and keep collapsed answers in HTML.
- src/content/seoRoutes.ts: reuse pricing/roundup FAQs and the roundup modification date; no sitemap algorithm change.
- src/content/comparisons.ts: sourced roundup FAQs/date and config-derived Revvin amounts; preserve competitor facts.
- src/pages/ComparePage.tsx: render roundup FAQs/schema and its updated date, preserving comparison dates.
- src/test/instant-preview-form.test.tsx: empty/selected/locked trade navigation regressions.
- src/test/prerendered-html.test.ts: full SSR and text-fallback answer/schema parity for both pages.
- src/test/comparison-pages.test.ts: require roundup FAQPage and verify publication/modification dates.
- docs/pricing-rollout-2026-11-10.md: rephrase two historical documentation lines that failed the existing content guard; no guard exemption added.
- docs/public-page-fixes-2026-11-13.md: this itemized changelog and referral-preview report.
- AGENTS.md: record shared pricing-FAQ architecture.
- roadmap.md: track and close the requested work; rep work remains parked.

## Verification
- Initial full Vitest run: 932 passed, 1 failed, 3 skipped. The failure was two pre-existing historical changelog lines caught by the existing unqualified setup-fee guard. Those lines were rephrased without changing tests or competitor content.
- Final full Vitest suite: 933 passed, 3 skipped, 0 failed across 70 files (69 passed, 1 skipped). Typecheck: oj typecheck -b --noEmit passed with no diagnostics. Latest harness build signal: build OK at 21:44:31 UTC. Existing server-render useLayoutEffect warnings remain; no new failure or browser page error was observed.
- Real Chromium checks at 1280x1800 and 390x844: empty trade blocked navigation, generic named-business preview displayed, selected trade navigated to signup with that trade, and locked roofing stayed selected/disabled. No account was created.
- Pricing answers remained present while collapsed, opened/closed correctly, and client FAQPage had five pairs. Roundup displayed five answers and November 13 date without page overflow. No page errors in either viewport. Screenshots are under /tmp/browser/public-fixes/.
- Static tests exercise renderRoute with the actual page SSR markup and the fallback renderer, parse the document JSON-LD, and compare all answer strings. No standalone production build was invoked because the harness owns builds. A newly deployed production document is unverified and intentionally not published.
- Prices, plan limits/features, payments, checkout, promotions, database, policies, migrations, edge functions, dashboard, onboarding, emails, admin, partner and Earn logic were not changed. Item 5 is report only; the live link-preview limitation remains.