# Product fixes, November 13, 2026

Frontend not published. Only the two authorized database migrations were applied. Only the three named edge functions were deployed. Prices, checkout, Stripe, promotions, plan features, RLS policies and lifecycle send selection/timing were not changed.

## Items 1 through 8

1. Campaign readiness: captured the live function definition and retained its signature, STABLE SECURITY DEFINER, search_path, authentication and owner lookup. Replaced only the five array concatenations with array_append. Live readback confirmed the corrected body and existing execution grants. The missing-field inputs already existed: the RPC exception returned no readiness row, so the card had no fields. Successful readiness now exposes those existing five inputs. Failure has an explicit Try again action instead of an empty Save details card. The load callback depends only on business ID and reads the current toast through a ref, preventing toast identity changes from rerunning it; thrown failures are handled too.
2. Removed the owner text-link promise and the SMS notification switch/phone input. Saved SMS columns remain stored and the notification-save payload no longer writes either SMS field, so saving email settings cannot overwrite them. Email controls are unchanged. Search findings are below.
3. Set the business job-ask delay default to 2 and changed the eight existing businesses still at 24 to 2. Live readback: default 2, zero businesses remaining at 24. Captured original backfilled values in a service-only, RLS-enabled table with no client grants or policies, making reversal selective. Existing scheduled referral_triggers were not modified. The isolated SQL test verifies new inserts, custom delays, original-value restoration and unchanged scheduled timestamps.
4. Pro upgrade copy now resolves by feature label, not array position: reporting is ROI reporting and monthly recap; branding is Custom page branding; customers combines unlimited customers and automatic asks. Tests bind all three to their intended features.
5. Signed-in signup checks the owner's publication flag and routes published businesses to /dashboard, otherwise /welcome. Submitting signup still owns held-checkout navigation, with cancellation of stale routing work. /welcome loads is_published and switches only its heading/button to Edit your page / Save changes. Save behavior is unchanged.
6. A successful Closed Won update for a lead without a value opens a small row prompt. Status, reward creation and existing email invocation do not await the prompt. Save reuses the Details deal_value writer; Skip dismisses without a value write. Tests verify immediate status update, 1500 saved to deal_value and Skip.
7. Applied sidewalk, Edit page, the all-closed-leads home state, and Cancel anytime in the requested llms and two offer descriptions. Other any time uses were left alone.
8. Deployed lifecycle-emails, send-notification and preview-transactional-email successfully via the explicit deployment tool. No edge source changed in this run. No email was sent or resent by this work and no lifecycle history was reset. Existing scheduled functions remain active; routine future processing was not disabled.

## Exact applied migrations

### drizzle/migrations/0028_fix_campaign_readiness_array_append.sql

```sql
CREATE OR REPLACE FUNCTION public.fn_campaign_readiness()
 RETURNS TABLE(ready boolean, missing text[], business_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b public.businesses%ROWTYPE; m text[] := '{}';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'You need to be signed in.'; END IF;
  SELECT * INTO b FROM public.businesses WHERE user_id = auth.uid() LIMIT 1;
  IF b.id IS NULL THEN RAISE EXCEPTION 'No business found on this account.'; END IF;

  IF coalesce(btrim(b.street_address),'') = '' THEN m := array_append(m, 'street_address'); END IF;
  IF coalesce(btrim(b.city),'')           = '' THEN m := array_append(m, 'city'); END IF;
  IF coalesce(btrim(b.postal_code),'')    = '' THEN m := array_append(m, 'postal_code'); END IF;
  IF coalesce(btrim(b.country),'')        = '' THEN m := array_append(m, 'country'); END IF;
  IF coalesce(btrim(b.business_email),'') = '' THEN m := array_append(m, 'business_email'); END IF;

  RETURN QUERY SELECT (array_length(m,1) IS NULL), m, b.id;
END $function$;
```

Reversal: CREATE OR REPLACE with this identical definition, replacing the five array_append(m, 'field') expressions with the former m || 'field' expressions. Existing grants are preserved in either direction. This would deliberately restore the original bug, so it was not executed.

### drizzle/migrations/0029_job_ask_delay_two_hours.sql

