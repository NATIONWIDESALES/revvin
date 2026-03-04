

## Plan: Design Polish Pass

This is a visual-only pass — no logic, routing, auth, Stripe, or database changes. Prioritized in the order requested.

### Batch 1: Global Card / Typography / Button Polish

**Files: `src/index.css`, `tailwind.config.ts`, `src/components/ui/button.tsx`**

- **Typography**: Add utility classes for section labels (`text-[11px] font-medium tracking-[0.08em] text-[#9CA3AF]`), tighten heading `letter-spacing` to `-0.02em`/`-0.03em`, standardize body text to `text-base leading-relaxed text-[#4B5563]`. Reduce label-to-heading gap to `mb-2` (8px).
- **Buttons**: Update `buttonVariants` — primary gets `rounded-[10px]`, consistent `h-12 px-7 text-[15px] font-medium`. Secondary outline: `border-[#D1D5DB] text-[#374151] hover:bg-[#F9FAFB]`. Nav "Get Started" stays `sm` size but with `px-5 text-sm`.
- **Cards**: Apply globally across all pages — white bg, `border border-[#E5E7EB] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]`, hover: `hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200`. Padding `p-7`. Left-align content (remove `text-center` from card interiors).
- **Icon treatments**: Replace solid green circle icons with subtle square treatment: `rounded-lg bg-[#F0FDF4]` with `text-[#15803D]` icon, or plain gray icons at 20px.

**Applied across**: `Index.tsx`, `HowItWorks.tsx`, `ForBusinesses.tsx`, `ForReferrers.tsx`, `OfferCard.tsx`, `CitySlots.tsx`

### Batch 2: Section Backgrounds & Transitions

**Files: `src/pages/Index.tsx`, `src/pages/HowItWorks.tsx`, `src/pages/ForBusinesses.tsx`, `src/pages/ForReferrers.tsx`**

- Remove all `border-y border-border` and `border-t border-border` dividers between sections.
- Alternate section backgrounds: odd sections `bg-white`, even sections `bg-[#F9FAFB]`. Remove `bg-muted`, `bg-muted/30` patterns.
- Framer Motion `whileInView` already exists on most sections — ensure `viewport={{ once: true }}` and stagger timing of `80ms` is consistent. No additional IntersectionObserver needed since framer-motion handles it.

### Batch 3: Browse Offers Card Redesign

**File: `src/components/OfferCard.tsx`, `src/pages/Browse.tsx`**

- **Initial circles**: Replace the building emoji fallback with a colored circle showing the first letter of the business name. Color palette: `['#6366F1','#0D9488','#D97706','#E11D48','#15803D','#7C3AED']`, assigned by hash of business name. Circle 64px, letter 28px bold white.
- **Top accent**: Add a 3px colored top border on each card matching the business's assigned color.
- **Category filter bar**: Replace icon+text buttons with text-only pill filters. Active: `bg-primary text-white`. Inactive: `bg-[#F3F4F6] text-[#374151]`.
- **Search bar**: Height 48px, `rounded-xl`, inner shadow `shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]`, placeholder `text-[#9CA3AF]`.
- **Heart animation**: Add `transition-all duration-200` on the heart fill.
- **Business CTA banner**: Add green left border accent `border-l-4 border-l-primary`.

### Batch 4: Dark Hero Replacements

**Files: `src/pages/HowItWorks.tsx`, `src/pages/ForBusinesses.tsx`, `src/pages/ForReferrers.tsx`**

- Replace `hero-gradient` (dark green) sections with white/off-white background, dark text.
- Keep same heading/subtitle structure but use `text-foreground` for headings, `text-muted-foreground` for subtitles.
- Badge pills become subtle bordered pills instead of green-on-dark.

### Batch 5: FAQ Accordion (Landing Page)

**File: `src/pages/Index.tsx`**

- Add new section between Trust & Protection and Final CTA.
- Section label "COMMON QUESTIONS", heading "Got questions?"
- Use existing `Accordion` component from `src/components/ui/accordion.tsx`.
- 6 Q&A items as specified. Single-item-open mode (`type="single" collapsible`).
- Plus icon rotating to × on open (replace default chevron).

### Batch 6: Interaction Details

**Landing page (`Index.tsx`):**
- **Hero**: Add faint radial gradient `radial-gradient(circle at 50% 30%, rgba(21,128,61,0.03), transparent 70%)`.
- **Comparison section**: Add CSS `@keyframes shimmer-border` animation on Revvin card's green border. Smaller "Recommended" badge (10px font, more refined pill).
- **Scenario cards**: Clamp quote text to 2 lines with "Read more" expand toggle. Highlight text becomes `text-[13px] font-semibold text-[#15803D]` instead of pill.
- **Choose Your Path**: Business card hover border shifts to green. Full-width CTAs (already done).
- **Trust section**: Remove trust badge pills row. Make trust cards more compact (`p-5`).
- **Final CTA**: Subtle `bg-[#F9FAFB]` background. Add "Free to list. No credit card required to browse." below buttons.

**How It Works (`HowItWorks.tsx`):**
- Step cards as expandable accordion instead of static cards.
- Platform Economics: lighter number weights, more whitespace.

**For Businesses (`ForBusinesses.tsx`):**
- "What You Get" grid → single column list with icon-left, text-right.
- CitySlots progress bars: animate fill on scroll (CSS transition triggered by framer-motion).
- "Apply for Verified Placement" CTA made more prominent (full-width, primary variant).

**Navbar (`Navbar.tsx`):**
- Already has `backdrop-blur-md` and `bg-background/80` — adjust to `rgba(255,255,255,0.85)` and `backdrop-blur-[12px]`. Already close, minor tweak.

### File count

~10 files modified. No new pages, routes, or components except possibly a small `ScenarioCard` sub-component for the expand/collapse behavior.

### What stays untouched
- All dashboard pages, auth, Stripe, database queries, edge functions, routing, `supabase/` directory
- No text content changes except the new FAQ section content
- `OfferCard` link behavior, data flow, and state management unchanged

