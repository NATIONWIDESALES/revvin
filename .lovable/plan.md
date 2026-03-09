

# Fix Phone Proportions

## Changes to `src/components/PhoneNotification.tsx`

### Aspect ratio & dimensions
- Set explicit width `w-[280px]` and height `h-[605px]` on the outer shell (280 × 2.16 ≈ 605) to enforce the correct iPhone 14/15 Pro ratio
- Reduce `max-w` on the wrapper to `280px`

### Border radius
- Outer shell: `rounded-[3rem]` → `rounded-[44px]`
- Screen area: `rounded-[2.7rem]` → `rounded-[40px]`
- Gloss highlight: update to match `rounded-l-[44px]`

### Dynamic Island
- Shrink from `w-[90px] h-[22px]` → `w-[98px] h-[18px]` (98px ≈ 35% of 280px, shorter vertically)

### Content clipping fix
- Make the screen content area scrollable: add `overflow-y-auto` on the content div
- Remove `min-h-[300px]`, let it fill remaining space with `flex-1`
- Wrap screen area in `flex flex-col` so status bar stays fixed and content scrolls
- Reduce bottom padding from `pb-8` → `pb-6`

### Keep
- Shadow, tilt angles, side buttons, specular highlight — all unchanged (just radius tweak on gloss)

