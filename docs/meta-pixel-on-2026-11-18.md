# Meta pixel turned on (2026-11-18)

- src/config/brand.ts: META_PIXEL_ID = "1491133636221099".
- src/lib/metaPermission.ts: removed /earn (referrer page) from pixel-safe paths; added conversionSafePath/pixelAllowedHere so /signup, /welcome, /dashboard, /auth allow only bare, utm_* or offer queries.
- src/components/MetaPixel.tsx: frame is removed on SPA navigation to any non-allowed route.
- public/ad-events.html: autoConfig disabled before init (no automatic form scanning or advanced matching).
- src/content/legal.ts: Meta no longer described as paused; advertising measurement paragraph added; last updated November 18, 2026.
- src/test/meta-pixel.test.tsx (new), src/test/acquisition-rules.test.ts (ID expectation).
