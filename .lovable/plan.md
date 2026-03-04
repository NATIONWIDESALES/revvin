

## Plan: QR Code Feature for Offer Sharing

### New files to create

**1. `src/components/OfferQRCode.tsx`** — The main QR code card component.

Props: `offerId`, `businessName`, `offerTitle`, `payoutAmount`, `payoutCurrency`

- Builds the offer URL using `toSlug(businessName)` + the existing `/offer/:businessSlug/:id` pattern
- Creates a `QRCodeStyling` instance (from `qr-code-styling`) with the specified styling (rounded dots in `#0F172A`, green corners `#15803D`, white bg, error correction H, 280x280)
- Uses a `useRef` div container and `useEffect` to append/update the QR code, cleaning up on unmount
- Renders a card with:
  - "Share this with your customers, partners, and network" header text
  - Centered QR code
  - "Scan to view this offer and start referring" caption
  - URL display with Copy button (2s "Copied!" feedback)
  - Download PNG (re-renders at 1024x1024), Download SVG, and Print buttons
  - Print opens a new window with minimal HTML containing only the QR, business name, tagline, and URL
- Styled to match existing design system (white bg, border, rounded-xl, shadow-sm, consistent button styles)

### Existing files to modify (minimal additions only)

**2. `src/pages/dashboard/BusinessDashboard.tsx`**
- Import `OfferQRCode`
- Inside the offers grid, for each offer card: after the existing action buttons, add the `OfferQRCode` component if `offer.status === "active"`. If not active, show a small muted message: "Publish your offer to get your shareable QR code."
- Implementation: Add a collapsible/expandable section within each offer card (a "QR Code" toggle button) to avoid cluttering the card by default. Click reveals the full QR card inline below the offer actions.

**3. `src/components/ShareOfferLink.tsx`**
- Add a small QR icon button next to the existing share button that opens a popover/dialog showing a mini version of the QR code with download options. Uses the same `QRCodeStyling` setup.
- This is the public offer page's share component — referrers can also access the QR.

### Dependencies
- Install `qr-code-styling` npm package

### What stays untouched
- No routing, auth, Stripe, database, or page layout changes
- No modifications to existing component logic — only additive imports and JSX insertions

