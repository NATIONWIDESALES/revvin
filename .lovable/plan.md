

# Full Visual Redesign — Premium, Confident, Clean

A styling-only pass across the global design system, navigation, landing page, and footer. Zero logic, routing, or data changes.

## 1. Global Design System (`index.css` + `tailwind.config.ts`)

**Typography**: Replace DM Sans / Space Grotesk with Inter (single family, cleaner). Import via Google Fonts. Remove `font-display` class usage — use Inter throughout with weight/size hierarchy instead.

**Color palette overhaul** (CSS variables):
- `--background`: pure white `#FFFFFF`
- `--foreground`: near-black `#0F172A`
- `--muted-foreground`: warm gray `#64748B`
- `--primary`: refined dark green `#15803D` (premium fintech green, not bright teal)
- `--accent`: warm amber/gold `#D97706` (not bright yellow)
- `--border`: very light `#E5E7EB`
- `--card`: white `#FFFFFF`
- `--muted`: subtle off-white `#F9FAFB`
- Dark mode: corresponding darker tones, same hue relationships

**Spacing**: Update container max-width to `1200px`. Default section padding becomes `py-20 lg:py-28` (~80-112px).

**Border radius**: Reduce `--radius` to `0.5rem` (8px) for a more refined feel. Cards get `rounded-xl` (12px), buttons `rounded-lg` (8-10px).

**Shadows**: Define utility classes for subtle shadows: `shadow-card` = `0 1px 3px rgba(0,0,0,0.04)`.

**Remove** the `hero-gradient`, `text-gradient`, `earnings-badge` utility classes. Remove `App.css` entirely (unused Vite boilerplate).

## 2. Button Component (`button.tsx`)

Restyle variants:
- `default`: `bg-[#15803D] text-white hover:bg-[#166534]`, height 44px, px-6, font-medium 14px, rounded-lg
- `outline`: white bg, `border border-[#D1D5DB]` dark text, hover light gray fill
- `ghost`/`link`: keep minimal, adjust colors to new palette
- Remove `rounded-full` from all landing page button instances — use `rounded-lg` (8-10px)

## 3. Navigation (`Navbar.tsx`)

- Background: `bg-white` with `border-b border-[#E5E7EB]`
- Height: `h-14` (56px)
- Logo: reduce to `h-8` or `h-10` — current `h-20` is oversized
- Center links: 14px, font-medium 500, `text-[#64748B]` default, `text-[#0F172A]` on hover/active
- Right side (logged out): "Log In" plain text, "Get Started" small primary green button (not pill, rounded-lg)
- Right side (logged in): keep existing avatar dropdown, just inherit new colors
- Mobile menu: inherit new colors, clean spacing

## 4. Hero Section (`Index.tsx` lines 93-141)

- Background: `bg-white` — no muted bg, no gradient
- Padding: `py-24 lg:py-32` — generous but not stretched
- Headline: 48px mobile / 56-64px desktop, font-bold 700, `text-[#0F172A]`, letter-spacing `-0.02em`. Second line "You earn for introductions." in `text-[#D97706]` (warm amber)
- Subtext: 18px, weight 400, `text-[#64748B]`, max-w-2xl, line-height 1.6. Consolidated copy: "Pay-per-close customer acquisition — powered by referrals, not ads."
- CTAs: "Create Business Offer" = primary green filled button, "Start Referring & Earning" = outlined button. Both `rounded-lg h-12 px-8 text-[15px]`. No icons.
- "See all offers →" — drop the arrow, just subtle text link in muted gray with underline on hover
- Hero visual (offer cards container): Remove the heavy `rounded-3xl border shadow-lg` wrapper. Show cards in a clean grid with no container chrome. If no featured offers, show nothing (no empty box).
- Add a trust line below CTAs: "Trusted by businesses across Canada and the US" in 13px light gray with a subtle checkmark

## 5. Stats Bar (lines 143-169)

- Remove floating card style (`-mt-8 shadow-xl rounded-2xl`)
- Integrate inline as a clean horizontal row within page flow
- Remove icons above each stat — just bold number + small label
- Numbers: 28-32px, font-bold, near-black. Labels: 12px, uppercase tracking-wider, `text-[#9CA3AF]`
- Separated by subtle vertical dividers or generous spacing
- "Live Marketplace" label: 11px uppercase, letter-spacing 0.05em, medium gray. Remove flag emojis — just "Canada + United States"

