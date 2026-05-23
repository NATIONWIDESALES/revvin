# Sprint 1 — Marketplace Transformation Plan

This is a large, multi-file visual/structural sprint. I'll execute it in 5 phases. No Stripe, Tremendous, OAuth, auth, or RLS changes. All mock data flagged `is_mock: true` so it can be wiped in one operation later.

---

## Phase 0 — Audit & inventory (no code)

Before writing components, I'll list reusable existing primitives so we don't duplicate:

- **Cards / shells:** `components/ui/card.tsx`, `OfferCard.tsx` (adapt → `MarketplaceListingCard`)
- **Buttons / forms:** `ui/button.tsx`, `ui/input.tsx`, `ui/select.tsx`, `ui/textarea.tsx`, `ui/form.tsx`, `ui/dialog.tsx` (reuse for contact + callback modals)
- **Layout chrome:** `Navbar.tsx`, `Footer.tsx`, `Layout.tsx`, `SEOHead.tsx` (keep; adjust nav CTA + footer copy)
- **Map:** `MapView.tsx` (reuse for `/browse` map toggle; do not add new map deps or prompt for tokens)
- **Misc:** `ShareOfferLink.tsx`, `OfferQRCode.tsx` (reuse on referral preview page)

New components live under `src/components/marketplace/` with the `Marketplace*` / `BusinessProfile*` prefix so they're easy to grep and remove.

---

## Phase 1 — Data layer (mock listings)

**New migration** — two small tables, both with `is_mock` flag so they're trivially deletable:

```sql
create table public.mock_listings (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  category text not null,
  city text not null,
  region text not null,         -- state/province
  country text not null,        -- US / CA
  lat double precision,
  lng double precision,
  hero_image text not null,
  gallery jsonb not null default '[]',
  services jsonb not null default '[]',
  price_min numeric, price_max numeric,
  currency text not null default 'USD',
  about text,
  rating numeric not null default 4.8,
  review_count int not null default 0,
  reviews jsonb not null default '[]',  -- [{name, rating, date, body}]
  referral_fee numeric not null,
  referral_fee_unit text not null,      -- e.g. "per closed roof replacement"
  verified boolean not null default true,
  phone text, email text, website text,
  hours jsonb,
  is_mock boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.mock_inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_slug text not null,
  kind text not null,           -- 'contact' | 'quote' | 'referral'
  name text, email text, phone text, message text,
  is_mock boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.callback_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null, business_name text, email text not null,
  phone text, city text, help_with text,
  is_mock boolean not null default true,
  created_at timestamptz not null default now()
);
```

RLS: `mock_listings` → public read. `mock_inquiries` + `callback_requests` → public insert only (no read from anon). No changes to existing tables/policies.

Then a `supabase--insert` call to seed the 5 listings (Summit Ridge Roofing, Brightline Solar, Oak & Iron Kitchen Co., North Shore HVAC, Sundial Landscape Design) with full review arrays, galleries, services, lat/lng, etc. — exactly as specified.

---

## Phase 2 — Homepage transformation (`src/pages/Index.tsx`)

Full rewrite of `Index.tsx` content (keep file; preserve route). New structure:

1. **Full-bleed hero** — Unsplash residential porch/family-home photo at `?w=2400&q=80`, dark overlay, single tagline "Find local businesses. Hire with confidence."
2. **Search bar overlay** — location input + category select + Search button + secondary "Search on map" link.
3. **Single business band** — cream/pale-green strip, one line: "Own a business? Get found. Get referrals. Get customers. — $49/mo." + green "List your business" button.
4. **Featured businesses** — horizontal scroll of 5 `MarketplaceListingCard`s, "View all" → `/browse`.
5. **Browse by category** — 5 tiles → `/browse?category=…`.
6. **Browse by city** — 5 tiles → `/browse?city=…`.
7. **Footer pitch band** — 3 columns (Get discovered / Build your referral program / Manage your leads) + "Get started — $49/mo" CTA.

Strip from homepage: any "how it works" steps, fake stats, founder note, comparison-to-ads, marketing testimonial sections currently rendered there.

**Navbar:** keep, but ensure CTA reads "List your business" (already memory-enforced) and links to `/for-businesses`.

---

## Phase 3 — Marketplace pages

