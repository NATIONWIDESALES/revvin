
## Plan: Refine Hero Notification Stream

We will update the `HeroNotificationStream` to solve the spacing, bounds, and animation issues requested:

1. **Perfect Even Spacing & Seamless Loop**
   - **Current Issue**: Individual cards have `animationDelay` but exist inside a normal flex column, causing them to physically overlap each other as they translate independently.
   - **Solution**: Switch to a seamless marquee technique. Instead of animating each card, we'll animate the entire container (`.stream-inner`). By duplicating the arrays (10 items → 20 items) and translating the container exactly `-50%`, we get a mathematically perfect, infinite loop with flawless flexbox spacing (`gap: 16px`). There will never be an empty gap on the page.

2. **Height Restriction (Red Boxes)**
   - **Current Issue**: The streams span the entire vertical height of the hero (`top: 0; bottom: 0`).
   - **Solution**: We will set a fixed `height: 400px` for the columns and vertically center them alongside the main text (`top: 50%; transform: translateY(-50%)`). This perfectly matches the top and bottom bounds of your red boxes. The 20% fade mask will be applied within these new, tighter bounds.

3. **Animation Speed**
   - **Current Issue**: Moving too fast.
   - **Solution**: Increase the animation duration from `22s` to `40s` for a much smoother, slower, ASMR-like background crawl.

### Changes to `src/components/HeroNotificationStream.tsx`
- Remove the independent card-level animations and delays.
- Apply `@keyframes` to `.stream-inner`.
- Add `padding-bottom` matching the `gap` to ensure the `-50%` height calculation perfectly loops the arrays.
- Adjust `.hero-stream-col` to center vertically and restrict height to `400px`.
- Use a dynamic placement trick (`max(2%, calc(50% - 620px))`) to keep the columns framed nicely around the text, even on ultra-wide monitors.
