
## Plan: Add Animated Notification Cards to Hero

Create a new component and integrate it into the hero section to display two columns of animated notification cards — leads on the left (moving down), payouts on the right (moving up).

### New Component: `HeroNotificationStream.tsx`

**Data:**
- Left column (leads): "New lead — Roofing", "New lead — Solar Installation", "New lead — Mortgage", etc. (10 items)
- Right column (payouts): "$750 payout — Solar Installation", "$400 payout — Roofing", etc. (10 items)

**Card styling:**
- Width: ~200px, auto height
- White background, 1px border (#E5E7EB), 10px border-radius, subtle shadow
- 12-13px text, medium weight
- Small colored dot: blue for leads, green for payouts

**Animation approach:**
- CSS `@keyframes` with `translateY` for smooth GPU-accelerated movement
- Left column: `0% { translateY(-100%) } → 100% { translateY(100%) }` (downward)
- Right column: inverse direction (upward)
- Duration: ~20s per full loop, staggered start per card
- CSS `mask-image: linear-gradient(...)` on each column container for top/bottom fade zones (30% fade, 40% solid middle)

**Layout:**
- Absolutely positioned within the hero section
- Left column: `left: 2-5%`, right column: `right: 2-5%`
- Both columns span full hero height, `overflow: hidden`
- z-index: 0 (below hero text container which has z-10)

**Responsive:**
- Hidden below 768px (`hidden md:block`)

### Changes to `Index.tsx`

Import and add `<HeroNotificationStream />` inside the hero section, positioned before the container div so it renders behind the text.

### Files Modified
- `src/components/HeroNotificationStream.tsx` — New
- `src/pages/Index.tsx` — Add import and component (no changes to existing text/buttons/logic)