### `src/pages/Browse.tsx` (rewrite)
- Sticky filter bar: location text, category select, price range, min rating.
- View toggle Grid ⇄ Map (default Grid).
- Grid: 3-col responsive of `MarketplaceListingCard`.
- Map: reuses existing `MapView` with markers pulled from `mock_listings`, click → mini card popover.
- Reads from `mock_listings` (no auth required — already RLS public).

### `src/pages/BusinessProfile.tsx` (new, route `/business/:slug`)
- Hero image + name + location + rating + Verified badge.
- Primary CTA "Contact this business" → `ContactBusinessDialog` (writes to `mock_inquiries`, shows "We'll be in touch" toast).
- Secondary CTA "View their referral program" → links to `/refer/:slug`.
- Sections in order: About, Services, Gallery, Reviews, Pricing, Service Area (small Leaflet/Map snippet centered on lat/lng), Referral Program Preview ("This business pays $X per closed …" + "Refer someone you know" button → mock referral form).
- Sticky right sidebar: contact card (phone/email/website) + Hours widget + "Request a quote" form (also writes to `mock_inquiries`, kind `quote`).

### `src/pages/ReferralPreview.tsx` (new, route `/refer/:slug`)
- Branded mock referral page per listing: business logo/name color accent, prominent referral fee, "How it works" 3 steps for the referrer, referral submission form (writes to `mock_inquiries` kind `referral`), reuses `OfferQRCode` for a sample QR.
- Clearly tagged as "Sample referral page".

### Routes
Add `/business/:slug` and `/refer/:slug` to `src/App.tsx`. Keep all existing routes.

---

## Phase 4 — Marketing page rewrites

### `src/pages/ForBusinesses.tsx`
- Hero: "Get found. Get referrals. Get customers." + $49/mo CTA + "Request a callback" secondary.
- 3 expanded value props (marketplace / referral system w/ QR for in-shop + outbound to existing customers / lead management).
- Single pricing card: $49/mo, no tiers. Optional $199 one-time setup add-on described below.
- "Need help getting started?" → `CallbackRequestDialog` (writes to `callback_requests`, success toast "we'll be in touch within 1 business day").
- Strip any pay-per-close / Starter / Enterprise / free-tier language.

### `src/pages/HowItWorks.tsx`
- Two columns: For customers (search, browse verified listings, contact directly) / For businesses (list $49/mo, set up referral program, manage leads).
- Strip pay-per-close, dispute resolution, Net-X payout timelines, first-in-wins references.

### `src/pages/TrustCenter.tsx`
- Remove pay-per-close / payout-timeline / dispute content.
- Keep verified-business badge explanation.
- Add "What businesses on Revvin commit to" charter + "How we vet businesses" (light verification).

### `src/pages/Pricing.tsx`
- Single $49/mo card with the bullet list spec'd. Below: $199 one-time setup add-on. Below that: small "Need help reaching your existing customers?" → callback form link on `/for-businesses`.

---

## Phase 5 — QA & guards

- Run `bunx vitest run src/test/content-guards.test.ts` and fix any newly-introduced forbidden strings ("Starter", "Enterprise", "wallet", "platform fee", pay-per-close phrasings, etc.). Add any new patterns the sprint surfaces.
- Manual sweep with browser tool: homepage hero renders, `/browse` grid + map toggle works, one business profile loads end-to-end, callback + contact + referral mock forms persist and show success toasts.
- Confirm no edits to Stripe/Tremendous/auth/edge functions/RLS on existing tables.

---

## Out of scope (flagged, not built)

Stripe checkout, signup wizard, real lead inbox CRM wiring, real referral engine, Tremendous payouts, real transactional emails, OAuth, existing RLS. All untouched.

---

## Technical notes

- New components under `src/components/marketplace/` (`MarketplaceListingCard`, `MarketplaceSearchBar`, `BusinessProfileHero`, `ContactBusinessDialog`, `CallbackRequestDialog`, `ReviewList`, `ServiceAreaMap`).
- Mock listing fetch via a tiny `src/hooks/useMockListings.ts` wrapping `supabase.from('mock_listings')`.
- Unsplash URLs hard-coded in seed (chosen per category — residential roofing, Florida solar, Brooklyn kitchen, Vancouver heat pump, Toronto patio at dusk).
- All colors continue to use existing semantic tokens (`--primary` green stays accent; cream/off-white tones already in `index.css` as `surface-warm`/`bg-card`).
- Total file count est.: 1 migration + 1 seed insert + ~8 new components + 6 page rewrites + 1 router edit + content-guard touch-ups.

Ready to execute on approval.
