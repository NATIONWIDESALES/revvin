## Goal
1. Display every payout as a plain US-dollar amount (`$1,000`) — no `CAD`/`USD` codes, no `CA$` prefix anywhere on the marketplace.
2. Stop Featured Offers (e.g. BrightPath Solar) from also appearing in the main offer grid on `/browse`.

## Changes

### 1. Display: strip currency codes/prefixes everywhere

**`src/contexts/CountryContext.tsx`**
- `currencySymbol()` → always return `"$"` (drop the `CA$` branch).
- `formatPayout(amount)` → return `` `$${amount.toLocaleString()}` `` (currency arg kept for signature compatibility but ignored).

**`src/components/MapView.tsx`**
- Remove the `<span>${offer.currency}</span>` suffix in the popup HTML (line ~183) so map pins/popups show only `$xxx`.

**`src/pages/OfferDetail.tsx`**
- Deal-size line (~line 243): replace `{offer.currency === "CAD" ? "CA" : ""}${...} – ${...} {offer.currency}` with plain `${min} – ${max}`.
- JSON-LD `priceCurrency` (~line 158): hard-code `"USD"` (since all amounts are USD now).

No change needed in `OfferCard.tsx` — it already uses `formatPayout`.

### 2. Data: normalize sample offers to USD/US

**`src/data/sampleOffers.ts`** — for every entry currently marked `currency: "CAD"` / `country: "CA"`, rewrite to a US equivalent so the dataset is internally consistent. Proposed swaps (keeps category mix and roughly equivalent payouts):

| Old (CA) | New (US) |
|---|---|
| Peak Roofing Solutions — Vancouver, BC | Peak Roofing Solutions — Seattle, WA |
| Summit Roofing Co. — Toronto, ON | Summit Roofing Co. — Chicago, IL |
| Northern Sun Energy — Calgary, AB | Sunrise Solar Co. — Denver, CO |
| Westside Realty Group — Vancouver, BC | Westside Realty Group — San Diego, CA |
| Maple Leaf Properties — Toronto, ON | Liberty Properties — Boston, MA |
| TrueNorth Mortgage — Toronto, ON | Heartland Mortgage — Chicago, IL |
| AirFlow Comfort Systems — Toronto, ON | AirFlow Comfort Systems — Atlanta, GA |
| PipePro Plumbing — Vancouver, BC | PipePro Plumbing — Portland, OR |
| CleanSlate Landscaping — Surrey, BC | CleanSlate Landscaping — Raleigh, NC |
| IronWorks Gym — Maple Ridge, BC | IronWorks Gym — Nashville, TN |
| NorthStar Home Inspections — Vancouver, BC | NorthStar Home Inspections — Portland, OR |

For each: set `currency: "USD"`, `country: "US"`, update `location`, `state`, `city`, `serviceRadius`, and `latitude`/`longitude` to that city's center. Descriptions updated minimally to drop CA-specific references (e.g. "BBB A+", "GAF Master Elite" kept; "WorkSafeBC", "CAHPI", "Canada-wide", "Alberta", "Greater Vancouver" replaced with US equivalents).

Existing US entries (BrightPath Solar, Pacific Coast Lending, Desert Breeze HVAC, Clearwater Plumbing, TrueGuard Insurance, Hargrove & Associates, CoreFit Studios, ProShield Pest, SmoothRoad Paving) are left as-is.

### 3. De-duplicate Featured Offers from the main grid

**`src/pages/Browse.tsx`**
- Compute `featuredIds = new Set(featuredOffers.map(o => o.id))`.
- When the Featured row is rendered (same condition as today: `featuredOffers.length > 0 && !search && activeCategory === "All"`), exclude those IDs from the main grid `filtered` list before rendering.
- Implementation: derive `gridOffers = showFeaturedRow ? filtered.filter(o => !featuredIds.has(o.id)) : filtered`. Update the count label and map view to use `gridOffers`. Featured row keeps showing the top 4.

This ensures BrightPath Solar (and any other top-4) renders once.

## Out of scope
- No DB / type changes — `Currency` type and `offer.currency` field stay (still written by real DB offers), they're just no longer rendered.
- No edits to real DB offers.

Awaiting approval before editing.