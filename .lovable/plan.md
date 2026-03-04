

## Plan: Replace HeroConstellation with ConstellationBackground

### What changes

1. **Create `src/components/ConstellationBackground.tsx`** — new canvas component with:
   - Sparse nodes (~1 per 18,000px², max 80), slow drift (±0.15 px/frame), edge wrapping
   - Node-to-node connections within 140px at max 0.08 alpha
   - Mouse-interactive connections within 180px at max 0.12 alpha
   - Warm gold/amber color `rgba(200, 180, 100, alpha)` for all dots and lines
   - Subtle pulse animation (sine wave on opacity/size) + soft outer glow per node
   - Canvas element at 0.6 opacity, retina-aware, `pointer-events-auto` for mouse tracking
   - Clean requestAnimationFrame loop with proper cleanup

2. **Update `src/pages/Index.tsx`** (hero section only):
   - Replace `HeroConstellation` import with `ConstellationBackground`
   - Swap `<HeroConstellation />` for `<ConstellationBackground />`
   - The hero section already has `relative overflow-hidden` and content already has `relative z-10`, so just ensure the canvas sits at z-0

3. **Delete `src/components/HeroConstellation.tsx`** — replaced by the new component

### Key differences from current HeroConstellation
- Mouse interactivity (current has none)
- Warm gold color instead of `hsl(var(--primary))` (green)
- Edge wrapping instead of bouncing
- Outer glow on nodes
- Canvas-level 0.6 opacity
- Sparser, slower, more deliberate feel

