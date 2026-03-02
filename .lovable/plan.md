

# Redesign: Airbnb-Inspired Layout with Revvin Colors

## Navigation (Navbar.tsx)

**Layout restructure** — keep Revvin brand colors throughout:
- **Left**: Revvin logo (unchanged)
- **Center**: Clean text links — "How It Works", "List Your Business", "Browse Offers" — plain `text-muted-foreground` with hover to `text-foreground`
- **Right (logged out)**: "Log In" as plain text link, "Sign Up" as `rounded-full` pill button in existing `bg-accent text-accent-foreground`
- **Right (logged in)**: Keep existing notification bell + avatar dropdown
- **Remove**: The large centered search pill (`min-w-[400px]`)
- **Styling**: `bg-white` background, subtle `border-b border-border`, no `backdrop-blur`
- **Mobile**: Keep existing mobile menu, just remove search link from it

## Hero Section (Index.tsx)

**Remove**:
- Dark announcement banner (lines 94-98) — fold its messaging into hero subtext
- `hero-gradient` dark background + `heroBg` image overlay (lines 101-106)
- "The referral acquisition marketplace" pill badge (lines 109-114)

**Replace with**:
- Light warm background: `bg-[hsl(var(--muted))]` or similar off-white from existing palette
- Generous vertical padding (`py-32 lg:py-44`)
- Headline in `text-foreground` (dark), accent line "You earn for introductions." stays `text-accent` (existing gold/yellow)
- Subtext updated to include banner messaging: "Pay-per-close customer acquisition — powered by referrals, not ads. Businesses publish referral payouts. Referrers submit real opportunities. Revvin verifies outcomes and coordinates payouts." in `text-muted-foreground`
- **CTA buttons**: Remove icons, make `rounded-full` pills with generous padding
  - Primary: `bg-accent text-accent-foreground` (existing gold/yellow), filled
  - Secondary: `border border-border text-foreground` ghost/outlined pill
- "See all offers →" stays as subtle muted underlined link
- **Hero visual**: Add a large rounded container (`rounded-3xl`) below CTAs showing a grid of 3 sample offer cards (reuse `OfferCard` or styled placeholder cards) to give an aspirational product preview

## CSS Adjustments (index.css)

- No color changes — keep all existing Revvin variables
- No new color tokens needed since we're reusing existing accent/primary

## Files Changed

| File | Change |
|------|--------|
| `src/components/Navbar.tsx` | Remove search pill, add centered text links, restyle auth buttons as pills |
| `src/pages/Index.tsx` | Light hero bg, remove banner/badge, pill buttons without icons, add hero visual container |

