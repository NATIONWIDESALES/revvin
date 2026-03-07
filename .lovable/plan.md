

## Plan: Update Favicons

Copy all uploaded favicon files to `public/` and update `index.html` with the provided link tags.

### Changes

**1. Copy files to `public/`:**
- `favicon.ico`
- `favicon-32x32.png`
- `favicon-16x16.png`
- `apple-touch-icon.png`
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`

**2. Update `index.html`:**
Replace the current `<link rel="icon" ...>` line with:
```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

