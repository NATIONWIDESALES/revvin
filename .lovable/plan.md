

# Complete Redesign: "See it in action" Phone Mockups

## Overview

Replace the current `PhoneNotification.tsx` component entirely with a new implementation featuring precise iPhone 14 Pro specifications and full native-feeling app screens.

## New Component: `src/components/PhoneMockup.tsx`

Create a brand new component from scratch with these specifications:

### Phone Frame (both phones)
- **Dimensions**: 320px × 693px (exact 9:19.5 ratio)
- **Outer shell**: `#1A1A1A`, border-radius `52px`
- **Bezel thickness**: 10px (screen inset from shell)
- **Chamfer highlight**: 1px `rgba(255,255,255,0.15)` on top-left edge
- **Dynamic Island**: 126px × 34px, `#000000`, radius 20px, 12px from top of screen
- **Side buttons**: Left side has 2 volume buttons, right side has power button, color `#2A2A2A`
- **Drop shadow**: `0 32px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10)`
- **Home indicator**: 134px × 5px, `#000000` at 20% opacity, 8px from bottom

### Left Phone Screen (Business)
Full app UI including:
- Status bar with "9:41", signal/wifi/battery icons
- App header: Revvin logo + name + notification bell with red "3" badge
- Green banner: pulsing dot + "3 new leads today"
- Section: "Incoming Leads" heading with subtitle
- 3 lead cards with category icons, referrer info, payout amounts, action buttons
- Cards have proper badges (NEW, PENDING), shadows, structure

### Right Phone Screen (Referrer)
Full app UI including:
- Status bar + app header with avatar "JK"
- Hero block: "Total Earned" label + "$2,340" large text + green "+$500 this week" chip
- Two action buttons: "Withdraw" (solid green) + "Share Link" (outlined)
- "Recent Payouts" section with 3 transaction rows
- Green card: "6 referrals closed this month" with progress bar

### Typography
Font stack: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`

## Update `Index.tsx` (lines 123-155)

Replace the "Phone Mockups" section:
- Background: `#F5F6F7`
- Center layout with 48px gap, overlapping by 24px in center
- Left phone: `-4deg` rotation, higher z-index
- Right phone: `+4deg` rotation
- Labels below each: "BUSINESS RECEIVES A LEAD" / "REFERRER GETS PAID" in muted caps

## Files Changed

| File | Action |
|------|--------|
| `src/components/PhoneMockup.tsx` | Create new component |
| `src/pages/Index.tsx` | Replace section with new component |
| `src/components/PhoneNotification.tsx` | Can be kept for other pages or removed later |