## 6. Trust Badges (lines 188-211)

- Restyle as small pill tags: 12px text, `border border-[#E5E7EB]`, no icon colors (icons in gray `#9CA3AF`), no green
- Reduce icon size to `h-3 w-3`

## 7. How It Works (lines 213-240)

- Remove icon boxes entirely. Use numbered circles: `h-10 w-10 rounded-full bg-[#15803D] text-white font-bold` with "1", "2", "3"
- Remove the floating "Step 01" pill badges
- Card style: white bg, subtle border `border-[#E5E7EB]`, `rounded-xl p-8`. No heavy hover transforms — just subtle shadow on hover (`hover:shadow-md`)
- Section header: "How It Works" as 11px uppercase label, "Three Steps. Real Outcomes." as 36-40px heading

## 8. Real-World Scenarios (lines 242-273)

- Remove the colored avatar circles (RE, HV, etc.)
- Each card: small role label at top ("Referrer Scenario" in 11px uppercase muted), persona name in bold 16px, quote in regular weight slightly different style (not italic), highlight in a small colored tag
- Remove the `Quote` icon overlay
- Two-column grid, cleaner cards with white bg, subtle border, generous padding

## 9. Featured Cities (lines 275-321)

- Remove flag emojis. Use "Canada" and "United States" as clean uppercase labels
- City cards: smaller, cleaner — just city name + count, white bg, subtle border, `rounded-lg p-3`
- De-emphasize cities with 0 offers (lighter text, no hover effect)

## 10. Revvin vs Ads Comparison (lines 323-396)

- Traditional Ads column: neutral gray treatment, no destructive red
- Revvin column: subtle green left border or top accent, not full border-2
- "Recommended" badge: small refined pill, 11px
- Row items: clean, no colored icon backgrounds — just icon + text

## 11. Choose Your Path (lines 398-452)

- Two cards, white bg, subtle border
- Remove heavy icon boxes. Use a simple icon (20px, gray) or skip icons
- Bullet checkmarks: small, monochrome (gray or muted green), not bright colored
- Primary CTA (Business): green filled button. Secondary CTA (Referrer): outlined button
- Remove `border-2` hover effects — use subtle `hover:shadow-md`

## 12. Trust & Protection (lines 487-521)

- 3x2 grid on desktop (currently 6-col which is too cramped)
- Remove icon circle backgrounds — icon directly in gray, 20px
- Cards: white bg, subtle border, `rounded-xl p-6`
- Or: skip cards, use a simple list layout with icon + title + description inline

## 13. Final CTA (lines 523-543)

- Light off-white background (`bg-[#F9FAFB]`)
- Clean centered text, two buttons below
- Buttons match hero style: green primary, outlined secondary, `rounded-lg`

## 14. Footer (`Footer.tsx`)

- 13-14px text, `text-[#9CA3AF]` for links
- Logo smaller (`h-8`)
- Clean four-column layout, generous spacing
- Bottom copyright: `text-[#D1D5DB]`, very subtle

## 15. OfferCard (`OfferCard.tsx`)

- `rounded-xl` instead of `rounded-2xl`
- Subtle border `border-[#E5E7EB]`, hover shadow `hover:shadow-md`
- Heart button: slightly more refined
- No other logic changes

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Update Google Fonts import to Inter |
| `src/index.css` | New color palette, typography, remove unused utilities |
| `tailwind.config.ts` | Update font family, container width, radius, colors |
| `src/App.css` | Delete (unused Vite boilerplate) |
| `src/components/ui/button.tsx` | Restyle variants to new palette |
| `src/components/Navbar.tsx` | Restyle: smaller logo, refined colors, height 56px |
| `src/pages/Index.tsx` | Full landing page restyling per section guidance above |
| `src/components/Footer.tsx` | Restyle: smaller text, refined colors, smaller logo |
| `src/components/OfferCard.tsx` | Subtle border/radius/shadow refinements |

## Constraints Respected

- Zero changes to routing, auth, Stripe, database, dashboards, or any component logic
- All existing content, copy, links, and button destinations preserved
- Shared components (Button, Card, etc.) restyled in ways that improve authenticated pages too
- No new dependencies needed (Inter is a Google Font, loaded via CSS)

