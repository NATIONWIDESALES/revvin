

# Update Logo Everywhere with New Wordmark

The new image is a green "Revvin" wordmark — it contains the brand name as part of the logo itself, so the separate text label ("Revvin") should be removed wherever it appears next to the logo.

## Changes

### 1. Copy new logo to project
Copy `user-uploads://ChatGPT_Image_Feb_25_2026_05_55_17_PM.png` to `src/assets/revvin-logo.png` (overwrite existing).

### 2. `src/components/Navbar.tsx`
- Remove the `<span>Revvin</span>` text next to the logo
- Size the wordmark to `h-10` (40px tall) which fits the 64px navbar height well — a wordmark needs less height than an icon logo since it's wide
- Keep `object-contain` for aspect ratio

### 3. `src/components/Footer.tsx`
- Remove the `<span>Revvin</span>` text next to the logo
- Size the wordmark to `h-7` (28px tall) — appropriate for footer context

### 4. `public/favicon.png`
- Copy the same image as favicon (browsers will resize it). Since the wordmark is wide text, it may not look great at 16x16. This is the best we can do with the provided asset — a separate square icon would be ideal for favicon but is not available.

| File | Change |
|------|--------|
| `src/assets/revvin-logo.png` | Replace with new wordmark image |
| `src/components/Navbar.tsx` | Remove "Revvin" text span, resize logo to `h-10` |
| `src/components/Footer.tsx` | Remove "Revvin" text span, resize logo to `h-7` |
| `public/favicon.png` | Replace with new wordmark |

