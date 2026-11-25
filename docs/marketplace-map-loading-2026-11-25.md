# Marketplace map loading fix

## Changelog
- `src/lib/marketplaceView.ts`: shared 512px Web Mercator viewport maths, URL/time-zone opening bounds, bounded existing continental default for unknown time zones, and a five-percent viewport-edge comparison.
- `src/pages/Marketplace.tsx`: measure the actual map area after desktop/phone layout settles; search immediately without MapLibre; retain the latest local bounds on failure; show full-width results, nearest-city failure message, and map remount button. Small initial map-bound differences do not start a second search. Known-city searches also update the shared viewport before the map is ready. Find, pagination, Earn, quotes and reward-alert entry points use this viewport.
- `src/components/marketplace/DirectoryMap.tsx`: readiness on the first style.load, idle or load event, guarded once-only source/layer setup, ten-second timeout, and resource-error tolerance while readiness is pending.
- `src/test/marketplace-view.test.ts`: four geometry/default/tolerance regressions, including Vancouver zoom 9 at 900x700 with a 1.236-degree longitude span.
- `roadmap.md`: mark this request's checks complete. Existing unrelated tasks left unchanged.

No database, Stripe, billing, auth, RLS, claim-flow, removal-flow or referral-page changes. No directory rows or settled records changed. No publication.

## Rule and related-path audit
Rule: local results and local actions must use the visitor's chosen area even while the map is loading or unavailable.

Code read for this request:
- Marketplace Find initial search, filters, pagination, URL/session handoff and city relocation: fixed map-readiness gating and failure-to-null bounds. All now use the seeded/shared viewport.
- Marketplace Earn initial search and pagination: same bounds and explicit centre, including before readiness and after failure.
- Marketplace clusters and reward-dot query: already use viewport bounds rather than tile readiness; retained.
- Earn empty-state nearest-five rewards: deliberately searches beyond the viewport by distance from the shared rounded centre. This is the explicitly labelled nearest-business section, not an area count. Reward-alert submission uses that same rounded centre.
- Get quotes: nearest-city lookup and match preview derive from the passed centre, independent of the map. Marketplace now passes the shared centre. No form or submission changes.
- Claimed and unclaimed business profiles: profile data loads independently; their small point maps receive stored listing/business coordinates. Unclaimed Get quotes and both nearby strips use those coordinates, not map events. Their behavior is unchanged.
- Profile breadcrumb: restores the stored marketplace URL, which now includes the seeded viewport before map readiness.
- Older Leaflet MarketplaceMap: receives listings directly and positions markers independently of tile loading. No search/failure-to-unbounded path; unchanged.
- Database functions read: fn_directory_map_search, fn_directory_clusters, fn_directory_earn_search, fn_directory_nearest_city, fn_marketplace_reward_alert and fn_directory_nearby accept bounds/centre rather than map events. The map-search functions intentionally allow unbounded calls; the bug was Marketplace dropping its bounds, corrected only in the frontend.
- Quote matching, no-match contacts and demand-count functions use request coordinates; saved-delivery trigger/admin fallback use stored request and business coordinates. These paths do not depend on map load and were left unchanged.

No additional affected failure-to-unbounded path was identified in the code read above.

## Verified
- 45 tests passed across six targeted files: viewport, marketplace layout, directory, Earn metros, Earn SQL and quote SQL. SQL tests ran against isolated test storage, not the live database.
- Preview build OK; no browser page errors in tested flows.
- Actual Vancouver search with all tiles.openfreemap.org requests blocked:
  - Desktop 1440x900: results visible in 1.756 seconds, 287 businesses.
  - Phone 390x844: count available in 1.796 seconds, 119 businesses; opening List displays loaded cards.
  - Both used finite local bounds, exactly one initial Find request, and retained those counts after timeout and retry. Screenshots checked for full-width fallback and nearest-city message.
- Both widths: Get quotes opened from the failed-map state and prefilled Vancouver. No quote submitted.
- Both widths: Earn initial search carried local bounds and the exact Vancouver centre. Reward-alert submit was intercepted before storage/email delivery and asserted centre 49.28,-123.12. No live alert record or email created.
- Desktop: style document allowed but subsequent map requests delayed beyond ten seconds. Pins rendered, map remained mounted, and no duplicate initial Find request occurred. Zoom in while requests were delayed emitted a second narrower bounded search and retained 40 pins.

## Not verified
- Published-site behavior after release: this change remains unpublished.
- Real reward-alert persistence or email delivery, real quote submissions or delivery: intentionally not exercised.
- Every possible network failure, timezone, viewport resize, geographic edge case or device. Phone tile blocking was tested, but delayed-tile map movement was tested only on desktop.
- Full application suite was not run; the six related suites above passed.

All browser data counts above came from real read-only searches and are observations, not fixed UI numbers.