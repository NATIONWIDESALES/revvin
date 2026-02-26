

# Plan: Airbnb-Style Platform Experience Overhaul

## Design Philosophy

Adopt Airbnb's core UX principles: generous whitespace, simplified navigation, image-forward cards, clean role separation (Business = Host, Referrer = Guest), and reduced information density. The homepage stays largely the same since there are no active listings yet.

## Changes

### 1. Navbar (`src/components/Navbar.tsx`) -- Simplify to Airbnb-style

Current state: 6 navigation links, country selector, multiple buttons. Feels cluttered.

Changes:
- Remove inline nav links. Replace with a minimal set: just the logo on the left, a subtle centered search link (routes to /browse), and right-side user controls
- Logged out: "List Your Business" text link + "Sign Up" / "Log In" buttons
- Logged in: avatar/initials circle with a dropdown (Dashboard, Profile, Sign Out) instead of separate buttons
- Move country selector into the browse page filters instead of the global navbar
- Mobile: hamburger with clean slide-out sheet

### 2. OfferCard (`src/components/OfferCard.tsx`) -- Airbnb listing card style

Current state: Dense card with many badges, meta rows, earnings breakdown, dual CTAs.

Changes:
- Simplify to: business logo/image at top (larger, in a rounded container), business name, offer title, location with pin icon, category badge, and payout amount at the bottom right
- Remove: OfferScoreBadge, success rate, rating stars, remote badge, deal size range, close time, payout timeline, dual CTA buttons from the card
- Single click action: entire card is a link (already is)
- Smaller, cleaner typography. More whitespace between elements
- Heart/save icon in top-right corner (visual only for now)

### 3. Browse Page (`src/pages/Browse.tsx`) -- Airbnb search experience

Current state: Heavy filter panel, dense layout, marketplace stats sidebar.

Changes:
- Replace category badges with horizontal scrollable icon pills at the top (like Airbnb's category bar with icons)
- Move advanced filters into a modal/drawer triggered by a "Filters" button, not an inline expanding panel
- Remove the bottom "Marketplace Stats" and "City Slots" section from browse -- keep it focused on results
- Remove currency toggle from browse (it's an edge feature)
- Cleaner empty state
- Keep search bar and sort options but simplify sort to a dropdown instead of multiple buttons

### 4. OfferDetail (`src/pages/OfferDetail.tsx`) -- Cleaner listing page

Current state: Many sections (stats grid, offer score, deal details, qualification rules, verification steps, business credibility). Data-heavy.

Changes:
- Remove OfferScoreBadge section entirely
- Combine stats grid into a simpler inline row (payout, location, timeline)
- Remove "Business Credibility" card (verified badge on the header is sufficient)
- Keep: header, description, deal details, qualification rules, and the referral wizard sidebar
- Cleaner section spacing, less border-heavy cards
- Add a subtle divider between sections instead of bordered cards for everything

### 5. Dashboards -- Cleaner terminology and layout

**BusinessDashboard (`src/pages/dashboard/BusinessDashboard.tsx`)**:
- Rename "Acquisition Dashboard" to just the business name as header
- Reduce stat cards from 8 to 4 key metrics (Active Offers, New Referrals, Deals Closed, Total Paid)
- Remove OfferCompetitiveness and BoostOfferPanel (premature features)
- Cleaner offer cards and referral inbox

**ReferrerDashboard (`src/pages/dashboard/ReferrerDashboard.tsx`)**:
- Rename "Earnings Dashboard" to just "Your Referrals" or user's name
- Reduce stat cards from 6 to 4 (Pending, Confirmed, Paid, Lifetime)
- Remove weekly streak banner (premature gamification)
- Keep chart, pipeline, milestones. Remove badges section for now (empty state noise)

### 6. Footer (`src/components/Footer.tsx`) -- Simplify

- Remove the CTA banner at top of footer
- Simpler 3-column layout: Platform links, Support links, Legal links
- Smaller, more understated

### 7. CSS / Design Tokens (`src/index.css`)

- No color scheme changes (keep the green primary -- it works)
- Remove the `.earnings-badge` gradient class -- replace with a simple solid rounded pill
- Soften `.card-hover` effect (less aggressive translate)

### 8. Landing Pages -- Light touch

**Index.tsx**: Keep as-is per user request (no active listings yet). One small change:
- Remove explicit "90% to referrer, 10% platform fee" from the 3-step explainer (step 03 desc) and the "Payout Economics" section -- align with the Airbnb approach of not showing fees publicly. The How It Works page can keep this info.
- Remove the "10% Platform Fee" trust badge from the trust section

**ForBusinesses.tsx / ForReferrers.tsx**: Light cleanup
- Remove explicit "90%" / "10% fee" references from copy (keep it on How It Works page only)

### File Change Summary

| File | Change |
|------|--------|
| `src/components/Navbar.tsx` | Simplify to Airbnb-style: logo, search link, profile dropdown |
| `src/components/OfferCard.tsx` | Minimal card: logo, title, business, location, payout |
| `src/pages/Browse.tsx` | Scrollable category icons, filter modal, cleaner layout |
| `src/pages/OfferDetail.tsx` | Remove score badge, credibility card; simplify stats |
| `src/pages/dashboard/BusinessDashboard.tsx` | Rename header, reduce stats to 4, remove competitiveness/boost |
| `src/pages/dashboard/ReferrerDashboard.tsx` | Rename header, reduce stats to 4, remove streak/badges |
| `src/components/Footer.tsx` | Remove CTA banner, simpler columns |
| `src/index.css` | Soften card-hover, simplify earnings-badge |
| `src/pages/Index.tsx` | Remove fee percentages from step 03 and payout economics section |
| `src/pages/ForBusinesses.tsx` | Remove explicit fee percentages from copy |
| `src/pages/ForReferrers.tsx` | Remove explicit fee percentages from copy |