```sql
CREATE TABLE public.job_ask_delay_rollback_20261113 (
  business_id uuid PRIMARY KEY,
  previous_delay_hours integer NOT NULL
);
GRANT ALL ON public.job_ask_delay_rollback_20261113 TO service_role;
ALTER TABLE public.job_ask_delay_rollback_20261113 ENABLE ROW LEVEL SECURITY;
INSERT INTO public.job_ask_delay_rollback_20261113 (business_id, previous_delay_hours)
SELECT id, trigger_delay_hours FROM public.businesses WHERE trigger_delay_hours = 24;
ALTER TABLE public.businesses ALTER COLUMN trigger_delay_hours SET DEFAULT 2;
UPDATE public.businesses SET trigger_delay_hours = 2 WHERE trigger_delay_hours = 24;
```

Selective reversal, not executed:

```sql
ALTER TABLE public.businesses ALTER COLUMN trigger_delay_hours SET DEFAULT 24;
UPDATE public.businesses b
SET trigger_delay_hours = r.previous_delay_hours
FROM public.job_ask_delay_rollback_20261113 r
WHERE b.id = r.business_id AND b.trigger_delay_hours = 2;
```

The rollback snapshot remains locked. Newly created businesses and originally custom values are not part of the backfill reversal. A later intentional change from 2 to another delay is also left untouched. No existing scheduled ask is changed by the forward or reverse SQL.

## Report: Item 2c, other owner-SMS promises

No other user-facing statement found that Revvin texts the business owner. Onboarding still mentions launch email + SMS templates; that describes templates, not sending. The toolkit and guides contain first-person customer scripts such as I will text you the link: the business owner says and sends those, not Revvin. Public llms, legal and trade FAQs explicitly describe device-native SMS and say Revvin does not send customer SMS. Those passages were not changed. Stored SMS configuration/type names remain intentionally present.

## Report: Item 3, other 24-hour delay paths

No active frontend or edge-function path found that hard-codes 24 for this job-completion ask delay. AutoAskTab's display constant is already 2. The current live fn_create_job_ask uses now() + make_interval(hours => b.trigger_delay_hours). The historical May migration sets DEFAULT 24 and is retained immutably; the new migration supersedes it. Other 24-hour values concern lead nudges, queue TTLs, campaign stuck-send handling and daily rate limits, not this delay. Follow-up timing after a review request is separate and unchanged.

## Report: Item 9, service worker and stale builds

Read-only inspection downloaded the live /sw.js and current published entry script. The live worker version was 20261113223904; the homepage entry was /assets/index-BaLjP4Z-.js. Both match the current source strategy:

- Navigation/HTML is **network-only**, not cache-first and not network-first with a stale HTML fallback. handleNavigation calls fetch(request, { cache: 'no-store' }). A failed network request serves /offline.html or a 503, never cached page HTML. Login/signup/auth/reset exclusions fall through to normal browser networking rather than worker caching.
- Same-origin build assets under /assets and /fonts are cache-first. Changed content has changed asset filenames. APIs and third-party requests are not cached.
- Installation precaches selected assets/offline page with Promise.allSettled and calls skipWaiting. Activation deletes caches outside the current version and calls clients.claim; it does not wait for all tabs to close or for the Refresh button.
- Current registration uses updateViaCache: none and checks for a worker update on initialization, tab visibility and hourly while open. A page already controlled by a worker reloads once on controllerchange. This behavior is present in the downloaded live entry. UpdateToast's old comment says the app never reloads automatically, but that comment disagrees with the actual registration behavior; report only, not edited.
- A visitor already running the current worker gets current network HTML on the next full online navigation. An already-open visible page can remain old until the hourly check plus download/install time; reopening the tab triggers a check. Background timers can be throttled. There is no guaranteed maximum if the device is offline, checks fail, the tab is suspended, or an older cached application never runs the current registration code.
- An older cache-first worker can serve an old document for a returning visitor's next load before its replacement arrives. Current clients reload on takeover, but an older cached entry might lack that listener. clients.claim alone changes the controller; it does not replace the already-rendered old page. Such a visitor can stay old past that load. The affected browser's actual installed worker/cache state was not available, so this is a supported explanation, not a reproduced cause.

