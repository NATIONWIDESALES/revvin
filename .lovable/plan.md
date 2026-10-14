# Batch one: conversion audit, code-only

## Newer work since baseline 7b3cd5a
One commit, 72b2cda (Oct 14): 10 lines in `supabase/functions/mcp/index.ts`. Preserve it; Batch one does not touch that file.

## Capability matrix (verified in source)
| Capability | Free | Pro | Who sends |
|---|---|---|---|
| Personal SMS/email ask | Yes | Yes | Owner's own device (pre-filled) |
| Job-done review + referral email | Yes, after Job done tap or Zapier/API | Yes | Revvin, email only |
| Reactivation campaigns | Preview, counts, templates; upsell | Send | Revvin via queue, email only |
| Contact import, bulk asks | No | Yes | Owner device / queue |
| Integrations (Webhooks by Zapier, API key) | Yes | Yes | n/a |
| Sender identity | Business name From, replies to owner email | same | |
| Reward records | Owed to paid tracking; business pays directly | same | Off-platform |
| Billing | n/a | $49/mo or $450/yr USD, optional $297 | Stripe webhooks |

Verified in `send-campaign`: `MAX_RECIPIENTS = 500` with skip reason `over_500_campaign_cap`; server returns 403 unless `plan = 'pro'`; suppression checked per business and platform wide right before send; customer replies go to the owner. The send function only queues messages; `process-campaign-sends` delivers them. "Sent" in the UI means queued, not delivered.

## Stale denials found
- `seoRoutes.ts` line 488 (about-revvin-llm abstract): "no automatic asking engine, no automated review-request sending" contradicts the Job done and Zapier emails. Rewrite to the true trigger wording.
- Line 546 is correct. "No public API or webhook product" on line 488 needs softening to "no Zapier directory app; Webhooks by Zapier with your API key".
- Comments: `App.tsx:149` and `AttestationGate.tsx:12` use "FOUNDER TODO". Rename to "TODO" (only comments).

## Founder identity to remove
- `GuidePage.tsx`: byline "By Karm Sandhu, Founder of Revvin" and Article `author` Person. Replace with Organization author (`ORG_ID`) and no visible personal byline.
- `brand.ts`: drop `FOUNDER`/`CONTENT_AUTHOR` exports from the public pages. Check prerender guide output too.
- Lifecycle email sender "Karm at Revvin" is email, out of scope here; listed as an unresolved fact.

## Measurement findings
- `MetaPixel` is a deliberate no-op; leave it.
- DB insert policy allows `signup_viewed`, `signup_submitted`, `signup_failed`, `signup_form_started`, but `analyticsPrivacy` drops them on `/signup` because they are not milestone events. Only `signup_succeeded` reaches the database. Repair: add those four to `MILESTONE_EVENTS`, carry no extra data, and stop `SignupForm` sending `invite_code`.
- New CTA names (`hero_setup_call`, `pricing_setup_call`, `home_demo_inline`) must be added to the fixed CTA allow-list in `analyticsPrivacy.ts`. `cta_clicked` is already allowed by the database policy.
- Unverified: whether later migrations put the dashboard and campaign events on the database allow-list. Read-only check next batch; no migration in this batch.

## Proposed changes (smallest set)
1. **Mobile layout**: `Index.tsx`, `HeroPhoneScene.tsx`: stop the phone scene overflowing at 375px (`max-w-full`, `overflow-x-clip` on the section) and keep the h1 and CTAs visible at load.
2. **Tools further down**: `Index.tsx`: move the toolkit section below the pricing split. Keep every sentence and section otherwise.
3. **Demo on the page**: `Index.tsx`: the "Try the demo" button scrolls to the demo section with `scrollIntoView` (no `#hash` in the URL) and sends `cta_clicked {cta:"home_demo_inline"}`. `/sample` stays as a fallback link.
4. **Same Free button everywhere**: one `FREE_CTA_LABEL` ("Start free, no card") in `planFeatures.ts`, used on `Index.tsx`, `Pricing.tsx`, `InviteLanding.tsx`, `IndustryLanding.tsx`, `GuidePage.tsx`, `Navbar.tsx`.
5. **Setup call**: link the existing 30-minute call (`SETUP_CALL_URL`) as a quiet line under the homepage CTAs and the Pricing Pro card, tracked with a fixed CTA name.
6. **Mock data**: `MockLeadsTable`, `MockReferralPage`, `MockPageBuilder`, `HeroPhoneScene`, `samplePage.ts` all use one fictional business, reward and set of names from `samplePage.ts`, labeled "Example".
7. **Measurement fixes**: `analyticsPrivacy.ts`, `SignupForm.tsx` as above.
8. **Stale copy**: `seoRoutes.ts`, `public/llms.txt` (matching line), comments.
9. **No founder identity**: `GuidePage.tsx`, `brand.ts`.

These stay as they are: $49/mo and $450/yr USD, the optional $297 service, the 40% partner program, Stripe, entitlements, the database and emails.

## Tests
- Update `track-privacy.test.ts` / `analyticsPrivacy.test.ts`: signup events pass on `/signup` and carry no meta; unknown CTA names are rejected.
- `content-guards.test.ts`: fail if "Karm" or "Founder" appears in public pages or prerender output, or if any "no automatic ask" denial comes back.
- `prerendered-html.test.ts`: guide JSON-LD author is the Organization.
- `homepage-demo.test.ts`: the inline demo button leaves `location.hash` empty.
- Run typecheck, `bun run test`, production build, and a 375x812 Playwright check of `/`, `/pricing`, `/i/launch`.

## Unresolved facts
- Should the lifecycle email sender "Karm at Revvin" and its "Karm" sign-off stay? They conflict with brand-led. Proposed: change them in a later email batch.
- Which events are on the live database allow-list (needs a read-only query).
- Should `FOUNDER` stay as private metadata or be deleted outright? Proposed: delete it.
- The founder story email (`free_d14`) is now moot. Confirm it should be retired.
- Publishing is needed before any of this goes live.
