/**
 * Browser pixel intentionally paused in the shared marketing/account SPA.
 * The old SDK observed page URLs across client-side navigation. Suppressing
 * our PageView calls or removing its script cannot guarantee it stops reading
 * private receipt/auth URLs after a public page visit.
 *
 * Safe first-party public marketing and labeled demo events remain in track().
 * Re-enable only with a reviewed provider integration/marketing-document
 * boundary and fresh-page transition tests. No consent mechanism is implied.
 * This does not unload code already present in an old open browser document.
 */
const MetaPixel = () => null;
export default MetaPixel;
