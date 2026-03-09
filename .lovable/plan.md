

## Dollar Sign Grid Effect on CTA Section

### What
Add a static grid of `$` characters to the bottom half of the final CTA section. They start fully visible at the bottom edge (appearing to come from behind the section border), become more sparse and fade out as they rise, and stop well before the "Get Started Free" button.

### How

**CSS approach in `src/index.css`** — new `.dollar-grid` utility class:
- Use a pseudo-element (`::after`) positioned absolute at the bottom of the section
- Render a CSS `background-image` using an inline SVG data URI containing a `$` character in light green (`hsl(142 64% 24% / 0.12)`)
- Grid spacing ~40px (double the dot-grid's 20px) for a sparser feel
- Apply a `mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,1) 100%)` so they fade out toward the top and are strongest at the bottom
- Height limited to ~60% of the section, `pointer-events: none`, `overflow: hidden` on the section

**In `src/pages/Index.tsx`**:
- Add `relative overflow-hidden` and the `dollar-grid` class to the CTA `<section>`

This mirrors the existing `dot-grid-fade-up` pattern (pseudo-element + mask) already in the codebase, keeping it consistent. No new components or JS needed — pure CSS.

