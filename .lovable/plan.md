

# Add Dot Constellation Background to Hero

Create a new `HeroConstellation` component that renders an SVG-based dot network pattern behind the hero text.

## New File: `src/components/HeroConstellation.tsx`

A React component that:
- Generates ~20 dots with random positions, sizes (3-6px), and slight animation offsets
- Draws connecting lines between dots that are within a proximity threshold
- Dots: `#D1D5DB` at 30% opacity; lines: same color at 15% opacity, 0.75px stroke
- SVG is ~600x400px, positioned absolutely behind hero text, offset slightly right
- Each dot has a slow CSS animation (10s loop, 2-4px drift in random directions using `framer-motion` or CSS keyframes)
- `pointer-events: none`, `z-0` layering
- Hidden on mobile (`hidden md:block`) or shown at reduced opacity (`opacity-10`)

## Modified: `src/pages/Index.tsx`

- Import `HeroConstellation`
- Add `relative overflow-hidden` to the hero `<section>`
- Render `<HeroConstellation />` inside the section, before the container div
- Hero text container gets `relative z-10` to stay above
- No changes to text, buttons, spacing, or any other section

## Technical Approach

Use a seeded set of dot coordinates (not random on each render) to avoid layout shift. Define dots as a static array. Use framer-motion's `animate` with `repeat: Infinity` and `repeatType: "mirror"` for the gentle drift on each dot. Lines are static (connecting nearby dots based on initial positions).