Smallest safe proposal, not implemented: a narrowly scoped one-release stale-app-worker cleanup at the same installed worker URL, following the PWA cleanup procedure: evict only Revvin app-shell caches, activate immediately, claim and explicitly navigate old window clients after takeover. This project combines push handlers and app-shell caching in /sw.js, so do not blindly unregister that combined worker or replace it with the generic kill-switch; preserve messaging handlers and existing push subscriptions, or separate messaging only in an independently reviewed follow-up. Do not add polling/reload loops, change manifest start_url, delete arbitrary origin caches or register workers in preview. Confirm the stale browser's installed script first to keep that follow-up surgical.

## Verification and limits

- Final full Vitest: **967 passed, 3 skipped**, 73 files passed and 1 skipped. No failing tests. Includes isolated PostgreSQL tests and component regressions for missing inputs, no automatic retry, explicit retry, upgrade mapping, signup routing/held-submit ownership, edit labels, optional job value and closed-lead home state.
- Final typecheck: **bunx tsgo -b --noEmit passed**, exit 0.
- Latest automatic preview build: build OK after the test selector correction. No production build or frontend publish was run manually.
- Playwright public /signup and /pricing checks passed without page errors. Screenshot reviewed; screenshots in /tmp/browser/product-fixes.
- Real signed-in end-to-end dashboard verification could not run: self-session mint found no requester account; explicit mint for QA Test Plumbing was refused because approval was unavailable. No production signup or lead closure was performed. Component mocks and isolated SQL are not claimed as live authenticated verification.
- Deployment tool confirmed each named function and supplied source checksums; live email content/delivery was not exercised, to avoid sending/resending email.

## Every changed file

- AGENTS.md: record label-based upsell selection and selective delay-backfill reversal rules.
- roadmap.md: track and close only this walkthrough fix batch; rep work remains parked.
- drizzle/migrations/0028_fix_campaign_readiness_array_append.sql: preserve the live readiness function while correcting five array appends.
- drizzle/migrations/0029_job_ask_delay_two_hours.sql: snapshot original delays, set default 2 and backfill only values still at 24.
- drizzle/migrations/meta/0028_snapshot.json: tool-generated schema snapshot for the readiness migration.
- drizzle/migrations/meta/0029_snapshot.json: tool-generated schema snapshot for the delay migration.
- drizzle/migrations/meta/_journal.json: tool-generated records for the two applied migrations.
- src/integrations/supabase/types.ts: tool-regenerated types for the locked rollback table; not manually edited.
- src/components/dashboard/CampaignsTab.tsx: stable readiness loading, error state and explicit retry; reuse existing missing-field inputs.
- src/components/dashboard/ProUpsell.tsx: feature-label lookup instead of positional indexing.
- src/pages/Signup.tsx: route existing published owners to their dashboard while respecting submitting navigation ownership.
- src/pages/Onboarding.tsx: publication-aware edit labels and optional-mobile wording; stored values/save behavior unchanged.
- src/pages/dashboard/BusinessDashboard.tsx: optional won-job value prompt and removal of SMS UI/writes.
- src/components/dashboard/HomeView.tsx: distinguish a used inbox with no waiting leads from a never-used inbox.
- src/components/dashboard/AutoAskTab.tsx: use the Edit page menu name for the review-link hint.
- src/lib/printAssets.ts: sidewalk terminology only; print specifications unchanged.
- public/llms.txt: Cancel anytime spelling only.
- plugins/prerender.ts: Cancel anytime spelling in the two offer descriptions only.
- src/test/product-fixes-components.test.tsx: readiness retry/input, signup navigation and stable upsell regression coverage.
- src/test/product-fixes-sql.test.ts: execute exact migrations in isolated PostgreSQL and assert missing keys/default/backfill/reversal/scheduled-row preservation.
- src/test/onboarding-one-screen.test.tsx: assert published edit labels and unchanged saving.
- src/test/dashboard-auth-refresh.test.tsx: assert non-blocking won-job value Save and Skip.
- src/test/dashboard-home.test.tsx: assert the existing-leads/all-closed home state.
- docs/product-fixes-2026-11-13.md: this item-by-item changelog, exact SQL, deployment confirmations and limitations.
