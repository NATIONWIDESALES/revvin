

# Redesign Phone Device Frames

## What Changes

### 1. PhoneNotification.tsx — Replace device shell (lines 155-181)

Replace the current white rounded-rect frame with a realistic iPhone shell:

- **Outer casing**: Dark charcoal (`bg-[#1a1a1a]`) with `rounded-[3rem]`, thick enough to show as a visible bezel (~`p-[3px]`)
- **Side buttons**: Absolute-positioned thin rectangles on the left (volume up, volume down, silent switch) and right (power button) edges using dark gray with subtle highlights
- **Screen area**: White `bg-white` inner rounded rect (`rounded-[2.7rem]`) containing all content
- **Dynamic Island**: Black pill (`bg-black`, `h-[22px] w-[90px] rounded-full`) centered at top of screen, replacing the gray placeholder
- **Status bar**: Time left, signal/wifi/battery right — rendered in black text on white, positioned below the Dynamic Island
- **Specular highlight**: A pseudo-element or absolute-positioned div along the left edge — thin vertical gradient from `white/15` to `transparent` — creates a gloss/3D effect
- **Drop shadow**: `shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]` for a soft, defined lift off the page

### 2. Parent layouts — Overlap & tilt

Update the grid containers in **Index.tsx** (line 144), **HowItWorks.tsx** (line 91), **ForReferrers.tsx** (line ~72), and **ForBusinesses.tsx** (line ~86) where two phones appear side-by-side:

- Replace `grid gap-12 md:grid-cols-2` with a `flex justify-center items-center` layout
- Left phone: `rotate-[-3deg]` with positive `z-10` and slight right margin (`-mr-6`) to create overlap
- Right phone: `rotate-[3deg]` with `z-0`
- Labels move below the shared container or remain under each phone with adjusted spacing

### 3. Notification content — Untouched

`BusinessNotification` and `ReferrerNotification` components remain exactly as-is.

## Files Modified

| File | Change |
|------|--------|
| `src/components/PhoneNotification.tsx` | New device shell with Dynamic Island, side buttons, gloss, shadow |
| `src/pages/Index.tsx` | Overlap/tilt layout for phone pair |
| `src/pages/HowItWorks.tsx` | Same overlap/tilt layout |
| `src/pages/ForReferrers.tsx` | Same overlap/tilt layout |
| `src/pages/ForBusinesses.tsx` | Single phone — just benefits from new frame, no tilt needed |

