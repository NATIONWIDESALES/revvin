# Analytics privacy correction — source candidate only

Prepared 8 September 2026. Nothing in this patch publishes the app, deploys a backend, changes live provider settings, or deletes existing analytics records.

## What changes

- `analyticsPrivacy.ts` defines approved public routes, production hosts, safe first-party referrers, event/metadata rules and audience eligibility. Receipt, feedback, account, auth, invite-token, unknown and token-bearing URLs are excluded. Local/preview traffic, unresolved sessions and all signed-in visitors are excluded, including authenticated founder/admin use.
- `Analytics.tsx` records public first-party pageviews after session eligibility is known. Re-renders and campaign-query-only changes do not double-count a path.
- `track.ts` applies the same guard before attribution capture or persistence. It aggregates public business/offer identifiers, drops arbitrary metadata, revalidates stored campaign attribution and records only a safe referrer. External referrers retain their origin; same-site referrers retain only an approved public path or origin. Query strings and fragments are never included in path/referrer fields.
- Public demo start/completion events remain available, labeled `traffic: demo` and `is_demo: true`, including the homepage's embedded demo. Synthetic referral or signup results are not recorded from the demo. Real public referral-form submissions remain a separate event class.
- Both browser provider script injections and calls to existing `plausible`/`fbq` globals are paused in this source candidate. First-party public marketing measurement remains.

## Deliberate measurement tradeoff

The patch pauses browser Meta/Plausible measurement. Paid ad optimization and provider dashboards will therefore lose those browser events if this candidate is published. The existing public pixel ID/configuration remains untouched. This is a reviewable code change, not a production provider toggle.

Auth/account routes no longer emit browser signup, onboarding, publication or checkout milestones. The reports must not invent zeros or success rates for unavailable stages. Restoring those measurements requires explicit minimal event contracts that do not expose private routes/tokens, preferably validated server events. Existing verified paid-business records remain distinct from these browser events.

An anonymous founder testing the public site cannot be identified automatically. Known signed-in users and nonproduction hosts are excluded; anonymous internal traffic still needs an explicit operational exclusion if it materially affects a traffic test. The patch introduces no consent prompt or claim of regulatory compliance.

## Why a script-tag removal is insufficient

Once loaded into a browser document, an SDK may retain listeners and running code after its script element is removed. React route guards on our own calls do not prove that an existing SDK stops observing subsequent private SPA URLs. This patch therefore stops injecting provider scripts into new documents, rather than pretending to unload already-executing code.

Already-open documents running the old build remain outside this patch's guarantee. Test a fresh document after publication. A hot update that leaves an old provider SDK resident is not a valid privacy verification.

Plausible's official documentation states its normal tracker automatically records initial and History API pageviews and supports manually controlled capture plus request transformation. Those features could support a future reviewed integration, but the current legacy script's initialization was not silently replaced with an unverified snippet. See [Plausible tracking options](https://plausible.io/docs/script-extensions), [sensitive URL redaction](https://plausible.io/docs/custom-locations), and [event/referrer payload documentation](https://plausible.io/docs/events-api).

## Provider reenable release gate

Before reenabling a browser provider:

1. Choose a reviewed provider integration with explicit manual event control and URL/referrer filtering, or a separate public marketing document that never shares an SDK-loaded SPA document with private routes.
2. Verify the current official initialization contract, configured provider snippet and all automatic pageview/form/history features. Do not assume disabling our own PageView calls disables the SDK's behavior.
3. In fresh browser documents with network recording, exercise public landing → private receipt, auth callback/reset, dashboard and token-bearing URLs, plus direct private entry, public demo and staging. Confirm no private path, identifier, token, query, referrer, form value or synthetic commercial result reaches any analytics request.
4. Verify legitimate public events appear once, demo events stay labeled, and provider conversion measurement has a supported source. Update the release note with the actual evidence and remaining limits before publication.

## Validation and limits

The isolated privacy harness passed **24 tests**: route/token/environment exclusions, safe referrers and attribution, actual React analytics components through public/private/token/demo route changes, and the **real `track()` function** writing only sanitized fixture payloads. The real tracker tests verify private URLs are rejected before capture/write and that even preexisting provider globals receive no calls. Persistence/attribution are mocked; network calls are blocked. No live analytics event was sent.

Results are in `Research/analytics-privacy-regression/results.json` outside this candidate. Run instructions are in that directory's README. These are source/jsdom checks, not actual deployed provider-network evidence, server authorization, consent verification, responsive layout or data-retention remediation. Historical analytics containing private values are unchanged and require a separate scoped retention review if removal is needed.
