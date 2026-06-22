# Marketplace map pins — investigation & fix plan

## What I found

The `/marketplace` route (`src/pages/Browse.tsx`) renders `MapView` (`src/components/MapView.tsx`), fed by offers from `useDbOffers` / `mockOffers.ts` / `sampleOffers.ts`. (The other map component, `MarketplaceMap.tsx` driven by `mock_listings`, is not what's on screen here.)

### How each pin's position is determined today
- **Per-offer coordinates are hardcoded city centroids**, not geocodes of full addresses or ZIPs.
  - `mockOffers.ts` / `sampleOffers.ts` each row carries `latitude`/`longitude` that exactly match the city centroid (e.g. every "Los Angeles" offer is `34.0522, -118.2437`, every "Toronto" offer is `43.6532, -79.3832`).
  - DB offers (`useDbOffers.ts`) pull `latitude/longitude` from the joined `businesses` row — also a single per-business point, typically a city-level value.
- So at the data layer, an offer labeled "Los Angeles, CA" is in fact placed on LA's centroid. The lat/lng values themselves are correct for the city they name.

### Why pins look mis-aligned with the city label
The drift you're seeing is introduced by `MapView` itself, not the data:

1. **Clustering radius is huge.** `clusterOffers(offers, radiusDeg = 0.6)` groups any two offers whose lat AND lng differ by less than 0.6°. 0.6° ≈ 40–67 km, so cross-city merges happen constantly:
   - Dallas (32.78, −96.80) + Fort Worth (32.75, −97.33) → one cluster.
   - NYC (40.71, −74.01) + Brooklyn (40.68, −73.94) + Jersey City → one cluster.
   - LA (34.05, −118.24) + Long Beach + Anaheim/Irvine → one cluster.
   - Houston suburbs likewise.
2. **Cluster position is the running average of every member point** (lines 32–37 of `MapView.tsx`). So a cluster whose popup says "Los Angeles" is actually rendered at the *mean* of LA + Long Beach + Irvine — visibly east/south of downtown LA. Same mechanism shifts the "NYC" cluster into the harbor and "Dallas" halfway to Fort Worth.
3. **City chips use the first-seen offer's lat/lng** (`deriveCityChips`), which is the true city centroid. So the chip "Los Angeles (5)" zooms you to real LA, but the cluster pin sits at the averaged centroid → the visual mismatch you reported.
4. Single-offer pins (no cluster) *do* sit on the correct city centroid. They only look off when a popup mentions a specific neighborhood or street that the centroid obviously doesn't represent.

### Would ZIP/postal-code or full-address geocoding fix it?
- It would help, but it is **not the root cause**. Even with perfectly geocoded street addresses, the current 0.6° clustering + centroid-averaging would still drag the visible pin away from any single named city whenever two nearby offers exist.
- ZIP centroids are more precise than city centroids (~5–15 km vs. ~30–60 km), and full-address geocoding via the Google Maps connector is the most precise. But fixing the clustering bug is mandatory either way.

## Recommended fix (in priority order)

### 1. Fix the clustering math (required, small change, no data work)
In `src/components/MapView.tsx`:
- Drop `radiusDeg` from `0.6` → roughly `0.05` (≈3–5 km) so cross-city merges stop. Better: cluster in *pixel* space at the current zoom (or adopt `leaflet.markercluster`), so clusters tighten as you zoom in and disappear at city zoom levels.
- Stop averaging the centroid. Anchor the cluster icon to the **first** member's coordinates (or the member closest to the geometric median). This guarantees the pin sits on a real offer's location and not in the empty space between cities.
- Keep the popup list as-is; only the anchor point changes.

This alone removes the LA / Houston / NYC visual drift for the existing seed data.

### 2. Jitter co-located offers (cosmetic)
Many seeded offers share *identical* city-centroid coordinates (e.g. 6 Toronto offers all at 43.6532, −79.3832). After step 1 they'll stack into a single dot. Either:
- keep clustering them (cluster of N at that exact point), or
- add a tiny deterministic jitter (≤200 m) per offer so the markers fan out.

### 3. Upgrade location precision (medium effort, real-data win)
City centroids are the underlying limit. Two layered options:

- **Short term — ZIP/postal centroid lookup.** Add an optional `postal_code` field on the business/offer form. Resolve to a centroid via a static ZIP→lat/lng dataset or via the Google Maps Geocoding API through the existing Google Maps connector gateway (`maps/api/geocode/json?address=<zip>,<country>`). Persist `latitude/longitude` on the business row so the map never has to re-geocode at render time. Accuracy: ~1–5 km.
- **Best — full address geocoding.** When a business saves its address (street + city + ZIP) in `ProfileEdit` / `Onboarding`, call the same Google Maps Geocoding endpoint server-side from an edge function, write `latitude`, `longitude`, and `formatted_address` back to `businesses`. Accuracy: building-level.

Both can be backfilled for existing rows with a one-shot edge function that iterates `businesses` rows missing or coarse coordinates. Seed/demo data in `mockOffers.ts` / `sampleOffers.ts` can be hand-corrected or fed through the same geocoder.

## Suggested rollout

1. Land step 1 (clustering radius + non-averaged anchor) — fixes the visible drift immediately for both DB and demo data. ~30 lines in `MapView.tsx`.
2. Add ZIP/postal field to the business form + edge-function geocode-on-save (uses the existing Google Maps connector — no new secrets). Backfill existing businesses.
3. Optional: replace hand-rolled `clusterOffers` with `leaflet.markercluster` for proper zoom-aware behavior.

## Out of scope for this plan
- No changes to `MarketplaceMap.tsx` (that component is fine; its data already has true city centroids).
- No edits to upload/avatar flows, OfferCard, or other unrelated UI.
- I'll only investigate further until you approve a plan to implement.
